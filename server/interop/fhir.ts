type FhirIdentifier = { system?: string; value?: string; type?: { text?: string } };
type FhirReference = { reference?: string; display?: string; identifier?: FhirIdentifier };

type FhirImagingStudyInput = {
  resourceType?: string;
  id?: string;
  identifier?: FhirIdentifier[];
  status?: string;
  modality?: { system?: string; code?: string; display?: string }[];
  series?: { uid?: string; modality?: { system?: string; code?: string; display?: string } }[];
  subject?: FhirReference;
  started?: string;
  description?: string;
  bodySite?: { text?: string; coding?: { code?: string; display?: string }[] };
  referrer?: FhirReference;
  basedOn?: FhirReference[];
  numberOfSeries?: number;
  numberOfInstances?: number;
};

export type NormalizedImagingOrder = {
  patientId: string;
  patientName: string;
  studyUid: string;
  studyDate: Date;
  modality: string;
  description?: string;
  bodyPart?: string;
  referringPhysician?: string;
  accessionNumber?: string;
  externalOrderId: string;
  priority: "routine" | "urgent" | "stat";
};

const DICOM_UID_SYSTEM = "urn:dicom:uid";
const ACCESSION_SYSTEMS = ["http://terminology.hl7.org/CodeSystem/v2-0203", "urn:dicom:accession"];

function stripOidPrefix(value: string): string {
  return value.replace(/^urn:oid:/, "");
}

function getIdentifierValue(identifiers: FhirIdentifier[] | undefined, predicate: (identifier: FhirIdentifier) => boolean): string | undefined {
  return identifiers?.find(predicate)?.value;
}

function patientReferenceId(subject: FhirReference | undefined): string | undefined {
  if (subject?.identifier?.value) return subject.identifier.value;
  const reference = subject?.reference;
  return reference?.startsWith("Patient/") ? reference.slice("Patient/".length) : reference;
}

export function normalizeFhirImagingStudy(input: unknown, fallbackStudyUid: string): NormalizedImagingOrder {
  const resource = input as FhirImagingStudyInput;
  if (resource?.resourceType !== "ImagingStudy") {
    throw new Error("The request body must be a FHIR R4 ImagingStudy resource");
  }

  const patientId = patientReferenceId(resource.subject);
  if (!patientId) throw new Error("ImagingStudy.subject reference or identifier is required");

  const studyUid = stripOidPrefix(
    getIdentifierValue(resource.identifier, (identifier) => identifier.system === DICOM_UID_SYSTEM)
      ?? resource.series?.find((series) => series.uid)?.uid
      ?? fallbackStudyUid,
  );
  const modality = resource.modality?.[0]?.code ?? resource.series?.[0]?.modality?.code;
  if (!modality) throw new Error("ImagingStudy.modality or series.modality is required");

  const accessionNumber = getIdentifierValue(
    resource.identifier,
    (identifier) => ACCESSION_SYSTEMS.includes(identifier.system ?? "") || identifier.type?.text?.toLowerCase() === "accession number",
  );
  const basedOn = resource.basedOn?.[0]?.reference;
  const externalOrderId = resource.id ?? basedOn ?? accessionNumber ?? studyUid;

  return {
    patientId,
    patientName: resource.subject?.display || `Patient ${patientId}`,
    studyUid,
    studyDate: resource.started ? new Date(resource.started) : new Date(),
    modality: modality.toUpperCase(),
    description: resource.description,
    bodyPart: resource.bodySite?.text ?? resource.bodySite?.coding?.[0]?.display ?? resource.bodySite?.coding?.[0]?.code,
    referringPhysician: resource.referrer?.display,
    accessionNumber,
    externalOrderId,
    priority: "routine",
  };
}

function studyStatus(status: string): "registered" | "available" | "cancelled" | "entered-in-error" | "unknown" {
  if (status === "reported" || status === "completed" || status === "in_progress") return "available";
  if (status === "pending") return "registered";
  return "unknown";
}

export function toFhirImagingStudy(record: {
  study: {
    id: number;
    studyId: string;
    studyDate: Date;
    modality: string;
    description: string | null;
    bodyPart: string | null;
    referringPhysician: string | null;
    accessionNumber: string | null;
    externalOrderId: string | null;
    status: string;
    numberOfSeries: number | null;
    numberOfInstances: number | null;
  };
  patient: { patientId: string; name: string } | null;
}) {
  const identifiers = [
    { system: DICOM_UID_SYSTEM, value: `urn:oid:${record.study.studyId}` },
    ...(record.study.accessionNumber ? [{ system: "urn:dicom:accession", value: record.study.accessionNumber }] : []),
    ...(record.study.externalOrderId ? [{ system: "urn:pacs:external-order", value: record.study.externalOrderId }] : []),
  ];

  return {
    resourceType: "ImagingStudy",
    id: String(record.study.id),
    identifier: identifiers,
    status: studyStatus(record.study.status),
    modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: record.study.modality }],
    subject: {
      reference: `Patient/${record.patient?.patientId ?? "unknown"}`,
      display: record.patient?.name ?? "Unknown patient",
    },
    started: record.study.studyDate.toISOString(),
    description: record.study.description ?? undefined,
    ...(record.study.bodyPart ? { bodySite: { text: record.study.bodyPart } } : {}),
    ...(record.study.referringPhysician ? { referrer: { display: record.study.referringPhysician } } : {}),
    numberOfSeries: record.study.numberOfSeries ?? 0,
    numberOfInstances: record.study.numberOfInstances ?? 0,
  };
}

export function toFhirDiagnosticReport(record: {
  report: {
    id: number;
    findings: string;
    impression: string;
    recommendations: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  study: { id: number; modality: string; description: string | null; studyDate: Date };
  patient: { patientId: string; name: string } | null;
}) {
  const reportText = [
    "FINDINGS",
    record.report.findings,
    "",
    "IMPRESSION",
    record.report.impression,
    ...(record.report.recommendations ? ["", "RECOMMENDATIONS", record.report.recommendations] : []),
  ].join("\n");

  return {
    resourceType: "DiagnosticReport",
    id: String(record.report.id),
    status: record.report.status === "final" || record.report.status === "amended" ? record.report.status : "preliminary",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: "RAD", display: "Radiology" }] }],
    code: { text: record.study.description ?? `${record.study.modality} imaging report` },
    subject: {
      reference: `Patient/${record.patient?.patientId ?? "unknown"}`,
      display: record.patient?.name ?? "Unknown patient",
    },
    effectiveDateTime: record.study.studyDate.toISOString(),
    issued: record.report.updatedAt.toISOString(),
    imagingStudy: [{ reference: `ImagingStudy/${record.study.id}` }],
    conclusion: record.report.impression,
    presentedForm: [{
      contentType: "text/plain",
      data: Buffer.from(reportText, "utf8").toString("base64"),
      title: "Radiology report",
    }],
  };
}

export function fhirBundle(resourceType: string, resources: unknown[]) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: resources.length,
    entry: resources.map((resource) => ({ fullUrl: `${resourceType}/${(resource as { id?: string }).id ?? ""}`, resource })),
  };
}
