import type { FastifyInstance } from "fastify";
import type { Prisma } from "../generated/prisma/client.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { loadAiComplianceOperationsForScope } from "../lib/ai-compliance-operations.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";

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

  const idParamsSchema = z.object({
    id: z.string().trim().min(1, "id_required"),
  });
  const assignReviewerBodySchema = z.object({
    userId: z.string().trim().min(1, "reviewer_required"),
  });

  async function ensureWorkflowAccess(
    session: SessionPayload,
    tenantId: string,
    permission: "ai_act.assess" | "ai_act.manage",
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (session.user.platformAdmin) {
      return (await ensureAiActActive(tenantId))
        ? { ok: true }
        : { ok: false, error: "module_not_active" };
    }
    const access = await requireTenantAccess(session.user, tenantId, {
      permission,
      moduleName: "ai_act",
    });
    if (!access.ok) return { ok: false, error: access.error ?? "permission_denied" };
    return { ok: true };
  }

  async function ensureAiActActive(tenantId: string): Promise<boolean> {
    const activeModule = await prisma.tenantModule.findFirst({
      where: { tenantId, isActive: true, module: { name: "ai_act" } },
      select: { id: true },
    });
    return Boolean(activeModule);
  }

  function workflowEventData(input: {
    tenantId: string;
    aiSystemId: string;
    assessmentId?: string | null;
    obligationId?: string | null;
    taskId?: string | null;
    actorUserId: string;
    eventType: "ASSESSMENT_UPDATED" | "OBLIGATION_UPDATED" | "TASK_COMPLETED" | "ADVISOR_REVIEW_REQUESTED";
    message: string;
    action: "assessment_reopened" | "obligation_reviewed" | "task_completed" | "reviewer_assigned";
    metadata?: Record<string, string | null>;
  }): Prisma.AiOperationalEventCreateManyInput {
    return {
      tenantId: input.tenantId,
      aiSystemId: input.aiSystemId,
      assessmentId: input.assessmentId ?? undefined,
      obligationId: input.obligationId ?? undefined,
      taskId: input.taskId ?? undefined,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      severity: "INFO",
      source: "ai_compliance_workflow",
      message: input.message,
      metadata: {
        action: input.action,
        ...(input.metadata ?? {}),
      },
    };
  }

  app.post<{ Params: unknown }>(
    "/admin/products/ai-compliance/tasks/:id/complete",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const params = parseWithSchema(idParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });

      const task = await prisma.aiTask.findUnique({
        where: { id: params.data.id },
        select: { id: true, tenantId: true, aiSystemId: true, title: true, status: true },
      });
      if (!task) return reply.code(404).send({ error: "not_found" });
      if (!s.user.platformAdmin && s.tenant?.id !== task.tenantId) {
        return reply.code(404).send({ error: "not_found" });
      }
      const access = await ensureWorkflowAccess(s, task.tenantId, "ai_act.assess");
      if (!access.ok) return reply.code(403).send({ error: access.error });

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.aiTask.update({
          where: { id: task.id },
          data: { status: "DONE" },
          select: { id: true, status: true, updatedAt: true },
        });
        await tx.aiOperationalEvent.create({
          data: workflowEventData({
            tenantId: task.tenantId,
            aiSystemId: task.aiSystemId,
            taskId: task.id,
            actorUserId: s.user.id,
            eventType: "TASK_COMPLETED",
            action: "task_completed",
            message: "Compliance task completed",
            metadata: { taskTitle: task.title },
          }),
        });
        return row;
      });

      return { ok: true, task: updated };
    },
  );

  app.post<{ Params: unknown }>(
    "/admin/products/ai-compliance/obligations/:id/review",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const params = parseWithSchema(idParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });

      const obligation = await prisma.aiObligation.findUnique({
        where: { id: params.data.id },
        select: { id: true, tenantId: true, aiSystemId: true, obligationType: true, status: true },
      });
      if (!obligation) return reply.code(404).send({ error: "not_found" });
      if (!s.user.platformAdmin && s.tenant?.id !== obligation.tenantId) {
        return reply.code(404).send({ error: "not_found" });
      }
      const access = await ensureWorkflowAccess(s, obligation.tenantId, "ai_act.assess");
      if (!access.ok) return reply.code(403).send({ error: access.error });

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.aiObligation.update({
          where: { id: obligation.id },
          data: { status: "COMPLETED" },
          select: { id: true, status: true, updatedAt: true },
        });
        await tx.aiOperationalEvent.create({
          data: workflowEventData({
            tenantId: obligation.tenantId,
            aiSystemId: obligation.aiSystemId,
            obligationId: obligation.id,
            actorUserId: s.user.id,
            eventType: "OBLIGATION_UPDATED",
            action: "obligation_reviewed",
            message: "Obligation reviewed",
            metadata: { obligationType: obligation.obligationType },
          }),
        });
        return row;
      });

      return { ok: true, obligation: updated };
    },
  );

  app.post<{ Params: unknown }>(
    "/admin/products/ai-compliance/assessments/:id/reopen",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const params = parseWithSchema(idParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });

      const assessment = await prisma.aiAssessment.findUnique({
        where: { id: params.data.id },
        select: { id: true, tenantId: true, aiSystemId: true, status: true },
      });
      if (!assessment) return reply.code(404).send({ error: "not_found" });
      if (!s.user.platformAdmin && s.tenant?.id !== assessment.tenantId) {
        return reply.code(404).send({ error: "not_found" });
      }
      const access = await ensureWorkflowAccess(s, assessment.tenantId, "ai_act.assess");
      if (!access.ok) return reply.code(403).send({ error: access.error });

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.aiAssessment.update({
          where: { id: assessment.id },
          data: { status: "DRAFT" },
          select: { id: true, status: true, updatedAt: true },
        });
        await tx.aiOperationalEvent.create({
          data: workflowEventData({
            tenantId: assessment.tenantId,
            aiSystemId: assessment.aiSystemId,
            assessmentId: assessment.id,
            actorUserId: s.user.id,
            eventType: "ASSESSMENT_UPDATED",
            action: "assessment_reopened",
            message: "Assessment reopened",
          }),
        });
        return row;
      });

      return { ok: true, assessment: updated };
    },
  );

  app.post<{ Params: unknown; Body: unknown }>(
    "/admin/products/ai-compliance/assessments/:id/assign-reviewer",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const params = parseWithSchema(idParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const body = parseWithSchema(assignReviewerBodySchema, req.body);
      if (!body.ok) return reply.code(400).send({ error: body.error });

      const assessment = await prisma.aiAssessment.findUnique({
        where: { id: params.data.id },
        select: { id: true, tenantId: true, aiSystemId: true },
      });
      if (!assessment) return reply.code(404).send({ error: "not_found" });
      if (!s.user.platformAdmin && s.tenant?.id !== assessment.tenantId) {
        return reply.code(404).send({ error: "not_found" });
      }
      const access = await ensureWorkflowAccess(s, assessment.tenantId, "ai_act.manage");
      if (!access.ok) return reply.code(403).send({ error: access.error });

      const reviewer = await prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId: body.data.userId,
            tenantId: assessment.tenantId,
          },
        },
        select: {
          userId: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      });
      if (!reviewer) return reply.code(404).send({ error: "reviewer_not_found" });

      if (!(await ensureAiActActive(assessment.tenantId))) {
        return reply.code(403).send({ error: "module_not_active" });
      }

      const event = await prisma.aiOperationalEvent.create({
        data: workflowEventData({
          tenantId: assessment.tenantId,
          aiSystemId: assessment.aiSystemId,
          assessmentId: assessment.id,
          actorUserId: s.user.id,
          eventType: "ADVISOR_REVIEW_REQUESTED",
          action: "reviewer_assigned",
          message: "Reviewer assigned to assessment",
          metadata: {
            reviewerName: reviewer.user.name ?? reviewer.user.email,
            reviewerRole: reviewer.role,
          },
        }),
        select: { id: true, createdAt: true },
      });

      return {
        ok: true,
        assignment: {
          assessmentId: assessment.id,
          reviewer: {
            id: reviewer.userId,
            name: reviewer.user.name,
            email: reviewer.user.email,
            role: reviewer.role,
          },
          eventId: event.id,
          createdAt: event.createdAt,
        },
      };
    },
  );
}
