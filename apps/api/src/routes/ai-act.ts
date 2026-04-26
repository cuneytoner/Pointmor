import type { FastifyInstance } from "fastify";
import type { Prisma } from "../generated/prisma/client.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";
import {
  AI_ACT_QUESTION_KEYS,
  classifyRisk,
  makeAssessmentVersion,
  normalizeQuestionnaire,
  obligationsForRisk,
  systemScopedWhere,
  type AiActQuestionKey,
} from "../lib/ai-act-assessment.js";

const createAiSystemBodySchema = z.object({
  name: z.string().trim().min(1, "Sistem adi gerekli."),
  purpose: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  providerType: z.enum(["INTERNAL", "EXTERNAL", "HYBRID"]),
});

const aiSystemIdParamsSchema = z.object({
  id: z.string().trim().min(1, "AI system gerekli."),
});

const submitAssessmentBodySchema = z.object({
  version: z.number().int().positive().optional(),
  answers: z.record(z.string(), z.unknown()),
});

function resolveTenantId(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const tenantId = s?.tenant?.id;
  if (!tenantId) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}

async function ensureTenantSystem(tenantId: string, systemId: string) {
  return prisma.aiSystem.findFirst({
    where: systemScopedWhere(tenantId, systemId),
  });
}

export async function registerAiActRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/ai-act/systems",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      return prisma.aiSystem.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    },
  );

  app.post<{ Body: unknown }>(
    "/ai-act/systems",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.manage")] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const parsed = parseWithSchema(createAiSystemBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error });
      }
      return prisma.aiSystem.create({
        data: {
          tenantId,
          name: parsed.data.name,
          purpose: parsed.data.purpose?.trim() || null,
          description: parsed.data.description?.trim() || null,
          providerType: parsed.data.providerType,
          status: "DRAFT",
          createdByUserId: s.user.id,
        },
      });
    },
  );

  app.get<{ Params: unknown }>(
    "/ai-act/systems/:id",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const params = parseWithSchema(aiSystemIdParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const row = await ensureTenantSystem(tenantId, params.data.id);
      if (!row) return reply.code(404).send({ error: "not_found" });
      return row;
    },
  );

  app.post<{ Params: unknown; Body: unknown }>(
    "/ai-act/systems/:id/assessment",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.assess")] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const params = parseWithSchema(aiSystemIdParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const body = parseWithSchema(submitAssessmentBodySchema, req.body);
      if (!body.ok) return reply.code(400).send({ error: body.error });

      const system = await ensureTenantSystem(tenantId, params.data.id);
      if (!system) {
        return reply.code(404).send({ error: "not_found" });
      }
      const normalized = normalizeQuestionnaire(body.data.answers);
      if (!normalized.ok) {
        return reply.code(400).send({ error: normalized.error });
      }
      const classification = classifyRisk(normalized.answers);

      const latest = await prisma.aiAssessment.findFirst({
        where: { tenantId, aiSystemId: system.id },
        orderBy: { createdAt: "desc" },
      });
      const assessmentVersion = body.data.version ?? makeAssessmentVersion(system, latest?.version ?? null);

      const result = await prisma.$transaction(async (tx) => {
        const assessment = await tx.aiAssessment.create({
          data: {
            tenantId,
            aiSystemId: system.id,
            version: assessmentVersion,
            status: "COMPLETED",
            riskLevel: classification.riskLevel,
            classificationSource: classification.classificationSource,
            confidence: classification.confidence,
            createdByUserId: s.user.id,
            questionnaire: normalized.answers as unknown as Prisma.InputJsonValue,
          },
        });

        for (const key of AI_ACT_QUESTION_KEYS) {
          const questionKey = key as AiActQuestionKey;
          await tx.aiAssessmentAnswer.create({
            data: {
              tenantId,
              assessmentId: assessment.id,
              questionKey,
              answerValue: normalized.answers[questionKey],
              answerSource: "USER",
              confidence: classification.confidence,
            },
          });
        }

        const obligations = obligationsForRisk(classification.riskLevel, normalized.answers);
        for (const obligation of obligations) {
          const existingObligation = await tx.aiObligation.findFirst({
            where: {
              tenantId,
              aiSystemId: system.id,
              obligationType: obligation.obligationType,
            },
          });
          const obligationRow =
            existingObligation ??
            (await tx.aiObligation.create({
              data: {
                tenantId,
                aiSystemId: system.id,
                obligationType: obligation.obligationType,
                status: "PENDING",
                source: "RULE_ENGINE",
              },
            }));

          const existingTask = await tx.aiTask.findFirst({
            where: {
              tenantId,
              aiSystemId: system.id,
              obligationId: obligationRow.id,
            },
          });
          if (!existingTask) {
            await tx.aiTask.create({
              data: {
                tenantId,
                aiSystemId: system.id,
                obligationId: obligationRow.id,
                title: obligation.title,
                priority: obligation.priority,
                status: "OPEN",
              },
            });
          }
        }

        await tx.aiRiskResult.create({
          data: {
            tenantId,
            aiAssessmentId: assessment.id,
            riskLevel: classification.riskLevel,
            score: Math.round(classification.confidence * 100),
            rationale: classification.rationale,
          },
        });

        return assessment;
      });

      return {
        assessmentId: result.id,
        riskLevel: classification.riskLevel,
        confidence: classification.confidence,
        suggested: true,
      };
    },
  );

  app.get<{ Params: unknown }>(
    "/ai-act/systems/:id/assessment",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const params = parseWithSchema(aiSystemIdParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const system = await ensureTenantSystem(tenantId, params.data.id);
      if (!system) return reply.code(404).send({ error: "not_found" });

      const assessment = await prisma.aiAssessment.findFirst({
        where: { tenantId, aiSystemId: system.id },
        orderBy: { createdAt: "desc" },
      });
      if (!assessment) {
        return reply.code(404).send({ error: "assessment_not_found" });
      }
      const answers = await prisma.aiAssessmentAnswer.findMany({
        where: { tenantId, assessmentId: assessment.id },
        orderBy: { createdAt: "asc" },
      });
      const risk = await prisma.aiRiskResult.findFirst({
        where: { tenantId, aiAssessmentId: assessment.id },
        orderBy: { createdAt: "desc" },
      });
      return { assessment, answers, risk, suggested: true };
    },
  );

  app.get<{ Params: unknown }>(
    "/ai-act/systems/:id/obligations",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const params = parseWithSchema(aiSystemIdParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const system = await ensureTenantSystem(tenantId, params.data.id);
      if (!system) return reply.code(404).send({ error: "not_found" });
      return prisma.aiObligation.findMany({
        where: {
          tenantId,
          aiSystemId: system.id,
        },
        orderBy: { createdAt: "desc" },
      });
    },
  );

  app.get<{ Params: unknown }>(
    "/ai-act/systems/:id/tasks",
    { preHandler: [authPreHandler, requireTenantPermission("ai_act.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const params = parseWithSchema(aiSystemIdParamsSchema, req.params);
      if (!params.ok) return reply.code(400).send({ error: params.error });
      const system = await ensureTenantSystem(tenantId, params.data.id);
      if (!system) return reply.code(404).send({ error: "not_found" });
      return prisma.aiTask.findMany({
        where: {
          tenantId,
          aiSystemId: system.id,
        },
        orderBy: { createdAt: "desc" },
      });
    },
  );
}
