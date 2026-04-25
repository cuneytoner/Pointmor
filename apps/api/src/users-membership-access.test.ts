import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { prisma } from "./lib/prisma.js";

type TestUser = { id: string; email: string };
type TestTenant = { id: string; slug: string; name: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `users-membership-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: {
      slug,
      name: `Users Membership ${prefix}`,
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

function authHeaderFor(opts: { user: TestUser; tenant: TestTenant; role: "ADMIN" | "MEMBER" | "ADVISOR" }) {
  const token = issueSession({
    user: {
      id: opts.user.id,
      email: opts.user.email,
      name: "Users Membership",
      platformAdmin: false,
    },
    tenant: { id: opts.tenant.id, slug: opts.tenant.slug, name: opts.tenant.name },
    membership: {
      tenantId: opts.tenant.id,
      role: opts.role,
      isExternal: opts.role === "ADVISOR",
    },
    memberships: [
      {
        tenant: { id: opts.tenant.id, slug: opts.tenant.slug, name: opts.tenant.name },
        membership: {
          tenantId: opts.tenant.id,
          role: opts.role,
          isExternal: opts.role === "ADVISOR",
        },
      },
    ],
  });
  return { authorization: `Bearer ${token}` };
}

describe("User route membership-based access", () => {
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

  it("user without membership cannot see tenant data", async () => {
    const tenant = await createTenant("no-membership");
    tenantIds.push(tenant.id);
    const caller = await createUser("no-membership-caller");
    userIds.push(caller.id);
    const other = await createUser("no-membership-target");
    userIds.push(other.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: other.id,
        role: "MEMBER",
        isExternal: false,
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/users",
      headers: authHeaderFor({ user: caller, tenant, role: "ADMIN" }),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("forbidden");
  });

  it("removing membership removes access", async () => {
    const tenant = await createTenant("remove-membership");
    tenantIds.push(tenant.id);
    const caller = await createUser("remove-membership-caller");
    userIds.push(caller.id);
    const other = await createUser("remove-membership-target");
    userIds.push(other.id);

    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: caller.id,
        role: "ADMIN",
        isExternal: false,
      },
    });
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: other.id,
        role: "MEMBER",
        isExternal: false,
      },
    });

    const headers = authHeaderFor({ user: caller, tenant, role: "ADMIN" });

    const before = await app.inject({
      method: "GET",
      url: "/users",
      headers,
    });
    expect(before.statusCode).toBe(200);
    const beforeBody = JSON.parse(before.body) as Array<{ id: string }>;
    expect(beforeBody.some((u) => u.id === other.id)).toBe(true);

    await prisma.tenantMembership.delete({
      where: {
        userId_tenantId: {
          userId: caller.id,
          tenantId: tenant.id,
        },
      },
    });

    const after = await app.inject({
      method: "GET",
      url: "/users",
      headers,
    });
    expect(after.statusCode).toBe(403);
    expect(JSON.parse(after.body).error).toBe("forbidden");
  });
});
