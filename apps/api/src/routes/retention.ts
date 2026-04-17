import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { getEffectiveRetentionConfig, getPublicRetentionPolicySummary } from "../lib/retention-config.js";
import { parseTenantRetentionPut } from "../lib/tenant-retention-input.js";
import { resolveTenantRetention, updateTenantRetentionSettings } from "../lib/tenant-retention-service.js";

function requireTenantId(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const id = s?.tenant?.id;
  if (!id) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return id;
}

function requireActorUserId(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const id = s?.user?.id;
  if (!id) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return id;
}

/** Kiracı yöneticilerine salt okunur saklama özeti (UI isteğe bağlı). */
export async function registerTenantRetentionRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/tenant/retention-policy",
    { preHandler: [authPreHandler, requireTenantPermission("settings.view")] },
    async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      void tenantId;
      const cfg = getEffectiveRetentionConfig();
      return reply.send({
        items: getPublicRetentionPolicySummary(),
        batchSize: cfg.batchSize,
        maxBatchesPerTable: cfg.maxBatchesPerTable,
      });
    },
  );

  app.get(
    "/tenant/retention-settings",
    { preHandler: [authPreHandler, requireTenantPermission("settings.view")] },
    async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const resolved = await resolveTenantRetention(tenantId);
      return reply.send(resolved);
    },
  );

  app.put(
    "/tenant/retention-settings",
    { preHandler: [authPreHandler, requireTenantPermission("settings.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const actorUserId = requireActorUserId(req, reply);
      if (!actorUserId) return;

      const parsed = parseTenantRetentionPut(req.body);
      if ("error" in parsed) {
        return reply.code(400).send({ error: parsed.error });
      }

      const result = await updateTenantRetentionSettings({
        tenantId,
        actorUserId,
        input: parsed,
      });

      if ("error" in result) {
        if (result.error === "retention_read_only_plan") {
          return reply.code(403).send({ error: result.error });
        }
        return reply.code(400).send({
          error: result.error,
          field: result.field ?? null,
        });
      }

      return reply.send(result);
    },
  );
}
