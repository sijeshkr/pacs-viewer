import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "pacs_live_";

export function createIntegrationApiKeyValue(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashIntegrationApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function getKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 18);
}

export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token?.startsWith(API_KEY_PREFIX)) return null;
  return token;
}

/** Produces a stable DICOM-compatible UID for an EHR order that has no study UID yet. */
export function createDeterministicDicomUid(externalOrderId: string): string {
  const hex = createHash("sha256").update(externalOrderId).digest("hex").slice(0, 30);
  return `2.25.${BigInt(`0x${hex}`).toString()}`;
}
