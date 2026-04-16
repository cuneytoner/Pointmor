import type { AdminAuth } from "../hooks/useAdminData";
import {
  TENANT_PERMISSIONS,
  hasAnyPermissionForRole,
  hasPermissionForRole,
  permissionsForRole,
  type TenantPermission,
} from "@pointmor/rbac";
import { resolveTenantAppRole } from "./tenant-app-role";

export {
  TENANT_PERMISSIONS,
  hasPermissionForRole,
  hasAnyPermissionForRole,
  permissionsForRole,
  type TenantPermission,
};

/**
 * Oturum + kiracı bağlamı: aksiyon gating (`PermissionGate`, formlar).
 * Matris: `@pointmor/rbac` (`packages/pointmor-rbac`).
 */
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
  return hasAnyPermissionForRole(role, permissions);
}
