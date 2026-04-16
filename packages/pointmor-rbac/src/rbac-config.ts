/**
 * Pointmor kiracı RBAC — tek kaynak (admin-web + API bu modülü tüketir).
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

export type TenantAppRole = "owner" | "manager" | "staff" | "ops" | "viewer";

export const TENANT_PERMISSIONS = [
  "customers.view",
  "customers.create",
  "visits.view",
  "visits.create",
  "rewards.view",
  "rewards.manage",
  "redemptions.view",
  "redemptions.create",
  "redemptions.approve",
  "redemptions.reject",
  "campaigns.view",
  "campaigns.manage",
  "messaging.view",
  "messaging.manage",
  "settings.view",
  "settings.manage",
  "team.view",
  "team.manage",
  "billing.view",
  "billing.manage",
  "analytics.view",
  "menu.view",
  "menu.manage",
  "automation.run",
] as const;

export type TenantPermission = (typeof TENANT_PERMISSIONS)[number];

const ALL = new Set<TenantPermission>(TENANT_PERMISSIONS);

function permSet(...items: TenantPermission[]): Set<TenantPermission> {
  return new Set(items);
}

/** Rol → izin kümesi — tek doğruluk kaynağı. */
const PERMISSIONS_BY_ROLE: Record<TenantAppRole, Set<TenantPermission>> = {
  owner: ALL,
  manager: new Set(TENANT_PERMISSIONS.filter((p) => p !== "billing.manage")),
  staff: permSet(
    "customers.view",
    "customers.create",
    "visits.view",
    "visits.create",
    "rewards.view",
    "redemptions.view",
    "redemptions.create",
    "redemptions.approve",
    "redemptions.reject",
  ),
  ops: permSet(
    "customers.view",
    "settings.view",
    "campaigns.view",
    "campaigns.manage",
    "messaging.view",
    "messaging.manage",
    "analytics.view",
    "redemptions.view",
    "menu.view",
    "automation.run",
  ),
  viewer: permSet("customers.view", "analytics.view"),
};

export function permissionsForRole(role: TenantAppRole): Set<TenantPermission> {
  return PERMISSIONS_BY_ROLE[role];
}

export function hasPermissionForRole(role: TenantAppRole, permission: TenantPermission): boolean {
  return PERMISSIONS_BY_ROLE[role].has(permission);
}

export function hasAnyPermissionForRole(
  role: TenantAppRole,
  permissions: readonly TenantPermission[],
): boolean {
  return permissions.some((p) => hasPermissionForRole(role, p));
}

/** Ham `membership.role` → ürün rolü (platform oturumu burada işlenmez). */
export function resolveTenantAppRoleFromMembership(
  membershipRole: string | null | undefined,
  options?: { defaultWhenEmpty?: string },
): TenantAppRole {
  const fallback = options?.defaultWhenEmpty ?? TENANT_MEMBERSHIP_ROLES.operator;
  const raw = (membershipRole ?? "").trim() || fallback;

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
