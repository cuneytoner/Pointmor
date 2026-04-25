import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";
import type { TenantPermission } from "./tenant-permissions.js";
import { hasPermissionForSession } from "./tenant-permissions.js";
import { requireTenantAccess } from "./guards.js";

function moduleNameForPermission(permission: TenantPermission): string | undefined {
  if (
    permission.startsWith("customers.")
    || permission.startsWith("visits.")
    || permission.startsWith("rewards.")
    || permission.startsWith("campaigns.")
    || permission.startsWith("redemptions.")
    || permission.startsWith("menu.")
    || permission.startsWith("analytics.")
    || permission === "automation.run"
  ) {
    return "cafe";
  }
  return undefined;
}

/** Senkron servis kodu: izin yoksa hata fırlatır. */
export function assertPermission(session: SessionPayload, permission: TenantPermission): void {
  if (!session.tenant?.id) throw new Error("tenant_context_required");
  if (session.user.platformAdmin) throw new Error("tenant_context_required");
  if (!hasPermissionForSession(session, permission)) throw new Error("permission_denied");
}

/**
 * Kiracı oturumunda belirtilen izin yoksa 403 `permission_denied`.
 * `authPreHandler` sonrası kullanılmalı.
 */
export function requireTenantPermission(permission: TenantPermission) {
  return async function tenantPermissionGuard(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const s = req.authSession as SessionPayload | undefined;
    if (!s?.tenant?.id) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    if (s.user.platformAdmin) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    const access = await requireTenantAccess(s.user, s.tenant.id, {
      permission,
      moduleName: moduleNameForPermission(permission),
    });
    if (!access.ok) {
      await reply.code(403).send({ error: access.error ?? "permission_denied" });
    }
  };
}

/** Tüm izinler gerekli (AND). */
export function requireTenantPermissions(...permissions: TenantPermission[]) {
  return async function tenantPermissionsGuard(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const s = req.authSession as SessionPayload | undefined;
    if (!s?.tenant?.id) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    if (s.user.platformAdmin) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    if (!permissions.every((p) => hasPermissionForSession(s, p))) {
      await reply.code(403).send({ error: "permission_denied" });
    }
  };
}

/** En az bir izin (OR). */
export function requireAnyTenantPermission(...permissions: TenantPermission[]) {
  return async function tenantPermissionOrGuard(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const s = req.authSession as SessionPayload | undefined;
    if (!s?.tenant?.id) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    if (s.user.platformAdmin) {
      await reply.code(403).send({ error: "tenant_context_required" });
      return;
    }
    if (!permissions.some((p) => hasPermissionForSession(s, p))) {
      await reply.code(403).send({ error: "permission_denied" });
    }
  };
}

export { requireTenantPermission as requirePermission };
