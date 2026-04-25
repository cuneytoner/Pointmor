import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";
import { hasPermissionForRole, resolveTenantAppRoleFromMembership, type TenantPermission } from "@pointmor/rbac";
import { prisma } from "./prisma.js";

export async function requirePlatformAdmin(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  void _reply;
  const s = req.authSession as SessionPayload | undefined;
  if (!s?.user.platformAdmin) {
    const err = Object.assign(new Error("platform_admin_required"), {
      statusCode: 403,
    });
    throw err;
  }
}

export function canAccessTenant(
  session: SessionPayload,
  tenantId: string,
): boolean {
  if (session.user.platformAdmin) return true;
  if (session.tenant?.id === tenantId) return true;
  return (session.memberships ?? []).some((m) => m.tenant.id === tenantId);
}

type RequireTenantAccessUser = {
  id: string;
  platformAdmin: boolean;
};

type RequireTenantAccessOptions = {
  permission?: TenantPermission;
  moduleName?: string;
};

/**
 * TenantMembership is the source of truth for tenant-scoped runtime access.
 */
export async function requireTenantAccess(
  user: RequireTenantAccessUser,
  tenantId: string,
  options: RequireTenantAccessOptions = {},
): Promise<{
  ok: boolean;
  error?: "forbidden" | "permission_denied" | "module_not_active";
  membershipRole?: string;
}> {
  if (user.platformAdmin) {
    return { ok: true, membershipRole: "platform_admin" };
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId,
      },
    },
    select: {
      role: true,
    },
  });
  if (!membership) {
    return { ok: false, error: "forbidden" };
  }

  if (options.permission) {
    const appRole = resolveTenantAppRoleFromMembership(membership.role);
    if (!hasPermissionForRole(appRole, options.permission)) {
      return { ok: false, error: "permission_denied" };
    }
  }

  if (options.moduleName) {
    const activeModule = await prisma.tenantModule.findFirst({
      where: {
        tenantId,
        isActive: true,
        module: { name: options.moduleName },
      },
      select: { id: true },
    });
    if (!activeModule) {
      return { ok: false, error: "module_not_active" };
    }
  }

  return { ok: true, membershipRole: membership.role };
}
