# PACS Interoperability API

This PACS portal exposes a **secured FHIR R4 and HL7 v2 interoperability boundary** for inbound imaging orders and outbound finalized radiology reports. It is intended for HTTPS-based EHR integration pilots and must be placed behind production-grade network controls, audit logging, and a HIPAA/PHI security review before clinical go-live.

## Security model

An administrator creates a revocable credential from **EHR Integrations** at `/integrations`. The raw value is displayed only once. Every EHR request must include it as a Bearer token:

```http
Authorization: Bearer pacs_live_<generated-value>
```

API keys are stored as SHA-256 hashes, can be revoked from the portal, and optionally have fixed FHIR and HL7 report-delivery URLs. Do not put an API key in a browser, URL query parameter, or source repository.

| Boundary | Authentication | Notes |
|---|---|---|
| FHIR R4 | Bearer API key | Supports `application/fhir+json` and JSON input. |
| HL7 v2 | Bearer API key | Supports ER7 pipe-and-carriage-return messages over HTTPS. |
| Portal report editor | Manus session cookie | Same-origin route; not an EHR endpoint. |

## FHIR R4

The FHIR implementation uses an `ImagingStudy` to represent the received imaging order/study, preserving its DICOM Study Instance UID and accession number. This matches the R4 resource’s identifier, status, subject, modality, and request relationship model.[^imagingstudy] Finalized reports are returned and delivered as `DiagnosticReport` resources, which reference the related ImagingStudy and use `conclusion` plus a text `presentedForm`.[^diagnosticreport]

### Receive an imaging order

```http
POST /api/fhir/ImagingStudy
Content-Type: application/fhir+json
Authorization: Bearer pacs_live_<generated-value>
```

```json
{
  "resourceType": "ImagingStudy",
  "id": "ehr-order-9001",
  "identifier": [
    { "system": "urn:dicom:uid", "value": "urn:oid:1.2.840.113619.2.55.3.604688.1" },
    { "system": "urn:dicom:accession", "value": "ACC-9001" }
  ],
  "status": "registered",
  "modality": [{ "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "CT" }],
  "subject": { "reference": "Patient/MRN-1001", "display": "Ada Lovelace" },
  "started": "2026-09-21T05:00:00Z",
  "description": "CT Chest with Contrast",
  "bodySite": { "text": "Chest" },
  "referrer": { "display": "Dr. Turing" }
}
```

The service responds with `201 Created` for a new order and `200 OK` for an idempotent retry. A successful response includes a local numeric FHIR ImagingStudy id and a `Location` header such as `/api/fhir/ImagingStudy/14`.

### Read a study and its report

```http
GET /api/fhir/ImagingStudy/{pacsStudyId}
GET /api/fhir/DiagnosticReport?imaging-study={pacsStudyId}
Authorization: Bearer pacs_live_<generated-value>
```

The DiagnosticReport query returns a FHIR `Bundle` with zero or one current report. Draft reports remain available to the portal but are **not** eligible for external delivery.

### Deliver a final FHIR report

Configure a FHIR report destination when creating the API key, then call:

```http
POST /api/fhir/ImagingStudy/{pacsStudyId}/report/$send
Authorization: Bearer pacs_live_<generated-value>
```

The PACS sends the generated `DiagnosticReport` to the configured destination over HTTPS. The endpoint rejects draft reports and keys without a configured destination.

## HL7 v2

The HL7 receiver accepts a single ER7 `ORM^O01` order message and returns an HL7 ACK message. The order is idempotent using `ORC-2`, falling back to `OBR-2` or `MSH-10`. Where an EHR does not provide a DICOM Study Instance UID, the PACS derives a deterministic `2.25.*` UID for the order.

### Receive an ORM order

```http
POST /api/hl7/orm
Content-Type: application/hl7-v2
Authorization: Bearer pacs_live_<generated-value>
```

```text
MSH|^~\&|EHR|GENERAL|PACS|RADIOLOGY|20260921050000||ORM^O01|MSG-001|P|2.5
PID|1||MRN-1001^^^GENERAL^MR||Lovelace^Ada||18151210|F
ORC|NW|ORDER-42||
OBR|1|ORDER-42|ACC-77|CTCHEST^CT Chest with Contrast|S||20260921050000
```

Successful requests receive an `AA` acknowledgement. Validation failures return `AE` where the message header could be read.

### Retrieve or deliver an ORU report

```http
GET /api/hl7/orm/{pacsStudyId}/report
POST /api/hl7/orm/{pacsStudyId}/report
Authorization: Bearer pacs_live_<generated-value>
```

`GET` returns a generated `ORU^R01` report for inspection or EHR polling. `POST` sends the same message to the **HL7 HTTP destination** configured on the API key. This initial implementation intentionally supports HL7 over HTTPS only; it does not operate an unauthenticated MLLP listener.

## Portal report editor

The upgraded clinical viewer persists its draft/final report through authenticated, same-origin endpoints:

```http
GET  /api/reports/{pacsStudyId}
POST /api/reports/{pacsStudyId}
```

When a report is finalized in the viewer, the PACS marks the study as `reported`; it can then be retrieved or sent by the FHIR and HL7 operations above.

## Production readiness

Before connecting a clinic EHR, complete the following controls:

1. Use a dedicated production domain with TLS, managed API-key rotation, rate limiting, audit logs, and monitored delivery failures.
2. Validate the exact EHR profile, required HL7 version, patient matching rules, terminology mappings, retry semantics, and callback authentication with the receiving organization.
3. Add organization/clinic scoping before sharing a database across clinics, and enforce study-level access checks on every report and image path.
4. Perform a HIPAA security and privacy assessment. This prototype does not claim certification or compliance.
5. Use DICOMweb STOW/QIDO/WADO-RS for real image exchange; the `ImagingStudy` resource describes metadata and report linkage, not DICOM object ingestion by itself.[^imagingstudy]

[^imagingstudy]: [HL7 FHIR R4 ImagingStudy](https://hl7.org/fhir/R4/imagingstudy.html)
[^diagnosticreport]: [HL7 FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html)
