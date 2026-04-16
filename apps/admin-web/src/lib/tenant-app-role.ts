import type { AdminAuth } from "../hooks/useAdminData";

/**
 * API `membership.role` ham string’leri — backend ile aynı isimler kullanılmalı.
 * Seed’de şimdilik çoğunlukla `tenant_operator`; yeni kiracı rolleri eklendikçe buraya eklenir.
 */
export const TENANT_MEMBERSHIP_ROLES = {
  owner: "tenant_owner",
  admin: "tenant_admin",
  manager: "tenant_manager",
  operator: "tenant_operator",
  staff: "tenant_staff",
  ops: "tenant_ops",
  marketing: "tenant_marketing",
  viewer: "viewer",
} as const;

/**
 * Ürün davranışı için normalize edilmiş kiracı rolü (RBAC / navigasyon).
 */
export type TenantAppRole = "owner" | "manager" | "staff" | "ops" | "viewer";

/** Ham API rolünü ürün rolüne çevir (geriye dönük uyumlu). */
export function resolveTenantAppRole(auth: AdminAuth): TenantAppRole {
  if (auth.user.platformAdmin || !auth.tenant) return "viewer";
  const raw = auth.membership?.role?.trim() || TENANT_MEMBERSHIP_ROLES.operator;

  switch (raw) {
    case TENANT_MEMBERSHIP_ROLES.owner:
    case TENANT_MEMBERSHIP_ROLES.admin:
      return "owner";
    case TENANT_MEMBERSHIP_ROLES.manager:
      return "manager";
    case TENANT_MEMBERSHIP_ROLES.staff:
      return "staff";
    case TENANT_MEMBERSHIP_ROLES.ops:
    case TENANT_MEMBERSHIP_ROLES.marketing:
      return "ops";
    case TENANT_MEMBERSHIP_ROLES.viewer:
      return "viewer";
    case TENANT_MEMBERSHIP_ROLES.operator:
    default:
      return "manager";
  }
}
