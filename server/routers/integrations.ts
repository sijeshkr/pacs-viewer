import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { createIntegrationApiKeyValue, getKeyPrefix, hashIntegrationApiKey } from "../interop/apiKeys";

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional();

export const integrationsRouter = router({
  listApiKeys: adminProcedure.query(async () => db.listIntegrationApiKeys()),

  createApiKey: adminProcedure.input(z.object({
    name: z.string().trim().min(3).max(128),
    fhirReportDeliveryUrl: optionalUrl,
    hl7ReportDeliveryUrl: optionalUrl,
  })).mutation(async ({ input, ctx }) => {
    const rawKey = createIntegrationApiKeyValue();
    const id = await db.createIntegrationApiKey({
      name: input.name,
      keyPrefix: getKeyPrefix(rawKey),
      keyHash: hashIntegrationApiKey(rawKey),
      fhirReportDeliveryUrl: input.fhirReportDeliveryUrl || null,
      hl7ReportDeliveryUrl: input.hl7ReportDeliveryUrl || null,
      createdBy: ctx.user.id,
    });

    return { id, apiKey: rawKey };
  }),

  revokeApiKey: adminProcedure.input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.revokeIntegrationApiKey(input.id);
      return { success: true };
    }),
});
