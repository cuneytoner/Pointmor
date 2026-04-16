import type { SessionPayload } from "./auth-memory.js";

/** API `membership.role` — admin-web `tenant-app-role.ts` ile senkron tutulmalı. */
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

export function resolveTenantAppRole(session: SessionPayload): TenantAppRole {
  if (session.user.platformAdmin || !session.tenant) return "viewer";
  const raw = session.membership?.role?.trim() || TENANT_MEMBERSHIP_ROLES.operator;

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
