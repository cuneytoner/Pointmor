import { useCallback, useMemo } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  hasAnyPermission,
  hasPermission as hasPermissionFn,
  permissionsForRole,
  type TenantPermission,
} from "../lib/tenant-permissions";
import { resolveTenantAppRole, type TenantAppRole } from "../lib/tenant-app-role";

/**
 * Kiracı izinleri — `hasPermission("rewards.manage")` vb.
 */
export function usePermissions() {
  const { auth } = useAdminDataContext();
  const role = useMemo(() => (auth?.tenant && !auth.user.platformAdmin ? resolveTenantAppRole(auth) : null), [auth]);

  const hasPermission = useCallback(
    (permission: TenantPermission) => hasPermissionFn(auth, permission),
    [auth],
  );

  const hasAny = useCallback(
    (permissions: TenantPermission[]) => hasAnyPermission(auth, permissions),
    [auth],
  );

  const set = useMemo(() => (role ? permissionsForRole(role) : new Set<TenantPermission>()), [role]);

  return {
    role: role as TenantAppRole | null,
    hasPermission,
    hasAny,
    permissions: set,
  };
}
