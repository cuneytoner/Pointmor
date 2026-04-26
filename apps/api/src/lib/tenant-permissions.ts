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
  // Policy decision: ADVISOR can run AI Act assessment where membership exists.
  if (session.membership?.role === "ADVISOR" && permission === "ai_act.assess") return true;
  return hasPermissionForRole(resolveTenantAppRole(session), permission);
}
