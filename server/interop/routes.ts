import type { Express, Request, Response } from "express";
import { sdk } from "../_core/sdk";
import * as db from "../db";
import { extractBearerToken, hashIntegrationApiKey } from "./apiKeys";
import {
  fhirBundle,
  normalizeFhirImagingStudy,
  toFhirDiagnosticReport,
  toFhirImagingStudy,
} from "./fhir";
import { buildHl7Ack, buildOruReport, normalizeOrmOrder, parseHl7Message } from "./hl7";

type ApiKeyContext = NonNullable<Awaited<ReturnType<typeof db.getActiveIntegrationApiKey>>>;

function sendFhir(res: Response, status: number, payload: unknown): void {
  res.status(status).type("application/fhir+json").json(payload);
}

function fhirError(message: string, code = "invalid"): object {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity: "error", code, diagnostics: message }],
  };
}

async function authenticateIntegration(req: Request, res: Response, fhir = false): Promise<ApiKeyContext | null> {
  const token = extractBearerToken(req.header("authorization"));
  if (!token) {
    if (fhir) sendFhir(res, 401, fhirError("A PACS integration Bearer API key is required", "security"));
    else res.status(401).type("text/plain").send("Integration API key is required");
    return null;
  }

  const apiKey = await db.getActiveIntegrationApiKey(hashIntegrationApiKey(token));
  if (!apiKey) {
    if (fhir) sendFhir(res, 401, fhirError("The integration API key is invalid or revoked", "security"));
    else res.status(401).type("text/plain").send("Integration API key is invalid or revoked");
    return null;
  }

  await db.touchIntegrationApiKey(apiKey.id);
  return apiKey;
}

async function getStudyReport(studyId: number) {
  const studyRecord = await db.getStudyById(studyId);
  if (!studyRecord) return undefined;
  const report = await db.getLatestReportByStudyId(studyId);
  if (!report) return { ...studyRecord, report: undefined };
  return { ...studyRecord, report };
}

async function deliverFhirReport(apiKey: ApiKeyContext, studyId: number) {
  if (!apiKey.fhirReportDeliveryUrl) throw new Error("No FHIR report delivery URL is configured for this API key");
  const record = await getStudyReport(studyId);
  if (!record?.report) throw new Error("No radiology report is available for this study");
  if (record.report.status === "draft") throw new Error("Only final or amended reports can be delivered to an EHR");

  const response = await fetch(apiKey.fhirReportDeliveryUrl, {
    method: "POST",
    headers: { "content-type": "application/fhir+json", accept: "application/fhir+json, application/json" },
    body: JSON.stringify(toFhirDiagnosticReport({ report: record.report, study: record.study, patient: record.patient })),
  });
  if (!response.ok) throw new Error(`EHR FHIR delivery returned HTTP ${response.status}`);
  return response.status;
}

async function deliverHl7Report(apiKey: ApiKeyContext, studyId: number) {
  if (!apiKey.hl7ReportDeliveryUrl) throw new Error("No HL7 report delivery URL is configured for this API key");
  const record = await getStudyReport(studyId);
  if (!record?.report) throw new Error("No radiology report is available for this study");
  if (record.report.status === "draft") throw new Error("Only final or amended reports can be delivered to an EHR");

  const message = buildOruReport({ study: record.study, patient: record.patient, report: record.report });
  const response = await fetch(apiKey.hl7ReportDeliveryUrl, {
    method: "POST",
    headers: { "content-type": "application/hl7-v2", accept: "text/plain" },
    body: message,
  });
  if (!response.ok) throw new Error(`EHR HL7 delivery returned HTTP ${response.status}`);
  return { status: response.status, message };
}

async function requirePortalUser(req: Request, res: Response) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Sign-in is required" });
    return null;
  }
}

export function registerInteroperabilityRoutes(app: Express): void {
  app.post("/api/fhir/ImagingStudy", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res, true);
    if (!apiKey) return;

    try {
      const normalized = normalizeFhirImagingStudy(req.body, `2.25.${Date.now()}`);
      if (Number.isNaN(normalized.studyDate.valueOf())) throw new Error("ImagingStudy.started must be a valid date/time");
      const created = await db.upsertInteroperabilityOrder({ ...normalized, createdBy: apiKey.createdBy });
      const resource = toFhirImagingStudy(created);
      res.setHeader("Location", `/api/fhir/ImagingStudy/${created.study.id}`);
      sendFhir(res, created.created ? 201 : 200, resource);
    } catch (error) {
      sendFhir(res, 422, fhirError(error instanceof Error ? error.message : "Unable to process ImagingStudy"));
    }
  });

  app.get("/api/fhir/ImagingStudy/:studyId", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res, true);
    if (!apiKey) return;
    const studyId = Number(req.params.studyId);
    if (!Number.isInteger(studyId)) return sendFhir(res, 400, fhirError("A numeric ImagingStudy id is required"));
    const record = await db.getStudyById(studyId);
    if (!record) return sendFhir(res, 404, fhirError("ImagingStudy was not found", "not-found"));
    sendFhir(res, 200, toFhirImagingStudy(record));
  });

  app.get("/api/fhir/DiagnosticReport", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res, true);
    if (!apiKey) return;
    const studyId = Number(req.query["imaging-study"]);
    if (!Number.isInteger(studyId)) return sendFhir(res, 400, fhirError("The imaging-study query parameter must be a numeric PACS study id"));
    const record = await getStudyReport(studyId);
    const resources = record?.report ? [toFhirDiagnosticReport({ report: record.report, study: record.study, patient: record.patient })] : [];
    sendFhir(res, 200, fhirBundle("DiagnosticReport", resources));
  });

  app.post("/api/fhir/ImagingStudy/:studyId/report/$send", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res, true);
    if (!apiKey) return;
    const studyId = Number(req.params.studyId);
    if (!Number.isInteger(studyId)) return sendFhir(res, 400, fhirError("A numeric ImagingStudy id is required"));
    try {
      const deliveryStatus = await deliverFhirReport(apiKey, studyId);
      sendFhir(res, 200, { resourceType: "OperationOutcome", issue: [{ severity: "information", code: "informational", diagnostics: `FHIR report delivered (HTTP ${deliveryStatus})` }] });
    } catch (error) {
      sendFhir(res, 409, fhirError(error instanceof Error ? error.message : "FHIR report delivery failed", "processing"));
    }
  });

  app.post("/api/hl7/orm", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res);
    if (!apiKey) return;

    let parsed;
    try {
      const message = typeof req.body === "string" ? req.body : req.body?.message;
      if (typeof message !== "string") throw new Error("An HL7 v2 ER7 message body is required");
      parsed = parseHl7Message(message);
      const normalized = normalizeOrmOrder(parsed);
      await db.upsertInteroperabilityOrder({ ...normalized, createdBy: apiKey.createdBy });
      res.status(200).type("application/hl7-v2").send(buildHl7Ack(parsed, "AA", "Order accepted"));
    } catch (error) {
      if (parsed) {
        res.status(422).type("application/hl7-v2").send(buildHl7Ack(parsed, "AE", error instanceof Error ? error.message : "Order rejected"));
      } else {
        res.status(400).type("text/plain").send(error instanceof Error ? error.message : "Unable to parse HL7 message");
      }
    }
  });

  app.get("/api/hl7/orm/:studyId/report", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res);
    if (!apiKey) return;
    const studyId = Number(req.params.studyId);
    if (!Number.isInteger(studyId)) return res.status(400).type("text/plain").send("A numeric study id is required");
    const record = await getStudyReport(studyId);
    if (!record?.report) return res.status(404).type("text/plain").send("Radiology report was not found");
    res.type("application/hl7-v2").send(buildOruReport({ study: record.study, patient: record.patient, report: record.report }));
  });

  app.post("/api/hl7/orm/:studyId/report", async (req, res) => {
    const apiKey = await authenticateIntegration(req, res);
    if (!apiKey) return;
    const studyId = Number(req.params.studyId);
    if (!Number.isInteger(studyId)) return res.status(400).type("text/plain").send("A numeric study id is required");
    try {
      const result = await deliverHl7Report(apiKey, studyId);
      res.status(200).type("application/hl7-v2").send(result.message);
    } catch (error) {
      res.status(409).type("text/plain").send(error instanceof Error ? error.message : "HL7 report delivery failed");
    }
  });

  app.get("/api/reports/:studyId", async (req, res) => {
    const user = await requirePortalUser(req, res);
    if (!user) return;
    const studyId = Number(req.params.studyId);
    if (!Number.isInteger(studyId)) return res.status(400).json({ error: "A numeric study id is required" });
    const report = await db.getLatestReportByStudyId(studyId);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({
      findings: report.findings,
      impression: report.impression,
      recommendations: report.recommendations ?? "",
      status: report.status,
      updatedAt: report.updatedAt.toISOString(),
    });
  });

  app.post("/api/reports/:studyId", async (req, res) => {
    const user = await requirePortalUser(req, res);
    if (!user) return;
    const studyId = Number(req.params.studyId);
    const { findings, impression, recommendations, status } = req.body ?? {};
    if (!Number.isInteger(studyId) || typeof findings !== "string" || typeof impression !== "string" || !["draft", "final"].includes(status)) {
      return res.status(400).json({ error: "A study id, findings, impression, and report status are required" });
    }
    const report = await db.saveStudyReport({
      studyId,
      reportedBy: user.id,
      findings,
      impression,
      recommendations: typeof recommendations === "string" ? recommendations : "",
      status,
    });
    res.json({ success: true, reportId: report?.id });
  });
}
