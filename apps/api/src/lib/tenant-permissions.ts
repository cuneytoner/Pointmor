import type { SessionPayload } from "./auth-memory.js";
import {
  TENANT_PERMISSIONS,
  hasPermissionForMembershipRole,
  hasPermissionForRole,
  permissionsForRole,
  type TenantPermission,
} from "@pointmor/rbac";

export { TENANT_PERMISSIONS, hasPermissionForRole, permissionsForRole, type TenantPermission };

export function hasPermissionForSession(session: SessionPayload, permission: TenantPermission): boolean {
  if (!session.tenant || session.user.platformAdmin) return false;
  return hasPermissionForMembershipRole(session.membership?.role, permission);
}
