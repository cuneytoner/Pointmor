export {
  TENANT_MEMBERSHIP_ROLES,
  TENANT_PERMISSIONS,
  type TenantAppRole,
  type TenantPermission,
  hasAnyPermissionForRole,
  hasPermissionForRole,
  permissionsForRole,
  resolveTenantAppRoleFromMembership,
} from "./rbac-config.js";
