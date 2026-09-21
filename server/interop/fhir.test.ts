import { describe, expect, it } from "vitest";
import { normalizeFhirImagingStudy, toFhirDiagnosticReport, toFhirImagingStudy } from "./fhir";

describe("FHIR R4 ImagingStudy support", () => {
  it("normalizes an ImagingStudy order with DICOM and accession identifiers", () => {
    const order = normalizeFhirImagingStudy({
      resourceType: "ImagingStudy",
      id: "order-900",
      identifier: [
        { system: "urn:dicom:uid", value: "urn:oid:1.2.840.113619.2.55.3.604688.1" },
        { system: "urn:dicom:accession", value: "ACC-900" },
      ],
      status: "registered",
      modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: "MR" }],
      subject: { reference: "Patient/PAT-1001", display: "Ada Lovelace" },
      started: "2026-09-21T05:00:00Z",
      description: "MR Brain without contrast",
      bodySite: { text: "Brain" },
      referrer: { display: "Dr. Turing" },
    }, "2.25.100");

    expect(order).toMatchObject({
      patientId: "PAT-1001",
      patientName: "Ada Lovelace",
      studyUid: "1.2.840.113619.2.55.3.604688.1",
      modality: "MR",
      description: "MR Brain without contrast",
      accessionNumber: "ACC-900",
      externalOrderId: "order-900",
    });
  });

  it("creates FHIR resources for PACS studies and their finalized reports", () => {
    const imagingStudy = toFhirImagingStudy({
      study: { id: 5, studyId: "1.2.3", studyDate: new Date("2026-09-21T05:00:00Z"), modality: "CT", description: "Chest CT", bodyPart: "Chest", referringPhysician: "Dr. Turing", accessionNumber: "ACC-5", externalOrderId: "ORDER-5", status: "reported", numberOfSeries: 2, numberOfInstances: 120 },
      patient: { patientId: "PAT-1001", name: "Ada Lovelace" },
    });
    const report = toFhirDiagnosticReport({
      report: { id: 2, findings: "No acute finding", impression: "Normal examination", recommendations: "Routine follow-up", status: "final", createdAt: new Date("2026-09-21T05:00:00Z"), updatedAt: new Date("2026-09-21T06:00:00Z") },
      study: { id: 5, modality: "CT", description: "Chest CT", studyDate: new Date("2026-09-21T05:00:00Z") },
      patient: { patientId: "PAT-1001", name: "Ada Lovelace" },
    });

    expect(imagingStudy).toMatchObject({ resourceType: "ImagingStudy", id: "5", status: "available", subject: { reference: "Patient/PAT-1001" } });
    expect(report).toMatchObject({ resourceType: "DiagnosticReport", id: "2", status: "final", imagingStudy: [{ reference: "ImagingStudy/5" }], conclusion: "Normal examination" });
    expect(Buffer.from(report.presentedForm[0].data, "base64").toString("utf8")).toContain("FINDINGS\nNo acute finding");
  });
});
