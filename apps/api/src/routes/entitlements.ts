import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { requireTenantIdFromRequest } from "../lib/tenant-context.js";
import { writeAudit } from "../lib/audit.js";
import { buildEntitlementsPayload } from "../lib/entitlement-service.js";
import { recordAuditEvent } from "../lib/operational-audit-service.js";
import { prisma } from "../lib/prisma.js";
import { mergeTenantWhere } from "../lib/tenant-scope.js";
import { parseWithSchema, z } from "../lib/validation.js";

const demoPlanSwitchSchema = z.object({
  planSlug: z.string().trim().min(1, "Plan gerekli."),
});

/** Plan, limitler, kullanım ve uyarılar — checkout yok. */
function demoPlanSwitchAllowed(): boolean {
  const v = process.env.ALLOW_TENANT_DEMO_PLAN_SWITCH?.trim().toLowerCase();
  if (v !== "true" && v !== "1") return false;
  if (process.env.APP_ENV === "demo") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function registerEntitlementsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/tenant/billing/demo-plan-switch",
    { preHandler: [authPreHandler, requireTenantPermission("billing.manage")] },
    async (req, reply) => {
      const tenantId = await requireTenantIdFromRequest(req, reply);
      if (!tenantId) return;
      if (!demoPlanSwitchAllowed()) {
        return reply.code(403).send({ error: "demo_plan_switch_disabled" });
      }
      const s = req.authSession as SessionPayload;
      const parsed = parseWithSchema(demoPlanSwitchSchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const slug = parsed.data.planSlug.toLowerCase();
      const plan = await prisma.plan.findFirst({ where: { slug } });
      if (!plan) {
        return reply.code(404).send({ error: "plan_not_found" });
      }
      const existing = await prisma.subscription.findFirst({
        where: mergeTenantWhere(tenantId, { status: "active" }),
        orderBy: { createdAt: "desc" },
      });
      let subId: string;
      if (existing) {
        const updated = await prisma.subscription.update({
          where: { id: existing.id },
          data: { planId: plan.id },
          include: { plan: true, tenant: true },
        });
        subId = updated.id;
        await writeAudit(
          s.user.email,
          "tenant.demo_plan_switch",
          `${tenantId}:${plan.slug}`,
        );
        await recordAuditEvent({
          tenantId,
          actorUserId: s.user.id,
          actorType: "manager",
          eventType: "subscription_plan_changed",
          entityType: "other",
          entityId: subId,
          payload: {
            planId: plan.id,
            planSlug: plan.slug,
            source: "tenant_demo_upgrade",
          },
        });
        return { ok: true, subscription: updated };
      }
      const created = await prisma.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: "active",
          renewsAt: null,
        },
        include: { plan: true, tenant: true },
      });
      subId = created.id;
      await writeAudit(
        s.user.email,
        "tenant.demo_plan_switch",
        `${tenantId}:${plan.slug}`,
      );
      await recordAuditEvent({
        tenantId,
        actorUserId: s.user.id,
        actorType: "manager",
        eventType: "subscription_plan_changed",
        entityType: "other",
        entityId: subId,
        payload: {
          planId: plan.id,
          planSlug: plan.slug,
          source: "tenant_demo_upgrade",
        },
      });
      return { ok: true, subscription: created };
    },
  );

  app.get("/tenant/entitlements", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    const tenantId = await requireTenantIdFromRequest(req, reply);
    if (!tenantId) return;
    const access = await requireTenantAccess(s.user, tenantId);
    if (!access.ok) {
      return reply.code(403).send({ error: access.error ?? "forbidden" });
    }
    try {
      return await buildEntitlementsPayload(tenantId);
    } catch (e) {
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 503) {
        return reply.code(503).send({ error: "plan_not_configured" });
      }
      throw e;
    }
  });
}
