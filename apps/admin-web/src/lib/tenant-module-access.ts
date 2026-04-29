import { hasPermissionForRole } from "@pointmor/rbac";
import type { AdminAuth, AdminBootstrap } from "../hooks/useAdminData";
import { resolveTenantAppRole } from "./tenant-app-role";
import { matchesProductRoute, PRODUCT_REGISTRY } from "./productRegistry";

type BootstrapLike = Pick<AdminBootstrap, "tenantModules" | "tenants"> | null | undefined;

export function activeTenantModules(
  bootstrap: BootstrapLike,
  tenantId: string | null | undefined,
): Set<string> {
  if (!tenantId) return new Set<string>();
  const set = new Set<string>();
  for (const row of bootstrap?.tenantModules ?? []) {
    const moduleName = (row.module?.name ?? "").trim().toLowerCase();
    if (!moduleName) continue;
    if (row.tenantId === tenantId && row.isActive === true) set.add(moduleName);
  }
  return set;
}

export function isAdvisorTenant(
  auth: AdminAuth | null | undefined,
  bootstrap: BootstrapLike,
): boolean {
  const tenantId = auth?.tenant?.id;
  if (!tenantId) return false;
  const tenant = (bootstrap?.tenants ?? []).find((t) => t.id === tenantId);
  return tenant?.type === "ADVISOR";
}

export function canAccessLoyaltySurface(
  auth: AdminAuth | null | undefined,
  bootstrap: BootstrapLike,
): boolean {
  if (!auth?.tenant || auth.user.platformAdmin) return false;
  return activeTenantModules(bootstrap, auth.tenant.id).has(PRODUCT_REGISTRY.loyalty.moduleName);
}

export function canAccessAiActSurface(
  auth: AdminAuth | null | undefined,
  bootstrap: BootstrapLike,
): boolean {
  if (!auth?.tenant || auth.user.platformAdmin) return false;
  const modules = activeTenantModules(bootstrap, auth.tenant.id);
  if (!modules.has(PRODUCT_REGISTRY.ai_act.moduleName)) return false;
  const role = resolveTenantAppRole(auth);
  return (
    hasPermissionForRole(role, "ai_act.view") ||
    hasPermissionForRole(role, "ai_act.assess") ||
    hasPermissionForRole(role, "ai_act.manage")
  );
}

export function isLoyaltyPath(pathname: string): boolean {
  return matchesProductRoute(pathname, "loyalty");
}

export function isAiActPath(pathname: string): boolean {
  return matchesProductRoute(pathname, "ai_act");
}

