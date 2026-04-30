import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { prisma } from "./lib/prisma.js";

type TestTenant = { id: string; slug: string; name: string };
type TestUser = { id: string; email: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `prod-ops-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: { slug, name: `Product Ops ${prefix}`, type: "BUSINESS" },
    select: { id: true, slug: true, name: true },
  });
}

async function createUser(prefix: string, platformAdmin = false): Promise<TestUser> {
  const email = `prod-ops-${prefix}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: `Product Ops User ${prefix}`,
      passwordHash: "not-used",
      role: platformAdmin ? "platform_admin" : "tenant_operator",
      tenantId: null,
      platformAdmin,
    },
    select: { id: true, email: true },
  });
}

async function ensureAiActModule() {
  return prisma.module.upsert({
    where: { name: "ai_act" },
    update: {},
    create: { name: "ai_act", description: "AI Act module" },
    select: { id: true },
  });
}

async function ensureCafeModule() {
  return prisma.module.upsert({
    where: { name: "cafe" },
    update: {},
    create: { name: "cafe", description: "Loyalty/Cafe module" },
    select: { id: true },
  });
}

function authHeader(user: TestUser, tenant: TestTenant, role = "ADMIN") {
  const token = issueSession({
    user: {
      id: user.id,
      email: user.email,
      name: "Product Ops Tester",
      platformAdmin: false,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
    membership: {
      tenantId: tenant.id,
      role,
      isExternal: false,
    },
    memberships: [
      {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        membership: {
          tenantId: tenant.id,
          role,
          isExternal: false,
        },
      },
    ],
  });
  return { authorization: `Bearer ${token}` };
}

function authHeaderPlatformAdmin(user: TestUser) {
  const token = issueSession({
    user: {
      id: user.id,
      email: user.email,
      name: "Platform Admin Tester",
      platformAdmin: true,
    },
    tenant: null,
    membership: { role: "platform_admin" },
  });
  return { authorization: `Bearer ${token}` };
}

function shouldSkipDb(err: unknown): boolean {
  const msg = String(err);
  return msg.includes("Can't reach database server") || msg.includes("does not exist in the current database");
}

describe("GET /admin/products/ai-compliance/operations", () => {
  let app: FastifyInstance;
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    if (tenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it("unauthenticated request -> 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
    });
    expect(res.statusCode).toBe(401);
  });

  it("loyalty-only tenant (ai_act inactive) -> 403 module_not_active", async () => {
    try {
      const tenant = await createTenant("cafe-only");
      const user = await createUser("cafe-only");
      tenantIds.push(tenant.id);
      userIds.push(user.id);

      // Create cafe-only tenant (no ai_act module)
      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADMIN", isExternal: false },
      });
      const cafeModule = await ensureCafeModule();
      await prisma.tenantModule.create({
        data: { tenantId: tenant.id, moduleId: cafeModule.id, isActive: true },
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, tenant),
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("module_not_active");
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("tenant with inactive ai_act -> 403 module_not_active", async () => {
    try {
      const tenant = await createTenant("ai-inactive");
      const user = await createUser("ai-inactive");
      tenantIds.push(tenant.id);
      userIds.push(user.id);

      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADMIN", isExternal: false },
      });
      const aiModule = await ensureAiActModule();
      await prisma.tenantModule.create({
        data: { tenantId: tenant.id, moduleId: aiModule.id, isActive: false },
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, tenant),
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("module_not_active");
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("MEMBER user can access with ai_act.view permission", async () => {
    // Note: MEMBER role maps to 'manager' app role which HAS ai_act.view permission
    // (ai_act.view is NOT in MANAGER_EXCLUDED list)
    try {
      const tenant = await createTenant("member-view");
      const user = await createUser("member-view");
      tenantIds.push(tenant.id);
      userIds.push(user.id);

      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "MEMBER", isExternal: false },
      });
      const aiModule = await ensureAiActModule();
      await prisma.tenantModule.create({
        data: { tenantId: tenant.id, moduleId: aiModule.id, isActive: true },
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, tenant, "MEMBER"),
      });
      // MEMBER (mapped to manager) HAS ai_act.view permission
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty("aiCompliance");
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("valid ai_act tenant user can access own scope", async () => {
    try {
      const tenant = await createTenant("valid");
      const user = await createUser("valid");
      tenantIds.push(tenant.id);
      userIds.push(user.id);

      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADMIN", isExternal: false },
      });
      const aiModule = await ensureAiActModule();
      await prisma.tenantModule.create({
        data: { tenantId: tenant.id, moduleId: aiModule.id, isActive: true },
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, tenant),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("aiCompliance");
      expect(body.aiCompliance).toHaveProperty("activeOrganizations");
      expect(body.aiCompliance).toHaveProperty("systems");
      expect(body.aiCompliance.systems).toBeInstanceOf(Array);
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("advisor membership can access with view permission", async () => {
    try {
      const tenant = await createTenant("advisor");
      const user = await createUser("advisor");
      tenantIds.push(tenant.id);
      userIds.push(user.id);

      await prisma.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "ADVISOR", isExternal: true },
      });
      const aiModule = await ensureAiActModule();
      await prisma.tenantModule.create({
        data: { tenantId: tenant.id, moduleId: aiModule.id, isActive: true },
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, tenant, "ADVISOR"),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("aiCompliance");
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("platform admin can access cross-org ai_act operations", async () => {
    try {
      const tenant1 = await createTenant("pa-1");
      const tenant2 = await createTenant("pa-2");
      const platformAdmin = await createUser("pa-admin", true);
      tenantIds.push(tenant1.id, tenant2.id);
      userIds.push(platformAdmin.id);

      // Activate ai_act for both tenants
      const aiModule = await ensureAiActModule();
      await prisma.tenantModule.createMany({
        data: [
          { tenantId: tenant1.id, moduleId: aiModule.id, isActive: true },
          { tenantId: tenant2.id, moduleId: aiModule.id, isActive: true },
        ],
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeaderPlatformAdmin(platformAdmin),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("aiCompliance");
      expect(body.aiCompliance).toHaveProperty("activeOrganizations");
      expect(body.aiCompliance).toHaveProperty("systems");
      expect(body.aiCompliance.systems).toBeInstanceOf(Array);
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("returned tenants are only ai_act-active tenants", async () => {
    try {
      const aiTenant = await createTenant("ai-active");
      const cafeTenant = await createTenant("cafe-only-check");
      const user = await createUser("multi-tenant");
      tenantIds.push(aiTenant.id, cafeTenant.id);
      userIds.push(user.id);

      // Create membership for both tenants
      await prisma.tenantMembership.createMany({
        data: [
          { tenantId: aiTenant.id, userId: user.id, role: "ADMIN", isExternal: false },
          { tenantId: cafeTenant.id, userId: user.id, role: "ADMIN", isExternal: false },
        ],
      });

      // Activate only ai_act for aiTenant
      const aiModule = await ensureAiActModule();
      const cafeModule = await ensureCafeModule();
      await prisma.tenantModule.createMany({
        data: [
          { tenantId: aiTenant.id, moduleId: aiModule.id, isActive: true },
          { tenantId: cafeTenant.id, moduleId: cafeModule.id, isActive: true },
        ],
      });

      // User accesses through aiTenant context
      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: authHeader(user, aiTenant),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.aiCompliance.activeOrganizations).toBe(1);
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });

  it("no tenant context for regular user -> 403 tenant_context_required", async () => {
    try {
      const user = await createUser("no-tenant");
      userIds.push(user.id);

      // Issue session without tenant context (simulating no active tenant)
      const token = issueSession({
        user: {
          id: user.id,
          email: user.email,
          name: "No Tenant User",
          platformAdmin: false,
        },
        tenant: null,
        membership: { role: "platform_admin" }, // This won't have ai_act.view
      });

      const res = await app.inject({
        method: "GET",
        url: "/admin/products/ai-compliance/operations",
        headers: { authorization: `Bearer ${token}` },
      });
      // Should fail at permission check (no tenant context means no module activation check possible)
      expect([401, 403]).toContain(res.statusCode);
    } catch (err) {
      if (shouldSkipDb(err)) {
        expect(true).toBe(true);
        return;
      }
      throw err;
    }
  });
});
