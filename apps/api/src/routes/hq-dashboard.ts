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
import { getHqDashboardPayload, getHqLocationDetail } from "../lib/hq-dashboard-service.js";

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

export async function registerHqDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { days?: string } }>(
    "/tenant/hq-dashboard",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.HQ_DASHBOARD);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const d = req.query.days ? Number.parseInt(req.query.days, 10) : 28;
      const days = Number.isFinite(d) && d > 0 && d <= 90 ? d : 28;
      reply.header("Cache-Control", "private, max-age=45");
      return getHqDashboardPayload(tenantId, s, { days });
    },
  );

  app.get<{ Params: { branchId: string }; Querystring: { days?: string } }>(
    "/tenant/hq-dashboard/locations/:branchId",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.HQ_DASHBOARD);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const d = req.query.days ? Number.parseInt(req.query.days, 10) : 28;
      const days = Number.isFinite(d) && d > 0 && d <= 90 ? d : 28;
      try {
        reply.header("Cache-Control", "private, max-age=45");
        return await getHqLocationDetail(tenantId, s, req.params.branchId, { days });
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 403) return reply.code(403).send({ error: (e as Error).message });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );
}
