import { describe, expect, it } from "vitest";
import { buildHl7Ack, buildOruReport, normalizeOrmOrder, parseHl7Message } from "./hl7";

const ORM_MESSAGE = [
  "MSH|^~\\&|EHR|GENERAL|PACS|RADIOLOGY|20260921050000||ORM^O01|MSG-001|P|2.5",
  "PID|1||PAT-1001^^^GENERAL^MR||Lovelace^Ada||18151210|F",
  "ORC|NW|ORDER-42||",
  "OBR|1|ORDER-42|ACC-77|CTCHEST^CT Chest with Contrast|S||20260921050000",
].join("\r");

describe("HL7 ORM and ORU support", () => {
  it("parses an ORM^O01 message into an idempotent imaging order", () => {
    const parsed = parseHl7Message(ORM_MESSAGE);
    const order = normalizeOrmOrder(parsed);

    expect(parsed.messageType).toBe("ORM^O01");
    expect(order).toMatchObject({
      patientId: "PAT-1001",
      patientName: "Lovelace Ada",
      studyUid: expect.stringMatching(/^2\.25\./),
      modality: "CT",
      description: "CT Chest with Contrast",
      accessionNumber: "ACC-77",
      externalOrderId: "ORDER-42",
      priority: "stat",
    });
  });

  it("returns HL7 acknowledgements with the original control identifier", () => {
    const parsed = parseHl7Message(ORM_MESSAGE);
    const acknowledgement = buildHl7Ack(parsed, "AA", "Order accepted");

    expect(acknowledgement).toContain("MSH|^~\\&|PACS|PACS|EHR|GENERAL|");
    expect(acknowledgement).toContain("MSA|AA|MSG-001|Order accepted");
  });

  it("builds escaped ORU^R01 report observations", () => {
    const message = buildOruReport({
      study: { studyDate: new Date("2026-09-21T05:00:00Z"), modality: "CT", description: "Chest CT", accessionNumber: "ACC-77", externalOrderId: "ORDER-42" },
      patient: { patientId: "PAT-1001", name: "Lovelace^Ada", dateOfBirth: new Date("1815-12-10T00:00:00Z"), gender: "female" },
      report: { findings: "No acute finding\nMild scar", impression: "No acute disease", recommendations: null, status: "final", updatedAt: new Date("2026-09-21T06:00:00Z") },
    });

    expect(message).toContain("||ORU^R01|");
    expect(message).toContain("PID|1||PAT-1001||Lovelace\\S\\Ada");
    expect(message).toContain("OBX|1|TX|FINDINGS||No acute finding\\.br\\Mild scar");
    expect(message).toContain("OBX|2|TX|IMPRESSION||No acute disease");
  });
});
