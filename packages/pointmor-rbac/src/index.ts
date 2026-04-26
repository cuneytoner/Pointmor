export {
  TENANT_MEMBERSHIP_ROLES,
  TENANT_PERMISSIONS,
  type TenantAppRole,
  type TenantPermission,
  hasAnyPermissionForRole,
  hasPermissionForMembershipRole,
  hasPermissionForRole,
  permissionsForRole,
  resolveTenantAppRoleFromMembership,
} from "./rbac-config.js";
