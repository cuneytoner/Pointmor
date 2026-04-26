import type { FastifyInstance } from "fastify";
import type { Prisma } from "../generated/prisma/client.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";

const createAiSystemBodySchema = z.object({
  name: z.string().trim().min(1, "Sistem adi gerekli."),
  purpose: z.string().trim().min(1, "Sistem amaci gerekli."),
  description: z.string().trim().max(4000).optional(),
});

const createAiAssessmentBodySchema = z.object({
  aiSystemId: z.string().trim().min(1, "AI system gerekli."),
  questionnaire: z.record(z.string(), z.unknown()).default({}),
});

const listAiResultsQuerySchema = z.object({
  aiSystemId: z.string().trim().optional(),
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

function evaluateRiskLevel(questionnaire: Record<string, unknown>): {
  level: "LOW" | "MEDIUM" | "HIGH" | "UNACCEPTABLE";
  score: number;
} {
  const truthyCount = Object.values(questionnaire).filter((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return Boolean(v);
  }).length;
  const score = Math.min(100, truthyCount * 15);
  if (score >= 85) return { level: "UNACCEPTABLE", score };
  if (score >= 60) return { level: "HIGH", score };
  if (score >= 30) return { level: "MEDIUM", score };
  return { level: "LOW", score };
}

export async function registerAiActRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: unknown }>(
    "/ai/systems",
    { preHandler: [authPreHandler, requireTenantPermission("ai.systems.manage")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const parsed = parseWithSchema(createAiSystemBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      return prisma.aiSystem.create({
        data: {
          tenantId,
          name: parsed.data.name,
          purpose: parsed.data.purpose,
          description: parsed.data.description?.trim() || null,
        },
      });
    },
  );

  app.get(
    "/ai/systems",
    { preHandler: [authPreHandler, requireTenantPermission("ai.systems.view")] },
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
    "/ai/assessment",
    { preHandler: [authPreHandler, requireTenantPermission("ai.assessment.manage")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const parsed = parseWithSchema(createAiAssessmentBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const aiSystem = await prisma.aiSystem.findFirst({
        where: { id: parsed.data.aiSystemId, tenantId },
        select: { id: true },
      });
      if (!aiSystem) {
        return reply.code(404).send({ error: "ai_system_not_found" });
      }
      const risk = evaluateRiskLevel(parsed.data.questionnaire);
      const assessment = await prisma.aiAssessment.create({
        data: {
          tenantId,
          aiSystemId: aiSystem.id,
          status: "completed",
          questionnaire: parsed.data.questionnaire as Prisma.InputJsonValue,
        },
      });
      const riskResult = await prisma.aiRiskResult.create({
        data: {
          tenantId,
          aiAssessmentId: assessment.id,
          riskLevel: risk.level,
          score: risk.score,
          rationale: "Automatic MVP risk scoring",
        },
      });
      return {
        assessment,
        riskResult,
      };
    },
  );

  app.get<{ Querystring: unknown }>(
    "/ai/results",
    { preHandler: [authPreHandler, requireTenantPermission("ai.results.view")] },
    async (req, reply) => {
      const tenantId = resolveTenantId(req, reply);
      if (!tenantId) return;
      const parsed = parseWithSchema(listAiResultsQuerySchema, req.query);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      return prisma.aiRiskResult.findMany({
        where: {
          tenantId,
          ...(parsed.data.aiSystemId
            ? { aiAssessment: { aiSystemId: parsed.data.aiSystemId, tenantId } }
            : {}),
        },
        include: {
          aiAssessment: {
            select: {
              id: true,
              aiSystemId: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
  );
}
