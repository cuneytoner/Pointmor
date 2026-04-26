import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { authPreHandler } from "./lib/http-auth.js";
import { prisma } from "./lib/prisma.js";
import {
  requireAnyTenantPermission,
  requireTenantPermissions,
} from "./lib/tenant-permission-guard.js";

type TestUser = { id: string; email: string };
type TestTenant = { id: string; slug: string; name: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `module-guard-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: {
      slug,
      name: `Module Guard ${prefix}`,
      type: "BUSINESS",
    },
    select: { id: true, slug: true, name: true },
  });
}

async function createUser(prefix: string): Promise<TestUser> {
  const email = `${prefix}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: `User ${prefix}`,
      passwordHash: "not-used-in-this-test",
      role: "tenant_operator",
      tenantId: null,
      platformAdmin: false,
    },
    select: { id: true, email: true },
  });
}

async function ensureCafeModule() {
  return prisma.module.upsert({
    where: { name: "cafe" },
    update: {},
    create: { name: "cafe", description: "Cafe module" },
    select: { id: true },
  });
}

function authHeaderFor(user: TestUser, tenant: TestTenant) {
  const token = issueSession({
    user: {
      id: user.id,
      email: user.email,
      name: "Module Guard User",
      platformAdmin: false,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
    membership: {
      tenantId: tenant.id,
      role: "ADMIN",
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
          role: "ADMIN",
          isExternal: false,
        },
      },
    ],
  });
  return { authorization: `Bearer ${token}` };
}

describe("Module activation access guard", () => {
  let app: FastifyInstance;
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    app.get("/_test/perm-all", {
      preHandler: [
        authPreHandler,
        requireTenantPermissions("analytics.view", "menu.view"),
      ],
    }, async () => ({ ok: true }));
    app.get("/_test/perm-any", {
      preHandler: [
        authPreHandler,
        requireAnyTenantPermission("analytics.view", "menu.view"),
      ],
    }, async () => ({ ok: true }));
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

  it("module off -> access denied", async () => {
    const tenant = await createTenant("off");
    tenantIds.push(tenant.id);
    const user = await createUser("off");
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "ADMIN",
        isExternal: false,
      },
    });
    const moduleRow = await ensureCafeModule();
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: moduleRow.id,
        },
      },
      create: {
        tenantId: tenant.id,
        moduleId: moduleRow.id,
        isActive: false,
      },
      update: { isActive: false },
    });

    const res = await app.inject({
      method: "GET",
      url: "/summary",
      headers: authHeaderFor(user, tenant),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("module_not_active");
  });

  it("module on -> access allowed", async () => {
    const tenant = await createTenant("on");
    tenantIds.push(tenant.id);
    const user = await createUser("on");
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "ADMIN",
        isExternal: false,
      },
    });
    const moduleRow = await ensureCafeModule();
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: moduleRow.id,
        },
      },
      create: {
        tenantId: tenant.id,
        moduleId: moduleRow.id,
        isActive: true,
      },
      update: { isActive: true },
    });

    const res = await app.inject({
      method: "GET",
      url: "/summary",
      headers: authHeaderFor(user, tenant),
    });

    expect(res.statusCode).toBe(200);
  });

  it("requireTenantPermissions denies inactive module", async () => {
    const tenant = await createTenant("perm-all-off");
    tenantIds.push(tenant.id);
    const user = await createUser("perm-all-off");
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "ADMIN",
        isExternal: false,
      },
    });
    const moduleRow = await ensureCafeModule();
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: moduleRow.id,
        },
      },
      create: {
        tenantId: tenant.id,
        moduleId: moduleRow.id,
        isActive: false,
      },
      update: { isActive: false },
    });

    const res = await app.inject({
      method: "GET",
      url: "/_test/perm-all",
      headers: authHeaderFor(user, tenant),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("module_not_active");
  });

  it("requireAnyTenantPermission denies inactive module for module-scoped permissions", async () => {
    const tenant = await createTenant("perm-any-off");
    tenantIds.push(tenant.id);
    const user = await createUser("perm-any-off");
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "ADMIN",
        isExternal: false,
      },
    });
    const moduleRow = await ensureCafeModule();
    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: moduleRow.id,
        },
      },
      create: {
        tenantId: tenant.id,
        moduleId: moduleRow.id,
        isActive: false,
      },
      update: { isActive: false },
    });

    const res = await app.inject({
      method: "GET",
      url: "/_test/perm-any",
      headers: authHeaderFor(user, tenant),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("module_not_active");
  });
});
