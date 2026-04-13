import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { canAccessTenant, requirePlatformAdmin } from "../lib/guards.js";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";

export async function registerSubscriptionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/subscriptions",
    { preHandler: [authPreHandler] },
    async (req) => {
      const s = req.authSession as SessionPayload;
      if (s.user.platformAdmin) {
        return prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          include: { plan: true, tenant: true },
        });
      }
      if (!s.tenant) return [];
      return prisma.subscription.findMany({
        where: { tenantId: s.tenant.id },
        orderBy: { createdAt: "desc" },
        include: { plan: true, tenant: true },
      });
    },
  );

  app.post<{
    Body: {
      tenantId?: string;
      planId?: string;
      status?: string;
      renewsAt?: string | null;
    };
  }>(
    "/subscriptions",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const tenantId = (b.tenantId ?? "").trim();
      const planId = (b.planId ?? "").trim();
      if (!tenantId || !planId) {
        return reply.code(400).send({ error: "validation_error" });
      }
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
    Body: { status?: string; renewsAt?: string | null };
  }>(
    "/subscriptions/:subscriptionId",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const { subscriptionId } = req.params;
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
      const b = req.body ?? {};
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          ...(b.status !== undefined ? { status: b.status.trim() } : {}),
          ...(b.renewsAt !== undefined
            ? { renewsAt: b.renewsAt ? new Date(b.renewsAt) : null }
            : {}),
        },
        include: { plan: true, tenant: true },
      });
      await writeAudit(s.user.email, "subscription.update", subscriptionId);
      return updated;
    },
  );
}
