import { describe, expect, it } from "vitest";
import {
  createDeterministicDicomUid,
  createIntegrationApiKeyValue,
  extractBearerToken,
  hashIntegrationApiKey,
} from "./apiKeys";

describe("integration API keys", () => {
  it("creates high-entropy PACS keys and hashes them deterministically", () => {
    const first = createIntegrationApiKeyValue();
    const second = createIntegrationApiKeyValue();

    expect(first).toMatch(/^pacs_live_[A-Za-z0-9_-]{40,}$/);
    expect(second).not.toBe(first);
    expect(hashIntegrationApiKey(first)).toHaveLength(64);
    expect(hashIntegrationApiKey(first)).toBe(hashIntegrationApiKey(first));
  });

  it("accepts only PACS Bearer credentials", () => {
    expect(extractBearerToken("Bearer pacs_live_example")).toBe("pacs_live_example");
    expect(extractBearerToken("bearer pacs_live_example")).toBe("pacs_live_example");
    expect(extractBearerToken("Basic pacs_live_example")).toBeNull();
    expect(extractBearerToken("Bearer other-token")).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("creates stable DICOM UID values for retry-safe HL7 orders", () => {
    const first = createDeterministicDicomUid("EHR-ORDER-123");
    expect(first).toMatch(/^2\.25\.\d+$/);
    expect(createDeterministicDicomUid("EHR-ORDER-123")).toBe(first);
    expect(createDeterministicDicomUid("EHR-ORDER-124")).not.toBe(first);
  });
});
