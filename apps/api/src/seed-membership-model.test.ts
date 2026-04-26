import { randomUUID } from "node:crypto";
import { hashSync } from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

type Created = {
  userIds: string[];
  tenantIds: string[];
};

async function createTenant(slugPrefix: string, name: string) {
  const slug = `${slugPrefix}-${randomUUID().slice(0, 8)}`;
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name,
      type: "BUSINESS",
    },
  });
  return tenant;
}

async function createUser(emailPrefix: string, password: string) {
  const email = `${emailPrefix}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: emailPrefix,
      passwordHash: hashSync(password, 10),
      role: "tenant_operator",
      platformAdmin: false,
      tenantId: null,
    },
  });
}

describe("Seed membership-first contract", () => {
  let app: FastifyInstance;
  const created: Created = { userIds: [], tenantIds: [] };

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    if (created.tenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: created.tenantIds } } });
    }
    if (created.userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    }
    await app.close();
  });

  it("user without membership cannot access login session", async () => {
    const user = await createUser("seed-no-membership", "Pointmor!1234");
    created.userIds.push(user.id);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "Pointmor!1234" },
    });

    expect(login.statusCode).toBe(403);
    expect(login.json().error).toBe("no_tenant_membership");
  });

  it("login works when membership exists", async () => {
    const tenant = await createTenant("seed-login", "Seed Login Tenant");
    created.tenantIds.push(tenant.id);
    const user = await createUser("seed-login-user", "Pointmor!1234");
    created.userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "ADMIN",
        isExternal: false,
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "Pointmor!1234" },
    });

    expect(login.statusCode).toBe(200);
    expect(login.json().tenant?.id).toBe(tenant.id);
    expect(login.json().membership?.role).toBeDefined();
  });

  it("session payload contains memberships", async () => {
    const tenant = await createTenant("seed-session", "Seed Session Tenant");
    created.tenantIds.push(tenant.id);
    const user = await createUser("seed-session-user", "Pointmor!1234");
    created.userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: "MEMBER",
        isExternal: false,
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: "Pointmor!1234" },
    });
    const token = login.json().token as string | undefined;
    expect(token).toBeTruthy();

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(me.statusCode).toBe(200);
    const body = me.json();
    expect(Array.isArray(body.memberships)).toBe(true);
    expect(body.memberships.length).toBeGreaterThan(0);
    expect(body.memberships[0].tenant.id).toBe(tenant.id);
  });

  it("advisor sees only assigned tenants", async () => {
    const assigned = await createTenant("seed-advisor-a", "Advisor Assigned");
    const unassigned = await createTenant("seed-advisor-b", "Advisor Unassigned");
    created.tenantIds.push(assigned.id, unassigned.id);
    const advisor = await createUser("seed-advisor-user", "Pointmor!1234");
    created.userIds.push(advisor.id);
    await prisma.tenantMembership.create({
      data: {
        userId: advisor.id,
        tenantId: assigned.id,
        role: "ADVISOR",
        isExternal: true,
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: advisor.email, password: "Pointmor!1234" },
    });
    const token = login.json().token as string | undefined;
    expect(login.statusCode).toBe(200);
    expect(token).toBeTruthy();

    const tenants = await app.inject({
      method: "GET",
      url: "/tenants",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(tenants.statusCode).toBe(200);
    const rows = tenants.json() as Array<{ id: string }>;
    expect(rows.length).toBe(1);
    expect(rows[0]?.id).toBe(assigned.id);
    expect(rows.some((t) => t.id === unassigned.id)).toBe(false);
  });
});
