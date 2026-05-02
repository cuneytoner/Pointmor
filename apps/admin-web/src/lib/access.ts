import type { AdminAuth } from "../hooks/useAdminData";
import { resolveTenantAppRole } from "./tenant-app-role";
import { defaultTenantHomePath } from "./tenant-route-access";

export { resolveTenantAppRole, TENANT_MEMBERSHIP_ROLES, type TenantAppRole } from "./tenant-app-role";
export {
  TENANT_PERMISSIONS,
  hasAnyPermission,
  hasAnyPermissionForRole,
  hasPermission,
  hasPermissionForRole,
  permissionsForRole,
  type TenantPermission,
} from "./tenant-permissions";
export { hasPermission as canRenderAction } from "./tenant-permissions";
export { canAccessTenantPath as canAccessRoute } from "./tenant-route-access";
export type { WorkspaceAdminSection } from "./tenant-route-access";
export {
  canAccessTenantPath,
  canAccessTenantNavTarget,
  canAccessWorkspaceAdminSection,
  redirectPathForDeniedTenantRoute,
  defaultTenantHomePath,
} from "./tenant-route-access";

/** Ürün yüzeyi: SaaS operatörü vs kiracı uygulaması */
export type AppSurface = "platform" | "tenant";

export function getAppSurface(auth: AdminAuth): AppSurface {
  return auth.user.platformAdmin ? "platform" : "tenant";
}

export function defaultHomePath(auth: AdminAuth): string {
  return getAppSurface(auth) === "platform" ? "/platform/dashboard" : defaultTenantHomePath(resolveTenantAppRole(auth));
}

/** Ham API rolü (`membership.role`) */
export function tenantMembershipRole(auth: AdminAuth): string {
  return auth.membership?.role?.trim() || "tenant_operator";
}

/** Mağaza / organizasyon ayarları (General) — owner veya manager */
export function canManageTenantOrg(auth: AdminAuth): boolean {
  if (auth.user.platformAdmin || !auth.tenant) return false;
  const k = resolveTenantAppRole(auth);
  return k === "owner" || k === "manager";
}

/** Workspace Administration girişi — owner, manager veya ops (mesajlaşma sekmesi) */
export function canAccessWorkspaceAdmin(auth: AdminAuth): boolean {
  if (auth.user.platformAdmin || !auth.tenant) return false;
  const k = resolveTenantAppRole(auth);
  return k === "owner" || k === "manager" || k === "ops";
}

/** Faturalama / plan — yalnızca owner */
export function canViewTenantBilling(auth: AdminAuth): boolean {
  if (auth.user.platformAdmin || !auth.tenant) return false;
  return resolveTenantAppRole(auth) === "owner";
}
