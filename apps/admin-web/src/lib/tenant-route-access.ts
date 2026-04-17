import type { AdminAuth } from "../hooks/useAdminData";
import { resolveTenantAppRole, type TenantAppRole } from "./tenant-app-role";

export type WorkspaceAdminSection = "general" | "team" | "messaging" | "billing";

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
  switch (section) {
    case "billing":
      return role === "owner";
    case "general":
      return role === "owner" || role === "manager";
    case "team":
      return role === "owner" || role === "manager";
    case "messaging":
      return role === "owner" || role === "manager" || role === "ops";
    default:
      return false;
  }
}

/** Ana sidebar `to` hedefi bu role görünür mü? (`/app/admin/general` vb.) */
export function canAccessTenantNavTarget(to: string, auth: AdminAuth): boolean {
  const role = resolveTenantAppRole(auth);
  const t = normPath(to);

  if (t === "/app/admin" || t === "/app/admin/") {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/admin/general")) {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner" || role === "manager";
  }
  if (t.startsWith("/app/admin/team")) {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner" || role === "manager";
  }
  if (t.startsWith("/app/admin/messaging")) {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/admin/billing")) {
    if (role === "staff" || role === "viewer") return false;
    return role === "owner";
  }

  if (t === "/app/dashboard" || t.startsWith("/app/dashboard")) {
    return role !== "staff";
  }
  if (t.startsWith("/app/audit")) {
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/growth")) {
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/customers")) {
    return role !== "viewer";
  }
  if (t.startsWith("/app/visits")) {
    return role === "owner" || role === "manager" || role === "staff";
  }
  if (t.startsWith("/app/rewards")) {
    return role === "owner" || role === "manager";
  }
  if (t.startsWith("/app/campaigns")) {
    return role === "owner" || role === "manager" || role === "ops";
  }
  if (t.startsWith("/app/menu")) {
    return role === "owner" || role === "manager";
  }
  if (t.startsWith("/app/redemptions")) {
    return role === "owner" || role === "manager" || role === "staff" || role === "ops";
  }

  return true;
}

/**
 * Tam URL path için erişim (route guard). Özellik bayrakları burada işlenmez — AdminShell’de kalır.
 */
export function canAccessTenantPath(pathname: string, auth: AdminAuth): boolean {
  if (!auth.tenant || auth.user.platformAdmin) return true;
  const role = resolveTenantAppRole(auth);
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
    return role === "owner" || role === "manager" || role === "ops";
  }

  if (p.startsWith("/app/customers")) return role !== "viewer";
  if (p.startsWith("/app/visits"))
    return role === "owner" || role === "manager" || role === "staff";
  if (p.startsWith("/app/redemptions"))
    return role === "owner" || role === "manager" || role === "staff" || role === "ops";
  if (p.startsWith("/app/rewards")) return role === "owner" || role === "manager";
  if (p.startsWith("/app/campaigns"))
    return role === "owner" || role === "manager" || role === "ops";
  if (p.startsWith("/app/menu")) return role === "owner" || role === "manager";
  if (p.startsWith("/app/growth")) return role === "owner" || role === "manager" || role === "ops";
  if (p.startsWith("/app/audit")) return role === "owner" || role === "manager" || role === "ops";
  if (p === "/app/dashboard" || p.startsWith("/app/dashboard")) return role !== "staff";

  return true;
}
