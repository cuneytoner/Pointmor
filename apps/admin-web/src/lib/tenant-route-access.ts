import type { AdminAuth } from "../hooks/useAdminData";
import { resolveTenantAppRole, type TenantAppRole } from "./tenant-app-role";
import { hasPermissionForRole, type TenantPermission } from "./tenant-permissions";

export type WorkspaceAdminSection = "general" | "team" | "messaging" | "billing" | "locations";

function normPath(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "");
  return p;
}

/** Rol için varsayılan giriş (staff → kasa müşteri akışı). */
export function defaultTenantHomePath(role: TenantAppRole): string {
  if (role === "staff") return "/app/customers";
  return "/app/dashboard";
}

/** Yetkisiz route için güvenli yönlendirme (sessiz, teknik mesaj yok). */
export function redirectPathForDeniedTenantRoute(pathname: string, auth: AdminAuth): string {
  const role = resolveTenantAppRole(auth);
  const p = normPath(pathname);

  if (p.startsWith("/app/admin")) {
    if (role === "ops") return "/app/admin/messaging";
    if (role === "owner" || role === "manager") return "/app/admin/general";
    return defaultTenantHomePath(role);
  }

  return defaultTenantHomePath(role);
}

export function canAccessWorkspaceAdminSection(
  section: WorkspaceAdminSection,
  auth: AdminAuth,
): boolean {
  const role = resolveTenantAppRole(auth);
  const can = (permission: TenantPermission) => hasPermissionForRole(role, permission);
  switch (section) {
    case "billing":
      return can("billing.manage");
    case "general":
      return can("settings.manage");
    case "team":
      return can("team.manage");
    case "messaging":
      return can("messaging.manage");
    case "locations":
      return can("settings.manage");
    default:
      return false;
  }
}

/** Ana sidebar `to` hedefi bu role görünür mü? (`/app/admin/general` vb.) */
export function canAccessTenantNavTarget(to: string, auth: AdminAuth): boolean {
  const role = resolveTenantAppRole(auth);
  const can = (permission: TenantPermission) => hasPermissionForRole(role, permission);
  const t = normPath(to);

  if (t === "/app/admin" || t === "/app/admin/") {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/admin/")) {
    if (role === "staff" || role === "viewer") return false;
    const seg = t.replace(/^\/app\/admin\/?/, "").split("/")[0] || "";
    if (seg === "general") return canAccessWorkspaceAdminSection("general", auth);
    if (seg === "team") return canAccessWorkspaceAdminSection("team", auth);
    if (seg === "messaging") return canAccessWorkspaceAdminSection("messaging", auth);
    if (seg === "billing") return canAccessWorkspaceAdminSection("billing", auth);
    if (seg === "locations") return canAccessWorkspaceAdminSection("locations", auth);
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/hq")) {
    return can("analytics.view") && role !== "staff";
  }

  if (t === "/app/dashboard" || t.startsWith("/app/dashboard")) {
    return can("analytics.view");
  }
  if (t.startsWith("/app/audit")) {
    return can("summary.export") || can("audit.export");
  }
  if (t.startsWith("/app/growth")) {
    return can("analytics.view") && role !== "staff";
  }
  if (t.startsWith("/app/customers")) {
    return can("customers.create");
  }
  if (t.startsWith("/app/visits")) {
    return can("visits.create");
  }
  if (t.startsWith("/app/rewards")) {
    return can("rewards.manage");
  }
  if (t.startsWith("/app/campaigns")) {
    return can("campaigns.manage");
  }
  if (t.startsWith("/app/menu")) {
    return can("menu.manage");
  }
  if (t.startsWith("/app/redemptions")) {
    return can("redemptions.view");
  }

  return true;
}

/**
 * Tam URL path için erişim (route guard). Özellik bayrakları burada işlenmez — AdminShell’de kalır.
 */
export function canAccessTenantPath(pathname: string, auth: AdminAuth): boolean {
  if (!auth.tenant || auth.user.platformAdmin) return true;
  const role = resolveTenantAppRole(auth);
  const can = (permission: TenantPermission) => hasPermissionForRole(role, permission);
  const p = normPath(pathname);

  if (!p.startsWith("/app")) return true;

  if (p === "/app/billing") {
    return canAccessWorkspaceAdminSection("billing", auth);
  }
  if (p === "/app/settings") {
    return canAccessWorkspaceAdminSection("general", auth);
  }
  if (p === "/app/messaging") {
    return canAccessWorkspaceAdminSection("messaging", auth);
  }

  if (p === "/app/admin" || p === "/app/admin/") {
    return role === "owner" || role === "manager" || role === "ops";
  }

  if (p.startsWith("/app/admin")) {
    if (role === "staff" || role === "viewer") return false;
    const seg = p.replace(/^\/app\/admin\/?/, "").split("/")[0] || "";
    if (seg === "billing") return canAccessWorkspaceAdminSection("billing", auth);
    if (seg === "general") return canAccessWorkspaceAdminSection("general", auth);
    if (seg === "team") return canAccessWorkspaceAdminSection("team", auth);
    if (seg === "messaging") return canAccessWorkspaceAdminSection("messaging", auth);
    if (seg === "locations") return canAccessWorkspaceAdminSection("locations", auth);
    return role === "owner" || role === "manager" || role === "ops";
  }

  if (p.startsWith("/app/hq")) {
    return can("analytics.view") && role !== "staff";
  }

  if (p.startsWith("/app/customers")) return can("customers.create");
  if (p.startsWith("/app/visits")) return can("visits.create");
  if (p.startsWith("/app/redemptions")) return can("redemptions.view");
  if (p.startsWith("/app/rewards")) return can("rewards.manage");
  if (p.startsWith("/app/campaigns")) return can("campaigns.manage");
  if (p.startsWith("/app/menu")) return can("menu.manage");
  if (p.startsWith("/app/growth")) return can("analytics.view") && role !== "staff";
  if (p.startsWith("/app/audit")) return can("summary.export") || can("audit.export");
  if (p === "/app/dashboard" || p.startsWith("/app/dashboard")) return can("analytics.view");

  return true;
}
