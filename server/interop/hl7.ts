import { createDeterministicDicomUid } from "./apiKeys";

export type ParsedHl7Message = {
  fieldSeparator: string;
  segments: Record<string, string[][]>;
  messageType: string;
  controlId: string;
  sendingApplication: string;
  sendingFacility: string;
  processingId: string;
  version: string;
};

export type NormalizedHl7Order = {
  patientId: string;
  patientName: string;
  patientDateOfBirth?: string;
  patientGender?: "male" | "female" | "other";
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

function segmentField(segment: string[] | undefined, index: number): string {
  return segment?.[index] ?? "";
}

function component(value: string, index = 0): string {
  return value.split("^")[index] ?? "";
}

function hl7DateToDate(value: string): Date {
  if (!/^\d{8,14}$/.test(value)) return new Date();
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10) || "0");
  const minute = Number(value.slice(10, 12) || "0");
  const second = Number(value.slice(12, 14) || "0");
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function nowHl7Timestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function parseHl7Message(rawMessage: string): ParsedHl7Message {
  const normalized = rawMessage.replace(/\n/g, "\r").replace(/\r+/g, "\r").trim();
  const lines = normalized.split("\r").filter(Boolean);
  const mshLine = lines.find((line) => line.startsWith("MSH"));
  if (!mshLine || mshLine.length < 4) throw new Error("MSH segment is required");

  const fieldSeparator = mshLine[3];
  const segments: Record<string, string[][]> = {};
  for (const line of lines) {
    const fields = line.split(fieldSeparator);
    const name = fields[0];
    if (!name) continue;
    (segments[name] ??= []).push(fields);
  }

  const msh = segments.MSH?.[0];
  const messageType = segmentField(msh, 8);
  if (!messageType) throw new Error("MSH-9 message type is required");

  return {
    fieldSeparator,
    segments,
    messageType,
    controlId: segmentField(msh, 9),
    sendingApplication: segmentField(msh, 2),
    sendingFacility: segmentField(msh, 3),
    processingId: segmentField(msh, 10) || "P",
    version: segmentField(msh, 11) || "2.5",
  };
}

function mapGender(value: string): "male" | "female" | "other" | undefined {
  if (value === "M") return "male";
  if (value === "F") return "female";
  if (value) return "other";
  return undefined;
}

function inferModality(procedureCode: string): string {
  const text = procedureCode.toUpperCase();
  if (/\bMRI?\b/.test(text)) return "MR";
  if (/\bCT\b/.test(text)) return "CT";
  if (/\bUS\b|ULTRASOUND/.test(text)) return "US";
  if (/\bMG\b|MAMMO/.test(text)) return "MG";
  if (/\bPET\b|\bPT\b/.test(text)) return "PT";
  if (/\bNM\b|NUCLEAR/.test(text)) return "NM";
  if (/\bXR\b|\bDX\b|X-?RAY/.test(text)) return "XR";
  return "OT";
}

function priorityFrom(value: string): "routine" | "urgent" | "stat" {
  const normalized = value.toUpperCase();
  if (normalized.includes("STAT") || normalized === "S") return "stat";
  if (normalized.includes("URG") || normalized === "A") return "urgent";
  return "routine";
}

export function normalizeOrmOrder(message: ParsedHl7Message): NormalizedHl7Order {
  if (!message.messageType.startsWith("ORM")) {
    throw new Error(`Expected an ORM order message, received ${message.messageType}`);
  }

  const pid = message.segments.PID?.[0];
  const orc = message.segments.ORC?.[0];
  const obr = message.segments.OBR?.[0];
  if (!pid || !obr) throw new Error("PID and OBR segments are required for an ORM imaging order");

  const patientId = component(segmentField(pid, 3));
  if (!patientId) throw new Error("PID-3 patient identifier is required");
  const patientName = segmentField(pid, 5).replace(/\^/g, " ").trim() || `Patient ${patientId}`;
  const procedure = segmentField(obr, 4);
  const externalOrderId = component(segmentField(orc, 2)) || component(segmentField(obr, 2)) || message.controlId;
  if (!externalOrderId) throw new Error("ORC-2, OBR-2, or MSH-10 order identifier is required");

  const accessionNumber = component(segmentField(obr, 3)) || undefined;
  const orderTimestamp = segmentField(obr, 7) || segmentField(message.segments.MSH?.[0], 6);

  return {
    patientId,
    patientName,
    patientDateOfBirth: segmentField(pid, 7) || undefined,
    patientGender: mapGender(segmentField(pid, 8)),
    studyUid: createDeterministicDicomUid(externalOrderId),
    studyDate: hl7DateToDate(orderTimestamp),
    modality: inferModality(procedure),
    description: component(procedure, 1) || component(procedure),
    bodyPart: component(segmentField(obr, 15), 1) || undefined,
    referringPhysician: segmentField(obr, 16).replace(/\^/g, " ").trim() || undefined,
    accessionNumber,
    externalOrderId,
    priority: priorityFrom(segmentField(obr, 5)),
  };
}

export function escapeHl7(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\E\\")
    .replace(/\|/g, "\\F\\")
    .replace(/\^/g, "\\S\\")
    .replace(/~/g, "\\R\\")
    .replace(/&/g, "\\T\\")
    .replace(/\r?\n/g, "\\.br\\");
}

export function buildHl7Ack(message: ParsedHl7Message, acknowledgementCode: "AA" | "AE", text?: string): string {
  const controlId = `PACS-${Date.now()}`;
  const ackEvent = message.messageType.includes("^") ? `ACK^${message.messageType.split("^")[1]}` : "ACK";
  return [
    `MSH|^~\\&|PACS|PACS|${escapeHl7(message.sendingApplication)}|${escapeHl7(message.sendingFacility)}|${nowHl7Timestamp()}||${ackEvent}|${controlId}|${message.processingId}|${message.version}`,
    `MSA|${acknowledgementCode}|${escapeHl7(message.controlId)}${text ? `|${escapeHl7(text)}` : ""}`,
  ].join("\r");
}

export function buildOruReport(input: {
  study: { studyDate: Date; modality: string; description: string | null; accessionNumber: string | null; externalOrderId: string | null };
  patient: { patientId: string; name: string; dateOfBirth?: Date | null; gender?: string | null } | null;
  report: { findings: string; impression: string; recommendations: string | null; status: string; updatedAt: Date };
  receivingApplication?: string;
  receivingFacility?: string;
}): string {
  const patient = input.patient;
  const timestamp = nowHl7Timestamp(input.report.updatedAt);
  const dateOfBirth = patient?.dateOfBirth ? nowHl7Timestamp(patient.dateOfBirth).slice(0, 8) : "";
  const gender = patient?.gender === "male" ? "M" : patient?.gender === "female" ? "F" : "O";
  const observations = [
    `OBX|1|TX|FINDINGS||${escapeHl7(input.report.findings)}||||||F`,
    `OBX|2|TX|IMPRESSION||${escapeHl7(input.report.impression)}||||||F`,
    ...(input.report.recommendations ? [`OBX|3|TX|RECOMMENDATIONS||${escapeHl7(input.report.recommendations)}||||||F`] : []),
  ];

  return [
    `MSH|^~\\&|PACS|PACS|${escapeHl7(input.receivingApplication ?? "EHR")}|${escapeHl7(input.receivingFacility ?? "EHR")}|${timestamp}||ORU^R01|PACS-${Date.now()}|P|2.5`,
    `PID|1||${escapeHl7(patient?.patientId)}||${escapeHl7(patient?.name)}||${dateOfBirth}|${gender}`,
    `ORC|RE|${escapeHl7(input.study.externalOrderId)}|${escapeHl7(input.study.accessionNumber)}`,
    `OBR|1|${escapeHl7(input.study.externalOrderId)}|${escapeHl7(input.study.accessionNumber)}|${escapeHl7(input.study.modality)}^${escapeHl7(input.study.description)}|||${nowHl7Timestamp(input.study.studyDate)}|||||||||||||${input.report.status.toUpperCase()}`,
    ...observations,
  ].join("\r");
}
