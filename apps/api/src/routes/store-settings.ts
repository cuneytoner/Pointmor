import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  ensureStoreSettingsRow,
  validateStoreSettingsPut,
} from "../lib/store-settings-service.js";
import { prisma } from "../lib/prisma.js";

function requireTenantSession(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const tenantId = s?.tenant?.id;
  if (!tenantId) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}

export async function registerStoreSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/store-settings", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    try {
      return await ensureStoreSettingsRow(tenantId);
    } catch (e) {
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 404) return reply.code(404).send({ error: "not_found" });
      throw e;
    }
  });

  app.put("/tenant/store-settings", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    let parsed;
    try {
      parsed = validateStoreSettingsPut(req.body);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "default_language_not_supported") {
        return reply.code(400).send({ error: "default_language_not_supported" });
      }
      return reply.code(400).send({ error: "validation_error" });
    }
    await ensureStoreSettingsRow(tenantId);
    const data: Prisma.StoreSettingsUpdateInput = {
      storeName: parsed.storeName,
      logoUrl: parsed.logoUrl,
      primaryColor: parsed.primaryColor,
      defaultLanguage: parsed.defaultLanguage,
      supportedLanguages: parsed.supportedLanguages,
      currency: parsed.currency,
      timezone: parsed.timezone,
      contactPhone: parsed.contactPhone,
      contactEmail: parsed.contactEmail,
      loyaltyPublicEnabled: parsed.loyaltyPublicEnabled,
      menuPublicEnabled: parsed.menuPublicEnabled,
    };
    if (parsed.address !== undefined) {
      data.address = parsed.address;
    }
    return prisma.storeSettings.update({
      where: { tenantId },
      data,
    });
  });
}
