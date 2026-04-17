import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { prisma } from "./lib/prisma.js";
import { TENANT_MEMBERSHIP_ROLES } from "./lib/tenant-app-role.js";

/** Seed’de `compliance_full` ile growth aboneliği olan demo kiracı (yoksa null). */
let complianceTenantId: string | null = null;

describe("Compliance export permissions", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    try {
      const row = await prisma.tenant.findUnique({
        where: { slug: "demo-cafe" },
        select: { id: true },
      });
      complianceTenantId = row?.id ?? null;
    } catch {
      complianceTenantId = null;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("staff cannot GET /tenant/audit/export/csv", async () => {
    const token = issueSession({
      user: { id: "u-staff", email: "s@test", name: "S", platformAdmin: false },
      tenant: { id: "t1", slug: "acme", name: "Acme" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.staff },
    });
    const res = await app.inject({
      method: "GET",
      url: "/tenant/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("manager cannot GET /tenant/audit/export/csv (owner-only)", async () => {
    const token = issueSession({
      user: { id: "u-mgr", email: "m@test", name: "M", platformAdmin: false },
      tenant: { id: "t1", slug: "acme", name: "Acme" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.manager },
    });
    const res = await app.inject({
      method: "GET",
      url: "/tenant/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe("permission_denied");
  });

  it("staff cannot GET /tenant/summary/export/pdf", async () => {
    const token = issueSession({
      user: { id: "u-staff2", email: "s2@test", name: "S", platformAdmin: false },
      tenant: { id: "t1", slug: "acme", name: "Acme" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.staff },
    });
    const res = await app.inject({
      method: "GET",
      url: "/tenant/summary/export/pdf",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("owner GET /audit/export/csv (alias) returns CSV header when Compliance Pack full", async () => {
    if (!complianceTenantId) {
      console.warn("skip: demo-cafe tenant not in DB");
      return;
    }
    const token = issueSession({
      user: { id: "u-own", email: "o@test", name: "O", platformAdmin: false },
      tenant: { id: complianceTenantId, slug: "demo-cafe", name: "Demo" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.owner },
    });
    const res = await app.inject({
      method: "GET",
      url: "/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.body).toContain("payload_summary");
  });

  it("owner on starter plan gets plan_feature_disabled for audit csv", async () => {
    const token = issueSession({
      user: { id: "u-free-own", email: "free@test", name: "F", platformAdmin: false },
      tenant: { id: "t-starter-only", slug: "starterco", name: "Starter Co" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.owner },
    });
    const res = await app.inject({
      method: "GET",
      url: "/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body) as { error?: string; feature?: string };
    expect(body.error).toBe("plan_feature_disabled");
    expect(body.feature).toBe("compliance_full");
  });

  it("manager GET /summary/export/pdf returns PDF with Compliance Pack", async () => {
    if (!complianceTenantId) {
      console.warn("skip: demo-cafe tenant not in DB");
      return;
    }
    const token = issueSession({
      user: { id: "u-mgr2", email: "m2@test", name: "M", platformAdmin: false },
      tenant: { id: complianceTenantId, slug: "demo-cafe", name: "Demo" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.manager },
    });
    const res = await app.inject({
      method: "GET",
      url: "/summary/export/pdf?period=day",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
  });

  it("owner GET /tenant/audit/export/csv matches alias /audit/export/csv", async () => {
    if (!complianceTenantId) {
      console.warn("skip: demo-cafe tenant not in DB");
      return;
    }
    const token = issueSession({
      user: { id: "u-own3", email: "o3@test", name: "O", platformAdmin: false },
      tenant: { id: complianceTenantId, slug: "demo-cafe", name: "Demo" },
      membership: { role: TENANT_MEMBERSHIP_ROLES.owner },
    });
    const a = await app.inject({
      method: "GET",
      url: "/tenant/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    const b = await app.inject({
      method: "GET",
      url: "/audit/export/csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.body).toBe(b.body);
  });
});
