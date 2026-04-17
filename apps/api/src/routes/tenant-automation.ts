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
  approveAutomationAction,
  automationActionWhereForSession,
  getOrCreateAutomationSettings,
  patchAutomationSettings,
  rejectAutomationAction,
} from "../lib/hq-automation-service.js";
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

async function assertHqAutomation(tenantId: string, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  try {
    const ent = await getTenantEntitlementContext(tenantId);
    assertFeature(ent, FEATURE.HQ_DASHBOARD);
    assertFeature(ent, FEATURE.HQ_AUTOMATION);
    return true;
  } catch (e) {
    if (sendEntitlementHttpError(reply, e)) return false;
    throw e;
  }
}

export async function registerTenantAutomationRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/tenant/automation/summary",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      if (!(await assertHqAutomation(tenantId, reply))) return;

      const settings = await getOrCreateAutomationSettings(tenantId);
      const scope = automationActionWhereForSession(tenantId, s);
      const [pending, recent] = await Promise.all([
        prisma.hqAutomationAction.findMany({
          where: { ...scope, status: "pending" },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            branchId: true,
            triggerType: true,
            ruleKey: true,
            actionType: true,
            status: true,
            payload: true,
            createdAt: true,
          },
        }),
        prisma.hqAutomationAction.findMany({
          where: {
            ...scope,
            status: { in: ["completed", "failed", "rejected"] },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            branchId: true,
            triggerType: true,
            ruleKey: true,
            actionType: true,
            status: true,
            result: true,
            errorMessage: true,
            executedAt: true,
            createdAt: true,
          },
        }),
      ]);

      reply.header("Cache-Control", "private, max-age=15");
      return { settings, pending, recent };
    },
  );

  app.get(
    "/tenant/automation/settings",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      if (!(await assertHqAutomation(tenantId, reply))) return;
      return getOrCreateAutomationSettings(tenantId);
    },
  );

  app.patch<{
    Body: { mode?: string; maxActionsPerDay?: number; cooldownMinutes?: number };
  }>("/tenant/automation/settings", { preHandler: [authPreHandler, requireTenantPermission("settings.manage")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    if (!(await assertHqAutomation(tenantId, reply))) return;
    const out = await patchAutomationSettings(tenantId, s, req.body ?? {});
    if ("error" in out) {
      if (out.error === "forbidden") return reply.code(403).send(out);
      if (out.error === "invalid_mode") return reply.code(400).send(out);
      return reply.code(400).send(out);
    }
    return getOrCreateAutomationSettings(tenantId);
  });

  app.post<{ Params: { id: string } }>(
    "/tenant/automation/actions/:id/approve",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      if (!(await assertHqAutomation(tenantId, reply))) return;
    const out = await approveAutomationAction(tenantId, s, req.params.id);
    if ("error" in out) {
      if (out.error === "not_found") return reply.code(404).send(out);
      if (out.error === "forbidden") return reply.code(403).send(out);
      return reply.code(400).send(out);
    }
    return out;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/tenant/automation/actions/:id/reject",
    { preHandler: [authPreHandler, requireTenantPermission("analytics.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      if (!(await assertHqAutomation(tenantId, reply))) return;
    const out = await rejectAutomationAction(tenantId, s, req.params.id);
    if ("error" in out) {
      if (out.error === "not_found") return reply.code(404).send(out);
      if (out.error === "forbidden") return reply.code(403).send(out);
      return reply.code(400).send(out);
    }
    return out;
    },
  );
}
