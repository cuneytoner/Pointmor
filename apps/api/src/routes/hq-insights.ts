import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";
import {
  dismissHqInsight,
  executeHqInsightOneClick,
  listHqInsightsForSession,
} from "../lib/hq-insight-service.js";

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

export async function registerHqInsightRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/tenant/hq-insights",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.HQ_DASHBOARD);
        assertFeature(ent, FEATURE.HQ_AI_INSIGHTS);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      reply.header("Cache-Control", "private, max-age=30");
      return listHqInsightsForSession(tenantId, s, 40);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/tenant/hq-insights/:id/dismiss",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.HQ_DASHBOARD);
        assertFeature(ent, FEATURE.HQ_AI_INSIGHTS);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const out = await dismissHqInsight(tenantId, s, req.params.id);
      if ("error" in out && out.error === "not_found") return reply.code(404).send(out);
      if ("error" in out && out.error === "forbidden") return reply.code(403).send(out);
      return out;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/tenant/hq-insights/:id/execute",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.HQ_DASHBOARD);
        assertFeature(ent, FEATURE.HQ_AI_INSIGHTS);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const out = await executeHqInsightOneClick({
        tenantId,
        session: s,
        insightId: req.params.id,
      });
      if ("error" in out) {
        if (out.error === "not_found") return reply.code(404).send(out);
        if (out.error === "forbidden") return reply.code(403).send(out);
        if (out.error === "permission_denied") return reply.code(403).send(out);
        if (out.error === "invalid_action" || out.error === "no_action") {
          return reply.code(400).send(out);
        }
        return reply.code(400).send(out);
      }
      return out;
    },
  );
}
