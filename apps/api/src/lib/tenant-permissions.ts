import type { SessionPayload } from "./auth-memory.js";
import { resolveTenantAppRole, type TenantAppRole } from "./tenant-app-role.js";

/** admin-web `tenant-permissions.ts` ile aynı sözlük — değişikliklerde iki dosyayı güncelleyin. */
export const TENANT_PERMISSIONS = [
  "customers.view",
  "customers.create",
  "visits.view",
  "visits.create",
  "rewards.view",
  "rewards.manage",
  "redemptions.view",
  "redemptions.create",
  "redemptions.approve",
  "redemptions.reject",
  "campaigns.view",
  "campaigns.manage",
  "messaging.view",
  "messaging.manage",
  "settings.view",
  "settings.manage",
  "team.view",
  "team.manage",
  "billing.view",
  "billing.manage",
  "analytics.view",
  "menu.view",
  "menu.manage",
  "automation.run",
] as const;

export type TenantPermission = (typeof TENANT_PERMISSIONS)[number];

const ALL = new Set<TenantPermission>(TENANT_PERMISSIONS);

function permSet(...items: TenantPermission[]): Set<TenantPermission> {
  return new Set(items);
}

const PERMISSIONS_BY_ROLE: Record<TenantAppRole, Set<TenantPermission>> = {
  owner: ALL,
  manager: new Set(TENANT_PERMISSIONS.filter((p) => p !== "billing.manage")),
  staff: permSet(
    "customers.view",
    "customers.create",
    "visits.view",
    "visits.create",
    "rewards.view",
    "redemptions.view",
    "redemptions.create",
    "redemptions.approve",
    "redemptions.reject",
  ),
  ops: permSet(
    "customers.view",
    "settings.view",
    "campaigns.view",
    "campaigns.manage",
    "messaging.view",
    "messaging.manage",
    "analytics.view",
    "redemptions.view",
    "menu.view",
    "automation.run",
  ),
  viewer: permSet("customers.view", "analytics.view"),
};

export function permissionsForRole(role: TenantAppRole): Set<TenantPermission> {
  return PERMISSIONS_BY_ROLE[role];
}

export function hasPermissionForRole(role: TenantAppRole, permission: TenantPermission): boolean {
  return PERMISSIONS_BY_ROLE[role].has(permission);
}

export function hasPermissionForSession(
  session: SessionPayload,
  permission: TenantPermission,
): boolean {
  if (!session.tenant || session.user.platformAdmin) return false;
  return hasPermissionForRole(resolveTenantAppRole(session), permission);
}
