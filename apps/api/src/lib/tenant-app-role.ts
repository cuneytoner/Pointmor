import type { SessionPayload } from "./auth-memory.js";
import {
  TENANT_MEMBERSHIP_ROLES,
  resolveTenantAppRoleFromMembership,
  type TenantAppRole,
} from "@pointmor/rbac";

export { TENANT_MEMBERSHIP_ROLES, type TenantAppRole };

export function resolveTenantAppRole(session: SessionPayload): TenantAppRole {
  if (session.user.platformAdmin || !session.tenant) return "viewer";
  return resolveTenantAppRoleFromMembership(session.membership?.role);
}
