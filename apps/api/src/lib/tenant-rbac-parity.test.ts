import { describe, expect, it } from "vitest";
import { assertPermission } from "./tenant-permission-guard.js";
import { TENANT_MEMBERSHIP_ROLES } from "./tenant-app-role.js";
import { hasPermissionForSession } from "./tenant-permissions.js";
import type { SessionPayload } from "./auth-memory.js";

function tenantSession(role: string): SessionPayload {
  return {
    user: { id: "u1", email: "u@test", name: "U", platformAdmin: false },
    tenant: { id: "t1", slug: "acme", name: "Acme" },
    membership: { role },
  };
}

describe("hasPermissionForSession parity (UI ile aynı matris)", () => {
  it("staff rewards.manage reddeder, visits.create verir", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.staff);
    expect(hasPermissionForSession(s, "visits.create")).toBe(true);
    expect(hasPermissionForSession(s, "rewards.manage")).toBe(false);
  });

  it("manager billing.manage reddeder, messaging.manage verir", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.manager);
    expect(hasPermissionForSession(s, "messaging.manage")).toBe(true);
    expect(hasPermissionForSession(s, "billing.manage")).toBe(false);
  });

  it("owner billing.manage verir", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.owner);
    expect(hasPermissionForSession(s, "billing.manage")).toBe(true);
  });

  it("manager audit.export reddeder, summary.export verir", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.manager);
    expect(hasPermissionForSession(s, "audit.export")).toBe(false);
    expect(hasPermissionForSession(s, "summary.export")).toBe(true);
  });

  it("ops campaigns.manage verir, redemptions.approve reddeder", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.ops);
    expect(hasPermissionForSession(s, "campaigns.manage")).toBe(true);
    expect(hasPermissionForSession(s, "redemptions.approve")).toBe(false);
  });

  it("manager ai_act.assess verir, ai_act.manage reddeder", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.manager);
    expect(hasPermissionForSession(s, "ai_act.assess")).toBe(true);
    expect(hasPermissionForSession(s, "ai_act.manage")).toBe(false);
  });

  it("advisor ai_act.assess verir, ai_act.manage reddeder", () => {
    const s = tenantSession("ADVISOR");
    expect(hasPermissionForSession(s, "ai_act.assess")).toBe(true);
    expect(hasPermissionForSession(s, "ai_act.manage")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("yetkisiz izinde fırlatır", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.staff);
    expect(() => assertPermission(s, "billing.manage")).toThrow("permission_denied");
  });

  it("yetkili izinde geçer", () => {
    const s = tenantSession(TENANT_MEMBERSHIP_ROLES.owner);
    expect(() => assertPermission(s, "billing.manage")).not.toThrow();
  });
});
