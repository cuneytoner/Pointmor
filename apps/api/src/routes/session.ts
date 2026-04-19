import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { revokeSession } from "../lib/auth-memory.js";
import { authPreHandler, parseSessionToken } from "../lib/http-auth.js";
import { SESSION_COOKIE_NAME } from "../lib/session-cookie.js";
import { getUserActivationMilestones } from "../lib/analytics-service.js";
import { prisma } from "../lib/prisma.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";

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
      activation,
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
  createdAt: true,
  onboardingStep: true,
  onboardingCompletedAt: true,
} as const;

async function loadTenantsForSession(s: SessionPayload) {
  if (s.user.platformAdmin) {
    return prisma.tenant.findMany({ orderBy: { name: "asc" }, select: tenantBootstrapSelect });
  }
  if (!s.tenant) return [];
  const row = await prisma.tenant.findUnique({
    where: { id: s.tenant.id },
    select: tenantBootstrapSelect,
  });
  return row ? [row] : [];
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
  return prisma.user.findMany({
    where: { tenantId: s.tenant.id },
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
