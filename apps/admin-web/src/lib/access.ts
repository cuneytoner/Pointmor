import type { AdminAuth } from "../hooks/useAdminData";

/** Ürün yüzeyi: SaaS operatörü vs kiracı uygulaması */
export type AppSurface = "platform" | "tenant";

export function getAppSurface(auth: AdminAuth): AppSurface {
  return auth.user.platformAdmin ? "platform" : "tenant";
}

export function defaultHomePath(auth: AdminAuth): string {
  return getAppSurface(auth) === "platform" ? "/platform/dashboard" : "/app/dashboard";
}

/** Kiracı API rolü (membership.role); seed: platform_admin | tenant_operator */
export function tenantMembershipRole(auth: AdminAuth): string {
  return auth.membership?.role?.trim() || "tenant_operator";
}

/** Organizasyon ayarları (ileride tenant_viewer için kısıtlanabilir) */
export function canManageTenantOrg(auth: AdminAuth): boolean {
  if (auth.user.platformAdmin) return false;
  const r = tenantMembershipRole(auth);
  return r === "tenant_admin" || r === "tenant_operator";
}
