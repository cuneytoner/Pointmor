import type { AdminAuth } from "../hooks/useAdminData";
import {
  TENANT_MEMBERSHIP_ROLES,
  resolveTenantAppRoleFromMembership,
  type TenantAppRole,
} from "@pointmor/rbac";

export { TENANT_MEMBERSHIP_ROLES, type TenantAppRole };

/** Ham API rolünü ürün rolüne çevir (geriye dönük uyumlu). */
export function resolveTenantAppRole(auth: AdminAuth): TenantAppRole {
  if (auth.user.platformAdmin || !auth.tenant) return "viewer";
  return resolveTenantAppRoleFromMembership(auth.membership?.role);
}
