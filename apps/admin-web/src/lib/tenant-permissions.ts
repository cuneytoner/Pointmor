import type { AdminAuth } from "../hooks/useAdminData";
import { resolveTenantAppRole, type TenantAppRole } from "./tenant-app-role";

/**
 * İnce taneli kiracı izinleri — navigasyon rotalarından bağımsız; aksiyon/API ile hizalı tutulur.
 * API: `apps/api/src/lib/tenant-permissions.ts` ile aynı sözlük ve rol haritası.
 */
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

/** Rol → izin kümesi (tek kaynak). */
const PERMISSIONS_BY_ROLE: Record<TenantAppRole, Set<TenantPermission>> = {
  owner: ALL,
  /** Operasyon + ayarlar; faturalama yönetimi yalnız owner (ürün kararı). */
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

export function hasPermission(auth: AdminAuth | null | undefined, permission: TenantPermission): boolean {
  if (!auth?.tenant || auth.user.platformAdmin) return false;
  return hasPermissionForRole(resolveTenantAppRole(auth), permission);
}

/** Tüm izinlerden en az biri (OR). */
export function hasAnyPermission(
  auth: AdminAuth | null | undefined,
  permissions: TenantPermission[],
): boolean {
  if (!auth?.tenant || auth.user.platformAdmin) return false;
  const role = resolveTenantAppRole(auth);
  return permissions.some((p) => hasPermissionForRole(role, p));
}
