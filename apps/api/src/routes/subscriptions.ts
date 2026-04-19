import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { canAccessTenant, requirePlatformAdmin } from "../lib/guards.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/operational-audit-service.js";
import { mergeTenantWhere } from "../lib/tenant-scope.js";
import { parseWithSchema, z } from "../lib/validation.js";

const subscriptionCreateBodySchema = z.object({
  tenantId: z.string().trim().min(1, "Kiracı gerekli."),
  planId: z.string().trim().min(1, "Plan gerekli."),
  status: z.string().trim().optional(),
  renewsAt: z.union([z.string(), z.null()]).optional(),
});

const subscriptionIdParamsSchema = z.object({
  subscriptionId: z.string().trim().min(1, "Abonelik gerekli."),
});

const subscriptionPatchBodySchema = z.object({
  status: z.string().trim().optional(),
  renewsAt: z.union([z.string(), z.null()]).optional(),
  planId: z.string().trim().optional(),
});

export async function registerSubscriptionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/subscriptions",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      if (s.user.platformAdmin) {
        return prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          include: { plan: true, tenant: true },
        });
      }
      if (!s.tenant) return [];
      if (!hasPermissionForSession(s, "billing.view")) {
        return reply.code(403).send({ error: "permission_denied" });
      }
      return prisma.subscription.findMany({
        where: mergeTenantWhere(s.tenant.id, {}),
        orderBy: { createdAt: "desc" },
        include: { plan: true, tenant: true },
      });
    },
  );

  app.post<{ Body: unknown }>(
    "/subscriptions",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const parsed = parseWithSchema(subscriptionCreateBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const b = parsed.data;
      const tenantId = b.tenantId.trim();
      const planId = b.planId.trim();
      try {
        const created = await prisma.subscription.create({
          data: {
            tenantId,
            planId,
            status: (b.status ?? "active").trim(),
            renewsAt: b.renewsAt ? new Date(b.renewsAt) : null,
          },
          include: { plan: true, tenant: true },
        });
        await writeAudit(s.user.email, "subscription.create", created.id);
        return created;
      } catch {
        return reply.code(400).send({ error: "create_failed" });
      }
    },
  );

  app.patch<{
    Params: { subscriptionId: string };
    Body: unknown;
  }>(
    "/subscriptions/:subscriptionId",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const paramsParsed = parseWithSchema(subscriptionIdParamsSchema, req.params);
      if (!paramsParsed.ok) {
        return reply.code(400).send({ error: paramsParsed.error, message: paramsParsed.message });
      }
      const subscriptionId = paramsParsed.data.subscriptionId.trim();
      const bodyParsed = parseWithSchema(subscriptionPatchBodySchema, req.body);
      if (!bodyParsed.ok) {
        return reply.code(400).send({ error: bodyParsed.error, message: bodyParsed.message });
      }
      const sub = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });
      if (!sub) return reply.code(404).send({ error: "not_found" });
      if (!canAccessTenant(s, sub.tenantId)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      if (!s.user.platformAdmin) {
        return reply.code(403).send({ error: "platform_or_elevated_required" });
      }
      const b = bodyParsed.data;
      const nextPlanId =
        typeof b.planId === "string" && b.planId.trim() ? b.planId.trim() : undefined;
      if (nextPlanId) {
        const pl = await prisma.plan.findFirst({ where: { id: nextPlanId } });
        if (!pl) {
          return reply.code(400).send({ error: "plan_not_found" });
        }
      }
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          ...(b.status !== undefined ? { status: b.status.trim() } : {}),
          ...(b.renewsAt !== undefined
            ? { renewsAt: b.renewsAt ? new Date(b.renewsAt) : null }
            : {}),
          ...(nextPlanId ? { planId: nextPlanId } : {}),
        },
        include: { plan: true, tenant: true },
      });
      await writeAudit(
        s.user.email,
        "subscription.update",
        `${subscriptionId}:${nextPlanId ?? "no_plan_change"}`,
      );
      if (nextPlanId) {
        await recordAuditEvent({
          tenantId: updated.tenantId,
          actorUserId: s.user.id,
          actorType: "manager",
          eventType: "subscription_plan_changed",
          entityType: "other",
          entityId: subscriptionId,
          payload: {
            planId: updated.plan.id,
            planSlug: updated.plan.slug,
            source: "platform_admin",
          },
        });
      }
      return updated;
    },
  );
}
