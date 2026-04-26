import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { prisma } from "./lib/prisma.js";

type TestUser = { id: string; email: string };
type TestTenant = { id: string; slug: string; name: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `inv-create-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: {
      slug,
      name: `Invite Create ${prefix}`,
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
    select: { id: true },
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
      name: "Invite Creator",
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

describe("Tenant invitation create authorization", () => {
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

  it("advisor cannot create admin invite", async () => {
    const tenant = await createTenant("adv-no-admin");
    tenantIds.push(tenant.id);
    const inviter = await createUser("adv-no-admin");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADVISOR");

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADVISOR", isExternal: true }),
      payload: {
        email: `target-${randomUUID().slice(0, 8)}@example.com`,
        role: "ADMIN",
        isExternal: false,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("advisor_invite_role_forbidden");
  });

  it("advisor cannot create member invite", async () => {
    const tenant = await createTenant("adv-no-member");
    tenantIds.push(tenant.id);
    const inviter = await createUser("adv-no-member");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADVISOR");

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADVISOR", isExternal: true }),
      payload: {
        email: `target-${randomUUID().slice(0, 8)}@example.com`,
        role: "MEMBER",
        isExternal: false,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("advisor_invite_role_forbidden");
  });

  it("advisor can create advisor invite", async () => {
    const tenant = await createTenant("adv-ok");
    tenantIds.push(tenant.id);
    const inviter = await createUser("adv-ok");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADVISOR");

    const email = `target-${randomUUID().slice(0, 8)}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADVISOR", isExternal: true }),
      payload: {
        email,
        role: "ADVISOR",
        isExternal: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { role: string; isExternal: boolean; email: string };
    expect(body.role).toBe("ADVISOR");
    expect(body.isExternal).toBe(true);
    expect(body.email).toBe(email.toLowerCase());
  });

  it("advisor invite with isExternal=false is rejected", async () => {
    const tenant = await createTenant("adv-bad-external");
    tenantIds.push(tenant.id);
    const inviter = await createUser("adv-bad-external");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADVISOR");

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADVISOR", isExternal: true }),
      payload: {
        email: `target-${randomUUID().slice(0, 8)}@example.com`,
        role: "ADVISOR",
        isExternal: false,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("invitation_is_external_mismatch");
  });

  it("member cannot create advisor invite", async () => {
    const tenant = await createTenant("member-no-advisor");
    tenantIds.push(tenant.id);
    const inviter = await createUser("member-no-advisor");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "MEMBER");

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "MEMBER", isExternal: false }),
      payload: {
        email: `target-${randomUUID().slice(0, 8)}@example.com`,
        role: "ADVISOR",
        isExternal: true,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("member cannot create member invite", async () => {
    const tenant = await createTenant("member-no-member");
    tenantIds.push(tenant.id);
    const inviter = await createUser("member-no-member");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "MEMBER");

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "MEMBER", isExternal: false }),
      payload: {
        email: `target-${randomUUID().slice(0, 8)}@example.com`,
        role: "MEMBER",
        isExternal: false,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("admin can create all invitation roles", async () => {
    const tenant = await createTenant("admin-all");
    tenantIds.push(tenant.id);
    const inviter = await createUser("admin-all");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADMIN");

    const adminInvite = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADMIN", isExternal: false }),
      payload: {
        email: `admin-${randomUUID().slice(0, 8)}@example.com`,
        role: "ADMIN",
        isExternal: false,
      },
    });
    expect(adminInvite.statusCode).toBe(200);

    const memberInvite = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADMIN", isExternal: false }),
      payload: {
        email: `member-${randomUUID().slice(0, 8)}@example.com`,
        role: "MEMBER",
        isExternal: false,
      },
    });
    expect(memberInvite.statusCode).toBe(200);

    const advisorInvite = await app.inject({
      method: "POST",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADMIN", isExternal: false }),
      payload: {
        email: `advisor-${randomUUID().slice(0, 8)}@example.com`,
        role: "ADVISOR",
        isExternal: true,
      },
    });
    expect(advisorInvite.statusCode).toBe(200);
  });

  it("advisor cannot list invitations", async () => {
    const tenant = await createTenant("adv-list-denied");
    tenantIds.push(tenant.id);
    const inviter = await createUser("adv-list-denied");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADVISOR");

    const res = await app.inject({
      method: "GET",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADVISOR", isExternal: true }),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("admin can list invitations", async () => {
    const tenant = await createTenant("admin-list-ok");
    tenantIds.push(tenant.id);
    const inviter = await createUser("admin-list-ok");
    userIds.push(inviter.id);
    await addMembership(inviter.id, tenant.id, "ADMIN");

    const res = await app.inject({
      method: "GET",
      url: "/tenant/invitations",
      headers: authHeaderFor({ user: inviter, tenant, role: "ADMIN", isExternal: false }),
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });
});
