import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import {
  getBranchDayClosingSummary,
  getShiftClosingSummary,
  isManagerRole,
} from "../lib/closing-summary-service.js";
import { listAuditEventsForTenant } from "../lib/operational-audit-service.js";
import { listAnomalySignalsForTenant } from "../lib/operational-anomaly-service.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
} from "../lib/entitlement-service.js";

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

function requireManagerOrAdmin(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): SessionPayload | null {
  const s = req.authSession as SessionPayload | undefined;
  if (!s?.tenant?.id) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  if (!isManagerRole(s.membership?.role) && !s.user.platformAdmin) {
    reply.code(403).send({ error: "manager_role_required" });
    return null;
  }
  return s;
}

export async function registerManagerRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      limit?: string;
      cursor?: string;
      eventType?: string;
      shiftId?: string;
      branchId?: string;
    };
  }>("/manager/audit-events", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    if (!isManagerRole(s.membership?.role) && !s.user.platformAdmin) {
      return reply.code(403).send({ error: "manager_role_required" });
    }
    try {
      const ent = await getTenantEntitlementContext(tenantId);
      assertFeature(ent, FEATURE.MANAGER_CLOSING);
    } catch (e) {
      const er = e as Error & { code?: string; feature?: string; statusCode?: number };
      if (er.code === "plan_feature_disabled") {
        return reply.code(403).send({ error: er.code, feature: er.feature });
      }
      throw e;
    }
    const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 50;
    const take = Number.isFinite(lim) && lim > 0 && lim <= 200 ? lim : 50;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : undefined;
    if (req.query.cursor && Number.isNaN(cursor!.getTime())) {
      return reply.code(400).send({ error: "validation_error" });
    }
    return listAuditEventsForTenant(tenantId, {
      take,
      cursorCreatedAt: cursor,
      eventType: req.query.eventType,
      cashierShiftId: req.query.shiftId,
      branchId: req.query.branchId,
    });
  });

  app.get<{
    Querystring: {
      limit?: string;
      cursor?: string;
      shiftId?: string;
      branchId?: string;
    };
  }>("/manager/anomalies", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    if (!isManagerRole(s.membership?.role) && !s.user.platformAdmin) {
      return reply.code(403).send({ error: "manager_role_required" });
    }
    try {
      const ent = await getTenantEntitlementContext(tenantId);
      assertFeature(ent, FEATURE.MANAGER_CLOSING);
    } catch (e) {
      const er = e as Error & { code?: string; feature?: string; statusCode?: number };
      if (er.code === "plan_feature_disabled") {
        return reply.code(403).send({ error: er.code, feature: er.feature });
      }
      throw e;
    }
    const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 50;
    const take = Number.isFinite(lim) && lim > 0 && lim <= 200 ? lim : 50;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : undefined;
    if (req.query.cursor && Number.isNaN(cursor!.getTime())) {
      return reply.code(400).send({ error: "validation_error" });
    }
    return listAnomalySignalsForTenant(tenantId, {
      take,
      cursorCreatedAt: cursor,
      cashierShiftId: req.query.shiftId,
      branchId: req.query.branchId,
    });
  });

  app.get<{ Params: { shiftId: string } }>(
    "/manager/shifts/:shiftId/closing-summary",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.MANAGER_CLOSING);
        return await getShiftClosingSummary(
          tenantId,
          req.params.shiftId,
          s.user.id,
          s.membership?.role,
          { platformAdmin: s.user.platformAdmin },
        );
      } catch (e) {
        const er = e as Error & {
          statusCode?: number;
          code?: string;
          feature?: string;
        };
        if (er.code === "plan_feature_disabled") {
          return reply.code(403).send({ error: er.code, feature: er.feature });
        }
        const code = er.statusCode;
        if (code === 403) return reply.code(403).send({ error: "forbidden" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );

  app.get<{
    Params: { branchId: string };
    Querystring: { date?: string };
  }>(
    "/manager/branches/:branchId/closing-summary",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = requireManagerOrAdmin(req, reply);
      if (!s) return;
      const tenantId = s.tenant!.id;
      const date =
        typeof req.query.date === "string" && req.query.date.trim()
          ? req.query.date.trim()
          : new Date().toISOString().slice(0, 10);
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.MANAGER_CLOSING);
        return await getBranchDayClosingSummary(
          tenantId,
          req.params.branchId,
          s.user.id,
          s.membership?.role,
          date,
          { platformAdmin: s.user.platformAdmin },
        );
      } catch (e) {
        const er = e as Error & {
          statusCode?: number;
          code?: string;
          feature?: string;
        };
        if (er.code === "plan_feature_disabled") {
          return reply.code(403).send({ error: er.code, feature: er.feature });
        }
        const code = er.statusCode;
        if (code === 403) return reply.code(403).send({ error: "forbidden" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 400) return reply.code(400).send({ error: "validation_error" });
        throw e;
      }
    },
  );
}
