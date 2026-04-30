import { prisma } from "./prisma.js";

/**
 * AI Compliance operational data scope configuration.
 */
export type AiComplianceScope =
  | { mode: "tenant"; tenantId: string }
  | { mode: "cross_org"; tenantIds: string[] }
  | { mode: "platform_admin" };

/**
 * AI Compliance operational data for a single tenant.
 */
export type AiComplianceTenantOperations = {
  activeOrganizations: number;
  assessmentsCompleted: number;
  pendingReviews: number;
  openObligations: number;
  systemsNeedingReview: number;
  overdueObligations: number;
  escalatedAssessments: number;
  advisorWorkload: number;
  evidenceBacklog: number;
  systems: Array<{
    id: string;
    name: string;
    purpose: string | null;
    providerType: string;
    status: string;
    updatedAt: Date;
    tenant: { id: string; name: string; slug: string; type: string | null };
    createdBy: { id: string; name: string | null; email: string } | null;
    currentAssessment: {
      id: string;
      status: string;
      riskLevel: string | null;
      createdAt: Date;
      updatedAt: Date;
      createdBy: { id: string; name: string | null; email: string } | null;
    } | null;
    obligations: Array<{
      id: string;
      obligationType: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: Date;
      updatedAt: Date;
      assignedTo: { id: string; name: string | null; email: string } | null;
    }>;
    evidencesCount: number;
  }>;
};

/**
 * Load AI Compliance operational data for the given scope.
 *
 * This function is the single source of truth for AI Compliance operations projection.
 * Used by:
 * - GET /admin/products/ai-compliance/operations (primary endpoint)
 * - /admin/bootstrap (minimal compatibility mode)
 *
 * Security: Caller must enforce access control (membership, permission, module activation)
 * before calling this function. This function performs raw data queries without access checks.
 */
export async function loadAiComplianceOperationsForScope(
  scope: AiComplianceScope,
): Promise<AiComplianceTenantOperations> {
  // Build tenant filter based on scope
  let tenantFilter: { tenantId?: string | { in: string[] } } = {};
  let tenantIds: string[] = [];

  if (scope.mode === "tenant") {
    tenantFilter = { tenantId: scope.tenantId };
    tenantIds = [scope.tenantId];
  } else if (scope.mode === "cross_org") {
    tenantFilter = { tenantId: { in: scope.tenantIds } };
    tenantIds = scope.tenantIds;
  } else if (scope.mode === "platform_admin") {
    // For platform admin, query across all tenants with ai_act module active
    // But limit systems to avoid excessive payload
    tenantFilter = {};
  }

  // For platform admin, first get the list of tenants with ai_act active
  if (scope.mode === "platform_admin") {
    const activeModules = await prisma.tenantModule.findMany({
      where: { isActive: true, module: { name: "ai_act" } },
      select: { tenantId: true },
    });
    tenantIds = activeModules.map((m) => m.tenantId);
    if (tenantIds.length === 0) {
      // No tenants with ai_act active
      return {
        activeOrganizations: 0,
        assessmentsCompleted: 0,
        pendingReviews: 0,
        openObligations: 0,
        systemsNeedingReview: 0,
        overdueObligations: 0,
        escalatedAssessments: 0,
        advisorWorkload: 0,
        evidenceBacklog: 0,
        systems: [],
      };
    }
    tenantFilter = { tenantId: { in: tenantIds } };
  }

  // Run queries
  const [
    aiActiveOrganizations,
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
    // Active organizations count (unique tenantIds with ai_act module active)
    prisma.tenantModule.groupBy({
      by: ["tenantId"],
      where: { ...tenantFilter, isActive: true, module: { name: "ai_act" } },
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
      // For platform admin cross-org, limit systems to avoid excessive payload
      take: scope.mode === "platform_admin" ? 500 : 250,
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

  return {
    activeOrganizations: aiActiveOrganizations.length,
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
}

/**
 * Load minimal AI Compliance counts only (for bootstrap compatibility).
 * Returns counts without systems payload to reduce bootstrap size.
 */
export async function loadAiComplianceCountsForScope(
  scope: AiComplianceScope,
): Promise<Omit<AiComplianceTenantOperations, "systems">> {
  const full = await loadAiComplianceOperationsForScope(scope);
  return {
    activeOrganizations: full.activeOrganizations,
    assessmentsCompleted: full.assessmentsCompleted,
    pendingReviews: full.pendingReviews,
    openObligations: full.openObligations,
    systemsNeedingReview: full.systemsNeedingReview,
    overdueObligations: full.overdueObligations,
    escalatedAssessments: full.escalatedAssessments,
    advisorWorkload: full.advisorWorkload,
    evidenceBacklog: full.evidenceBacklog,
  };
}
