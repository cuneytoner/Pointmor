import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { loadAiComplianceOperationsForScope } from "../lib/ai-compliance-operations.js";

/**
 * Admin product-specific operational endpoints.
 *
 * These endpoints split operational data out of /admin/bootstrap to reduce
 * payload size and enable product-specific access controls.
 */

export async function registerAdminProductOperationsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/products/ai-compliance/operations
   *
   * Returns AI Compliance operational data.
   *
   * Scope behavior:
   * - Platform admin/operator: Cross-organization AI Compliance operational data for
   *   all tenants with active ai_act module.
   * - Tenant user: Only their accessible tenant scope (requires ai_act module active
   *   and ai_act.view permission).
   * - Loyalty-only / cafe-only tenant: Returns empty/zero data (no ai_act module).
   *
   * Errors:
   * - 401 unauthorized: No valid session
   * - 403 permission_denied: User lacks ai_act.view permission
   * - 403 module_not_active: ai_act module is not active for this tenant
   */
  app.get(
    "/admin/products/ai-compliance/operations",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;

      // Platform admin: cross-organization access without tenant context
      if (s.user.platformAdmin) {
        const operations = await loadAiComplianceOperationsForScope({ mode: "platform_admin" });
        return { aiCompliance: operations };
      }

      // Regular tenant user: must have tenant context
      const tenantId = s.tenant?.id;
      if (!tenantId) {
        return reply.code(403).send({ error: "tenant_context_required" });
      }

      // Verify tenant access, permission, and module activation
      const access = await requireTenantAccess(s.user, tenantId, {
        permission: "ai_act.view",
        moduleName: "ai_act",
      });

      if (!access.ok) {
        return reply.code(403).send({ error: access.error ?? "permission_denied" });
      }

      // Load tenant-scoped AI Compliance operations
      const operations = await loadAiComplianceOperationsForScope({
        mode: "tenant",
        tenantId,
      });

      return { aiCompliance: operations };
    },
  );
}
