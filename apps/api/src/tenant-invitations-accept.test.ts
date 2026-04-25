import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { requireTenantAccess } from "./lib/guards.js";
import { prisma } from "./lib/prisma.js";

type TestUser = { id: string; email: string };
type TestTenant = { id: string; slug: string; name: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `inv-tenant-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: {
      slug,
      name: `Invitation Tenant ${prefix}`,
      type: "BUSINESS",
    },
    select: { id: true, slug: true, name: true },
  });
}

async function createUser(emailPrefix: string): Promise<TestUser> {
  const email = `${emailPrefix}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: `User ${emailPrefix}`,
      passwordHash: "not-used-in-this-test",
      role: "tenant_operator",
      tenantId: null,
      platformAdmin: false,
    },
    select: { id: true, email: true },
  });
}

async function createInvitation(data: {
  tenantId: string;
  email: string;
  role?: "ADMIN" | "MEMBER" | "ADVISOR";
  isExternal?: boolean;
  expiresAt?: Date | null;
  status?: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
}) {
  return prisma.tenantInvitation.create({
    data: {
      tenantId: data.tenantId,
      email: data.email.toLowerCase(),
      role: data.role ?? "MEMBER",
      isExternal: data.isExternal ?? false,
      token: `tok-${randomUUID()}`,
      expiresAt: data.expiresAt ?? null,
      status: data.status ?? "PENDING",
    },
    select: {
      id: true,
      token: true,
      tenantId: true,
      role: true,
      isExternal: true,
      status: true,
    },
  });
}

function authHeaderFor(user: TestUser) {
  const token = issueSession({
    user: {
      id: user.id,
      email: user.email,
      name: "Invitation User",
      platformAdmin: false,
    },
    tenant: null,
    membership: null,
    memberships: [],
  });
  return { authorization: `Bearer ${token}` };
}

describe("Tenant invitation acceptance", () => {
  let app: FastifyInstance;
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    if (createdTenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  it("valid invitation -> membership created", async () => {
    const tenant = await createTenant("valid");
    createdTenantIds.push(tenant.id);
    const user = await createUser("valid");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({ tenantId: tenant.id, email: user.email, role: "MEMBER" });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { tenantId: string; role: string; isExternal: boolean };
    expect(body.tenantId).toBe(tenant.id);
    expect(body.role).toBe("MEMBER");
    expect(body.isExternal).toBe(false);

    const membership = await prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      select: { role: true, isExternal: true },
    });
    expect(membership?.role).toBe("MEMBER");
    expect(membership?.isExternal).toBe(false);
  });

  it("accepting twice -> no duplicate membership", async () => {
    const tenant = await createTenant("twice");
    createdTenantIds.push(tenant.id);
    const user = await createUser("twice");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({ tenantId: tenant.id, email: user.email, role: "MEMBER" });

    const first = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });
    expect(second.statusCode).toBe(400);
    expect(JSON.parse(second.body).error).toBe("invitation_already_used");

    const membershipCount = await prisma.tenantMembership.count({
      where: { userId: user.id, tenantId: tenant.id },
    });
    expect(membershipCount).toBe(1);
  });

  it("expired invitation -> rejected", async () => {
    const tenant = await createTenant("expired");
    createdTenantIds.push(tenant.id);
    const user = await createUser("expired");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({
      tenantId: tenant.id,
      email: user.email,
      role: "MEMBER",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("invitation_expired");
  });

  it("email mismatch -> rejected", async () => {
    const tenant = await createTenant("mismatch");
    createdTenantIds.push(tenant.id);
    const invitedUser = await createUser("mismatch-invited");
    createdUserIds.push(invitedUser.id);
    const otherUser = await createUser("mismatch-other");
    createdUserIds.push(otherUser.id);
    const invitation = await createInvitation({ tenantId: tenant.id, email: invitedUser.email, role: "MEMBER" });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(otherUser),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("invitation_email_mismatch");
  });

  it("external advisor -> created with isExternal=true", async () => {
    const tenant = await createTenant("ext-advisor");
    createdTenantIds.push(tenant.id);
    const user = await createUser("ext-advisor");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({
      tenantId: tenant.id,
      email: user.email,
      role: "ADVISOR",
      isExternal: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { role: string; isExternal: boolean };
    expect(body.role).toBe("ADVISOR");
    expect(body.isExternal).toBe(true);
  });

  it("external ADMIN -> rejected", async () => {
    const tenant = await createTenant("ext-admin");
    createdTenantIds.push(tenant.id);
    const user = await createUser("ext-admin");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({
      tenantId: tenant.id,
      email: user.email,
      role: "ADMIN",
      isExternal: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("invitation_role_not_allowed");
  });

  it("membership exists -> safe accept, no duplicate", async () => {
    const tenant = await createTenant("existing");
    createdTenantIds.push(tenant.id);
    const user = await createUser("existing");
    createdUserIds.push(user.id);
    await prisma.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "MEMBER",
        isExternal: false,
      },
    });
    const invitation = await createInvitation({ tenantId: tenant.id, email: user.email, role: "MEMBER" });

    const res = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });

    expect(res.statusCode).toBe(200);
    const membershipCount = await prisma.tenantMembership.count({
      where: { userId: user.id, tenantId: tenant.id },
    });
    expect(membershipCount).toBe(1);

    const acceptedInvitation = await prisma.tenantInvitation.findUnique({
      where: { id: invitation.id },
      select: { status: true, acceptedAt: true },
    });
    expect(acceptedInvitation?.status).toBe("ACCEPTED");
    expect(acceptedInvitation?.acceptedAt).not.toBeNull();
  });

  it("access before accept denied; after accept allowed", async () => {
    const tenant = await createTenant("access");
    createdTenantIds.push(tenant.id);
    const user = await createUser("access");
    createdUserIds.push(user.id);
    const invitation = await createInvitation({ tenantId: tenant.id, email: user.email, role: "MEMBER" });

    const before = await requireTenantAccess({ id: user.id, platformAdmin: false }, tenant.id);
    expect(before.ok).toBe(false);
    expect(before.error).toBe("forbidden");

    const acceptRes = await app.inject({
      method: "POST",
      url: "/tenant/invitations/accept",
      headers: authHeaderFor(user),
      payload: { token: invitation.token },
    });
    expect(acceptRes.statusCode).toBe(200);

    const after = await requireTenantAccess({ id: user.id, platformAdmin: false }, tenant.id);
    expect(after.ok).toBe(true);
  });
});
