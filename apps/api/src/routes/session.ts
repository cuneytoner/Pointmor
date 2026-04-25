import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { issueSession, revokeSession } from "../lib/auth-memory.js";
import { authPreHandler, parseSessionToken } from "../lib/http-auth.js";
import { SESSION_COOKIE_NAME } from "../lib/session-cookie.js";
import { sessionCookieOptions } from "../lib/session-cookie.js";
import { getUserActivationMilestones } from "../lib/analytics-service.js";
import { buildSessionMembership } from "../lib/session-branch-membership.js";
import { prisma } from "../lib/prisma.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";
import { parseWithSchema, z } from "../lib/validation.js";

const tenantSwitchBodySchema = z.object({
  tenantId: z.string().trim().min(1, "Kiracı gerekli."),
});

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/pricing", async () => ({
    public: true,
    title: "Pointmor — plan özeti",
    note: "Bu uç herkese açık (geliştirme).",
  }));

  app.get("/auth/me", { preHandler: authPreHandler }, async (req) => {
    const s = req.authSession as SessionPayload;
    const activation = await getUserActivationMilestones(s.user.id);
    return {
      user: s.user,
      tenant: s.tenant,
      membership: s.membership,
      memberships: s.memberships ?? [],
      activation,
    };
  });

  app.post("/auth/switch-tenant", { preHandler: authPreHandler }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (s.user.platformAdmin) {
      return reply.code(403).send({ error: "platform_admin_no_switch" });
    }
    const parsed = parseWithSchema(tenantSwitchBodySchema, req.body);
    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.error, message: parsed.message });
    }
    const user = await prisma.user.findUnique({
      where: { id: s.user.id },
      include: {
        memberships: {
          include: { tenant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const target = user.memberships.find((m) => m.tenantId === parsed.data.tenantId);
    if (!target) {
      return reply.code(403).send({ error: "forbidden" });
    }

    const membership = await buildSessionMembership(
      user.id,
      target.tenant.id,
      target.role,
      target.isExternal,
    );
    const nextPayload: SessionPayload = {
      user: s.user,
      tenant: {
        id: target.tenant.id,
        slug: target.tenant.slug,
        name: target.tenant.name,
      },
      membership,
      memberships: await Promise.all(
        user.memberships.map(async (m) => ({
          tenant: { id: m.tenant.id, slug: m.tenant.slug, name: m.tenant.name },
          membership: await buildSessionMembership(user.id, m.tenant.id, m.role, m.isExternal),
        })),
      ),
    };
    const token = issueSession(nextPayload);
    reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return {
      tenant: nextPayload.tenant,
      membership: nextPayload.membership,
      memberships: nextPayload.memberships,
    };
  });

  app.get("/admin/bootstrap", { preHandler: authPreHandler }, async (req) => {
    const s = req.authSession as SessionPayload;
    const [tenants, users, plans, subscriptions, auditLogs] = await Promise.all([
      loadTenantsForSession(s),
      loadUsersForSession(s),
      prisma.plan.findMany({ orderBy: { name: "asc" } }),
      loadSubscriptionsForSession(s),
      s.user.platformAdmin
        ? prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        : Promise.resolve([]),
    ]);

    return {
      user: s.user,
      tenant: s.tenant,
      membership: s.membership,
      tenants,
      users,
      plans,
      subscriptions,
      auditLogs,
    };
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = parseSessionToken(req);
    await revokeSession(token);
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { ok: true };
  });
}

const tenantBootstrapSelect = {
  id: true,
  slug: true,
  name: true,
  type: true,
  createdAt: true,
  onboardingStep: true,
  onboardingCompletedAt: true,
} as const;

async function loadTenantsForSession(s: SessionPayload) {
  if (s.user.platformAdmin) {
    return prisma.tenant.findMany({ orderBy: { name: "asc" }, select: tenantBootstrapSelect });
  }
  const ids = (s.memberships ?? []).map((m) => m.tenant.id);
  if (ids.length === 0 && s.tenant?.id) ids.push(s.tenant.id);
  if (ids.length === 0) return [];
  return prisma.tenant.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: tenantBootstrapSelect,
  });
}

async function loadUsersForSession(s: SessionPayload) {
  if (s.user.platformAdmin) {
    return prisma.user.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        platformAdmin: true,
        role: true,
        tenantId: true,
        tenant: { select: { slug: true, name: true } },
      },
    });
  }
  if (!s.tenant) return [];
  if (!hasPermissionForSession(s, "team.view")) {
    return [];
  }
  const activeMembership = (s.memberships ?? []).find((m) => m.tenant.id === s.tenant?.id);
  const isAdvisor = activeMembership?.membership.role === "ADVISOR";
  return prisma.user.findMany({
    where: isAdvisor
      ? { memberships: { some: { tenantId: s.tenant.id } } }
      : { tenantId: s.tenant.id },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      platformAdmin: true,
      role: true,
      tenantId: true,
      tenant: { select: { slug: true, name: true } },
    },
  });
}

async function loadSubscriptionsForSession(s: SessionPayload) {
  if (s.user.platformAdmin) {
    return prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: true, tenant: true },
    });
  }
  if (!s.tenant) return [];
  if (!hasPermissionForSession(s, "billing.view")) {
    return [];
  }
  return prisma.subscription.findMany({
    where: { tenantId: s.tenant.id },
    orderBy: { createdAt: "desc" },
    include: { plan: true, tenant: true },
  });
}
