import type { SessionPayload } from "./auth-memory.js";
import {
  TENANT_PERMISSIONS,
  hasPermissionForRole,
  permissionsForRole,
  type TenantPermission,
} from "@pointmor/rbac";
import { resolveTenantAppRole } from "./tenant-app-role.js";

export { TENANT_PERMISSIONS, hasPermissionForRole, permissionsForRole, type TenantPermission };

export function hasPermissionForSession(session: SessionPayload, permission: TenantPermission): boolean {
  if (!session.tenant || session.user.platformAdmin) return false;
  return hasPermissionForRole(resolveTenantAppRole(session), permission);
}
