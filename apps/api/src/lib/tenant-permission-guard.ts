import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";
import { TENANT_PERMISSIONS, type TenantPermission } from "./tenant-permissions.js";
import { hasPermissionForSession } from "./tenant-permissions.js";
import { requireTenantAccess } from "./guards.js";

const KNOWN_PERMISSION_SET = new Set<string>(TENANT_PERMISSIONS as readonly string[]);

const MODULE_SCOPED_PERMISSION_SET = new Set<string>([
  "customers.view",
  "customers.create",
  "visits.view",
  "visits.create",
  "rewards.view",
  "rewards.manage",
  "campaigns.view",
  "campaigns.manage",
  "redemptions.view",
  "redemptions.create",
  "redemptions.approve",
  "redemptions.reject",
  "menu.view",
  "menu.manage",
  "analytics.view",
  "automation.run",
  "ai.systems.view",
  "ai.systems.manage",
  "ai.assessment.manage",
  "ai.results.view",
]);

const MODULE_BY_PERMISSION = new Map<string, string>([
  ["customers.view", "cafe"],
  ["customers.create", "cafe"],
  ["visits.view", "cafe"],
  ["visits.create", "cafe"],
  ["rewards.view", "cafe"],
  ["rewards.manage", "cafe"],
  ["campaigns.view", "cafe"],
  ["campaigns.manage", "cafe"],
  ["redemptions.view", "cafe"],
  ["redemptions.create", "cafe"],
  ["redemptions.approve", "cafe"],
  ["redemptions.reject", "cafe"],
  ["menu.view", "cafe"],
  ["menu.manage", "cafe"],
  ["analytics.view", "cafe"],
  ["automation.run", "cafe"],
  ["ai.systems.view", "ai_act"],
  ["ai.systems.manage", "ai_act"],
  ["ai.assessment.manage", "ai_act"],
  ["ai.results.view", "ai_act"],
]);

for (const permission of MODULE_SCOPED_PERMISSION_SET) {
  if (!MODULE_BY_PERMISSION.has(permission)) {
    throw new Error(`permission_without_module_mapping:${permission}`);
  }
}

type PermissionContract = {
  known: boolean;
  moduleName?: string;
};

function resolvePermissionContract(
  permission: string,
  options?: {
    moduleScopedPermissions?: ReadonlySet<string>;
    moduleByPermission?: ReadonlyMap<string, string>;
  },
): PermissionContract {
  const moduleScopedPermissions = options?.moduleScopedPermissions ?? MODULE_SCOPED_PERMISSION_SET;
  const moduleByPermission = options?.moduleByPermission ?? MODULE_BY_PERMISSION;
  const known = KNOWN_PERMISSION_SET.has(permission);
  if (!known) {
    return { known: false };
  }
  if (moduleScopedPermissions.has(permission)) {
    const moduleName = moduleByPermission.get(permission);
    if (!moduleName) {
      throw new Error(`permission_without_module_mapping:${permission}`);
    }
    return { known: true, moduleName };
  }
  return { known: true };
}

function denyPermissionContract(
  req: FastifyRequest,
  error: string,
): void {
  req.log.error({ error }, "permission_contract_violation");
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
    let contract: PermissionContract;
    try {
      contract = resolvePermissionContract(permission);
    } catch (err) {
      const code = (err as Error).message.split(":")[0] || "permission_without_module_mapping";
      denyPermissionContract(req, (err as Error).message);
      await reply.code(403).send({ error: code });
      return;
    }
    if (!contract.known) {
      denyPermissionContract(req, `unknown_permission:${String(permission)}`);
      await reply.code(403).send({ error: "permission_denied" });
      return;
    }
    const access = await requireTenantAccess(s.user, s.tenant.id, {
      permission,
      moduleName: contract.moduleName,
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
    for (const permission of permissions) {
      let contract: PermissionContract;
      try {
        contract = resolvePermissionContract(permission);
      } catch (err) {
        const code = (err as Error).message.split(":")[0] || "permission_without_module_mapping";
        denyPermissionContract(req, (err as Error).message);
        await reply.code(403).send({ error: code });
        return;
      }
      if (!contract.known) {
        denyPermissionContract(req, `unknown_permission:${String(permission)}`);
        await reply.code(403).send({ error: "permission_denied" });
        return;
      }
      const access = await requireTenantAccess(s.user, s.tenant.id, {
        permission,
        moduleName: contract.moduleName,
      });
      if (!access.ok) {
        await reply.code(403).send({ error: access.error ?? "permission_denied" });
        return;
      }
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
    let sawModuleNotActive = false;
    for (const permission of permissions) {
      let contract: PermissionContract;
      try {
        contract = resolvePermissionContract(permission);
      } catch (err) {
        const code = (err as Error).message.split(":")[0] || "permission_without_module_mapping";
        denyPermissionContract(req, (err as Error).message);
        await reply.code(403).send({ error: code });
        return;
      }
      if (!contract.known) {
        denyPermissionContract(req, `unknown_permission:${String(permission)}`);
        continue;
      }
      const access = await requireTenantAccess(s.user, s.tenant.id, {
        permission,
        moduleName: contract.moduleName,
      });
      if (access.ok) {
        return;
      }
      if (access.error === "module_not_active") {
        sawModuleNotActive = true;
      }
    }
    await reply.code(403).send({
      error: sawModuleNotActive ? "module_not_active" : "permission_denied",
    });
  };
}

export { requireTenantPermission as requirePermission };
export { resolvePermissionContract };
export function __testOnly_deleteModuleMapping(permission: string): void {
  MODULE_BY_PERMISSION.delete(permission);
}
export function __testOnly_setModuleMapping(permission: string, moduleName: string): void {
  MODULE_BY_PERMISSION.set(permission, moduleName);
}
