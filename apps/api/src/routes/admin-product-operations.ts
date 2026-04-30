import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { requireTenantAccess } from "../lib/guards.js";
import { prisma } from "../lib/prisma.js";

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
   * Returns AI Compliance operational data for the current tenant context.
   * Requires: authenticated user, tenant membership, ai_act.view permission, ai_act module active.
   *
   * Errors:
   * - 401 unauthorized: No valid session
   * - 403 tenant_context_required: No tenant in session or platform admin without tenant context
   * - 403 permission_denied: User lacks ai_act.view permission
   * - 403 module_not_active: ai_act module is not active for this tenant
   */
  app.get(
    "/admin/products/ai-compliance/operations",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;

      // Resolve tenant context
      const tenantId = s.tenant?.id;
      if (!tenantId) {
        return reply.code(403).send({ error: "tenant_context_required" });
      }

      // Platform admin cross-organization visibility is handled by requireTenantAccess
      // If platform admin, they still need to be within a tenant context for module-scoped data
      // Module activation check is enforced by requireTenantPermission guard

      // Verify tenant access and module activation explicitly (defense in depth)
      const access = await requireTenantAccess(s.user, tenantId, {
        permission: "ai_act.view",
        moduleName: "ai_act",
      });

      if (!access.ok) {
        return reply.code(403).send({ error: access.error ?? "permission_denied" });
      }

      // Build tenant filter for queries
      const tenantFilter = { tenantId };

      // Fetch AI Compliance operational data (same queries as bootstrap, scoped to single tenant)
      const [
        aiActiveOrganization,
        aiAssessmentsCompleted,
        aiPendingReviews,
        aiOpenObligations,
        aiSystemsNeedingReview,
        aiOverdueObligations,
        aiEscalatedAssessments,
        aiAdvisorWorkload,
        aiEvidenceBacklog,
        aiSystems,
      ] = await Promise.all([
        // Active organization check (module active for this tenant)
        prisma.tenantModule.findFirst({
          where: { tenantId, isActive: true, module: { name: "ai_act" } },
          select: { id: true },
        }),
        prisma.aiAssessment.count({
          where: { ...tenantFilter, status: "COMPLETED" },
        }),
        prisma.aiAssessment.count({
          where: { ...tenantFilter, status: "DRAFT" },
        }),
        prisma.aiObligation.count({
          where: { ...tenantFilter, status: "PENDING" },
        }),
        prisma.aiAssessment.count({
          where: { ...tenantFilter, status: "DRAFT" },
        }),
        prisma.aiObligation.count({
          where: {
            ...tenantFilter,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: {
              lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.aiAssessment.count({
          where: {
            ...tenantFilter,
            status: "DRAFT",
            updatedAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.aiTask.count({
          where: {
            ...tenantFilter,
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        }),
        prisma.aiAssessment.count({
          where: {
            ...tenantFilter,
            status: "COMPLETED",
            riskLevel: { in: ["HIGH", "UNACCEPTABLE", "PROHIBITED"] },
          },
        }),
        prisma.aiSystem.findMany({
          where: tenantFilter,
          orderBy: { updatedAt: "desc" },
          take: 250,
          include: {
            tenant: { select: { id: true, name: true, slug: true, type: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            assessments: {
              where: { isCurrent: true },
              take: 1,
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                status: true,
                riskLevel: true,
                createdAt: true,
                updatedAt: true,
                createdBy: { select: { id: true, name: true, email: true } },
              },
            },
            obligations: {
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                obligationType: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            tasks: {
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                createdAt: true,
                updatedAt: true,
                assignedTo: { select: { id: true, name: true, email: true } },
              },
            },
            _count: {
              select: { evidences: true },
            },
          },
        }),
      ]);

      const operations = {
        activeOrganizations: aiActiveOrganization ? 1 : 0,
        assessmentsCompleted: aiAssessmentsCompleted,
        pendingReviews: aiPendingReviews,
        openObligations: aiOpenObligations,
        systemsNeedingReview: aiSystemsNeedingReview,
        overdueObligations: aiOverdueObligations,
        escalatedAssessments: aiEscalatedAssessments,
        advisorWorkload: aiAdvisorWorkload,
        evidenceBacklog: aiEvidenceBacklog,
        systems: aiSystems.map((row) => ({
          id: row.id,
          name: row.name,
          purpose: row.purpose,
          providerType: row.providerType,
          status: row.status,
          updatedAt: row.updatedAt,
          tenant: row.tenant,
          createdBy: row.createdBy,
          currentAssessment: row.assessments[0]
            ? {
                id: row.assessments[0].id,
                status: row.assessments[0].status,
                riskLevel: row.assessments[0].riskLevel,
                createdAt: row.assessments[0].createdAt,
                updatedAt: row.assessments[0].updatedAt,
                createdBy: row.assessments[0].createdBy,
              }
            : null,
          obligations: row.obligations,
          tasks: row.tasks,
          evidencesCount: row._count.evidences,
        })),
      };

      return { aiCompliance: operations };
    },
  );
}
