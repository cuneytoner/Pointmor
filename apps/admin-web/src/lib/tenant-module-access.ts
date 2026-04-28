import { hasPermissionForRole } from "@pointmor/rbac";
import type { AdminAuth, AdminBootstrap } from "../hooks/useAdminData";
import { resolveTenantAppRole } from "./tenant-app-role";

type BootstrapLike = Pick<AdminBootstrap, "tenantModules" | "tenants"> | null | undefined;

export function activeTenantModules(
  bootstrap: BootstrapLike,
  tenantId: string | null | undefined,
): Set<string> {
  if (!tenantId) return new Set<string>();
  const set = new Set<string>();
  for (const row of bootstrap?.tenantModules ?? []) {
    if (row.tenantId === tenantId && row.isActive) set.add(row.module.name);
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
  return activeTenantModules(bootstrap, auth.tenant.id).has("cafe");
}

export function canAccessAiActSurface(
  auth: AdminAuth | null | undefined,
  bootstrap: BootstrapLike,
): boolean {
  if (!auth?.tenant || auth.user.platformAdmin) return false;
  const modules = activeTenantModules(bootstrap, auth.tenant.id);
  if (!modules.has("ai_act")) return false;
  const role = resolveTenantAppRole(auth);
  return (
    hasPermissionForRole(role, "ai_act.view") ||
    hasPermissionForRole(role, "ai_act.assess") ||
    hasPermissionForRole(role, "ai_act.manage")
  );
}

export function isLoyaltyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/app/customers") ||
    pathname.startsWith("/app/visits") ||
    pathname.startsWith("/app/rewards") ||
    pathname.startsWith("/app/campaigns") ||
    pathname.startsWith("/app/menu") ||
    pathname.startsWith("/app/redemptions")
  );
}

export function isAiActPath(pathname: string): boolean {
  return pathname.startsWith("/app/ai-act");
}

