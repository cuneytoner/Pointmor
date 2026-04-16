import { describe, expect, it } from "vitest";
import {
  hasPermissionForRole,
  resolveTenantAppRoleFromMembership,
  TENANT_MEMBERSHIP_ROLES,
} from "./rbac-config.js";

/**
 * Regression: rol → izin matrisi ve ham rol çözümlemesi.
 * Kritik parity senaryoları (audit ile uyumlu).
 */
describe("RBAC matrix", () => {
  it("owner has billing.manage", () => {
    expect(hasPermissionForRole("owner", "billing.manage")).toBe(true);
  });

  it("manager lacks billing.manage", () => {
    expect(hasPermissionForRole("manager", "billing.manage")).toBe(false);
  });

  it("manager has messaging.manage and team.view", () => {
    expect(hasPermissionForRole("manager", "messaging.manage")).toBe(true);
    expect(hasPermissionForRole("manager", "team.view")).toBe(true);
  });

  it("staff can visits.create and redemptions.approve but not rewards.manage", () => {
    expect(hasPermissionForRole("staff", "visits.create")).toBe(true);
    expect(hasPermissionForRole("staff", "redemptions.approve")).toBe(true);
    expect(hasPermissionForRole("staff", "rewards.manage")).toBe(false);
  });

  it("staff cannot settings.manage or billing.view", () => {
    expect(hasPermissionForRole("staff", "settings.manage")).toBe(false);
    expect(hasPermissionForRole("staff", "billing.view")).toBe(false);
  });

  it("ops has campaigns.manage and messaging but not redemptions.approve", () => {
    expect(hasPermissionForRole("ops", "campaigns.manage")).toBe(true);
    expect(hasPermissionForRole("ops", "messaging.manage")).toBe(true);
    expect(hasPermissionForRole("ops", "redemptions.approve")).toBe(false);
  });

  it("ops lacks visits.create", () => {
    expect(hasPermissionForRole("ops", "visits.create")).toBe(false);
  });

  it("viewer has narrow access", () => {
    expect(hasPermissionForRole("viewer", "customers.view")).toBe(true);
    expect(hasPermissionForRole("viewer", "rewards.manage")).toBe(false);
  });
});

describe("membership role resolution", () => {
  it("maps tenant_operator to manager", () => {
    expect(resolveTenantAppRoleFromMembership(TENANT_MEMBERSHIP_ROLES.operator)).toBe("manager");
  });

  it("maps tenant_owner to owner", () => {
    expect(resolveTenantAppRoleFromMembership(TENANT_MEMBERSHIP_ROLES.owner)).toBe("owner");
  });

  it("maps tenant_ops to ops", () => {
    expect(resolveTenantAppRoleFromMembership(TENANT_MEMBERSHIP_ROLES.ops)).toBe("ops");
  });
});
