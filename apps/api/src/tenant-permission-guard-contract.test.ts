import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { authPreHandler } from "./lib/http-auth.js";
import { prisma } from "./lib/prisma.js";
import {
  __testOnly_deleteModuleMapping,
  __testOnly_setModuleMapping,
  requireTenantPermission,
} from "./lib/tenant-permission-guard.js";
import type { TenantPermission } from "./lib/tenant-permissions.js";

type TestUser = { id: string; email: string };
type TestTenant = { id: string; slug: string; name: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `perm-contract-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: {
      slug,
      name: `Permission Contract ${prefix}`,
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
      passwordHash: "not-used",
      role: "tenant_operator",
      tenantId: null,
      platformAdmin: false,
    },
    select: { id: true, email: true },
  });
}

async function addMembership(userId: string, tenantId: string, role: "ADMIN" | "MEMBER" | "ADVISOR") {
  return prisma.tenantMembership.create({
    data: {
      userId,
      tenantId,
      role,
      isExternal: role === "ADVISOR",
    },
  });
}

function authHeaderFor(opts: {
  user: TestUser;
  tenant: TestTenant;
  role: "ADMIN" | "MEMBER" | "ADVISOR";
  isExternal?: boolean;
}) {
  const token = issueSession({
    user: {
      id: opts.user.id,
      email: opts.user.email,
      name: "Permission Contract User",
      platformAdmin: false,
    },
    tenant: { id: opts.tenant.id, slug: opts.tenant.slug, name: opts.tenant.name },
    membership: {
      tenantId: opts.tenant.id,
      role: opts.role,
      isExternal: opts.isExternal ?? opts.role === "ADVISOR",
    },
    memberships: [
      {
        tenant: { id: opts.tenant.id, slug: opts.tenant.slug, name: opts.tenant.name },
        membership: {
          tenantId: opts.tenant.id,
          role: opts.role,
          isExternal: opts.isExternal ?? opts.role === "ADVISOR",
        },
      },
    ],
  });
  return { authorization: `Bearer ${token}` };
}

describe("Tenant permission guard contract", () => {
  let app: FastifyInstance;
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    app.get("/_test/unknown-permission-contract", {
      preHandler: [
        authPreHandler,
        requireTenantPermission("unknown.permission" as TenantPermission),
      ],
    }, async () => ({ ok: true }));
    app.get("/_test/audit-view-contract", {
      preHandler: [
        authPreHandler,
        requireTenantPermission("audit.view"),
      ],
    }, async () => ({ ok: true }));
    app.get("/_test/module-mapping-contract", {
      preHandler: [
        authPreHandler,
        requireTenantPermission("customers.view"),
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

  it("unknown permission -> denied", async () => {
    const tenant = await createTenant("unknown-denied");
    tenantIds.push(tenant.id);
    const user = await createUser("unknown-denied");
    userIds.push(user.id);
    await addMembership(user.id, tenant.id, "ADMIN");

    const res = await app.inject({
      method: "GET",
      url: "/_test/unknown-permission-contract",
      headers: authHeaderFor({ user, tenant, role: "ADMIN", isExternal: false }),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("missing module mapping -> denied", async () => {
    const tenant = await createTenant("missing-mapping");
    tenantIds.push(tenant.id);
    const user = await createUser("missing-mapping");
    userIds.push(user.id);
    await addMembership(user.id, tenant.id, "ADMIN");
    __testOnly_deleteModuleMapping("customers.view");

    try {
      const res = await app.inject({
        method: "GET",
        url: "/_test/module-mapping-contract",
        headers: authHeaderFor({ user, tenant, role: "ADMIN", isExternal: false }),
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toBe("permission_without_module_mapping");
    } finally {
      __testOnly_setModuleMapping("customers.view", "cafe");
    }
  });

  it("audit.view works correctly", async () => {
    const tenant = await createTenant("audit-view");
    tenantIds.push(tenant.id);
    const managerUser = await createUser("audit-view-manager");
    userIds.push(managerUser.id);
    await addMembership(managerUser.id, tenant.id, "MEMBER");

    const allowed = await app.inject({
      method: "GET",
      url: "/_test/audit-view-contract",
      headers: authHeaderFor({ user: managerUser, tenant, role: "MEMBER", isExternal: false }),
    });
    expect(allowed.statusCode).toBe(200);

    const advisorUser = await createUser("audit-view-advisor");
    userIds.push(advisorUser.id);
    await addMembership(advisorUser.id, tenant.id, "ADVISOR");
    const denied = await app.inject({
      method: "GET",
      url: "/_test/audit-view-contract",
      headers: authHeaderFor({ user: advisorUser, tenant, role: "ADVISOR", isExternal: true }),
    });
    expect(denied.statusCode).toBe(403);
    expect(JSON.parse(denied.body).error).toBe("permission_denied");
  });
});
