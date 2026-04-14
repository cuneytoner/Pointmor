import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import {
  getFunnelAnalytics,
  getGrowthOverview,
  getRetentionAnalytics,
  getRewardUsageStats,
} from "../lib/product-analytics-service.js";

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

export async function registerProductAnalyticsRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Querystring: { days?: string } }>(
    "/analytics/funnel",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const d = req.query.days ? Number.parseInt(req.query.days, 10) : 30;
      const days = Number.isFinite(d) && d > 0 && d <= 365 ? d : 30;
      return getFunnelAnalytics(tenantId, days);
    },
  );

  app.get<{ Querystring: { cohortDays?: string } }>(
    "/analytics/retention",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const d = req.query.cohortDays
        ? Number.parseInt(req.query.cohortDays, 10)
        : 90;
      const cohortDays = Number.isFinite(d) && d > 0 && d <= 730 ? d : 90;
      return getRetentionAnalytics(tenantId, cohortDays);
    },
  );

  app.get<{
    Querystring: {
      funnelDays?: string;
      cohortDays?: string;
      rewardDays?: string;
    };
  }>("/analytics/overview", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const fd = req.query.funnelDays
      ? Number.parseInt(req.query.funnelDays, 10)
      : 30;
    const cd = req.query.cohortDays
      ? Number.parseInt(req.query.cohortDays, 10)
      : 90;
    const rd = req.query.rewardDays
      ? Number.parseInt(req.query.rewardDays, 10)
      : 30;
    return getGrowthOverview(tenantId, {
      funnelDays: Number.isFinite(fd) && fd > 0 ? fd : 30,
      cohortDays: Number.isFinite(cd) && cd > 0 ? cd : 90,
      rewardDays: Number.isFinite(rd) && rd > 0 ? rd : 30,
    });
  });

  app.get<{ Querystring: { days?: string } }>(
    "/analytics/reward-usage",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const d = req.query.days ? Number.parseInt(req.query.days, 10) : 30;
      const days = Number.isFinite(d) && d > 0 && d <= 365 ? d : 30;
      return getRewardUsageStats(tenantId, days);
    },
  );
}
