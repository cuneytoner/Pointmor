import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { TENANT_MEMBERSHIP_ROLES } from "./lib/tenant-app-role.js";

describe("Compliance export permissions", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
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

  it("owner GET /audit/export/csv (alias) returns CSV header", async () => {
    const token = issueSession({
      user: { id: "u-own", email: "o@test", name: "O", platformAdmin: false },
      tenant: { id: "t1", slug: "acme", name: "Acme" },
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

  it("manager GET /summary/export/pdf returns PDF", async () => {
    const token = issueSession({
      user: { id: "u-mgr2", email: "m2@test", name: "M", platformAdmin: false },
      tenant: { id: "t1", slug: "acme", name: "Acme" },
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
    const token = issueSession({
      user: { id: "u-own3", email: "o3@test", name: "O", platformAdmin: false },
      tenant: { id: "t-alias", slug: "alias", name: "Alias Co" },
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
