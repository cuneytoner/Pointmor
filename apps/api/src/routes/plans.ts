import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import { requirePlatformAdmin } from "../lib/guards.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { writeAudit } from "../lib/audit.js";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";

const planCreateBodySchema = z.object({
  slug: z.string().trim().min(1, "Slug gerekli."),
  name: z.string().trim().min(1, "Plan adı gerekli."),
  description: z.string().optional(),
  priceCents: z.number().optional(),
  currency: z.string().optional(),
  interval: z.string().optional(),
  planType: z.enum(["free", "pro", "team"]).optional(),
  featureTags: z.array(z.string()).optional(),
  limits: z.record(z.string(), z.unknown()).optional(),
});

const planPatchParamsSchema = z.object({
  planId: z.string().trim().min(1, "Plan gerekli."),
});

const planPatchBodySchema = z.object({
  name: z.string().optional(),
  description: z.union([z.string(), z.null()]).optional(),
  priceCents: z.number().optional(),
  planType: z.enum(["free", "pro", "team"]).optional(),
  featureTags: z.array(z.string()).optional(),
  limits: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
});

export async function registerPlanRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/plans",
    { preHandler: [authPreHandler] },
    async () => prisma.plan.findMany({ orderBy: { name: "asc" } }),
  );

  app.post<{ Body: unknown }>(
    "/plans",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const parsed = parseWithSchema(planCreateBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const b = parsed.data;
      const slug = b.slug.trim().toLowerCase();
      const name = b.name.trim();
      try {
        const pt = b.planType;
        const planType =
          pt === "free" || pt === "pro" || pt === "team" ? pt : "free";
        const limitsJson: Prisma.InputJsonValue | undefined =
          b.limits !== undefined && typeof b.limits === "object" && b.limits !== null
            ? (b.limits as Prisma.InputJsonValue)
            : undefined;
        const created = await prisma.plan.create({
          data: {
            slug,
            name,
            description: b.description?.trim() || null,
            priceCents: Number(b.priceCents ?? 0),
            currency: (b.currency ?? "EUR").trim() || "EUR",
            interval: (b.interval ?? "month").trim() || "month",
            planType,
            featureTags: Array.isArray(b.featureTags) ? b.featureTags : [],
            ...(limitsJson !== undefined ? { limits: limitsJson } : {}),
          },
        });
        await writeAudit(s.user.email, "plan.create", slug);
        return created;
      } catch {
        return reply.code(409).send({ error: "slug_taken" });
      }
    },
  );

  app.patch<{
    Params: { planId: string };
    Body: unknown;
  }>(
    "/plans/:planId",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const paramsParsed = parseWithSchema(planPatchParamsSchema, req.params);
      if (!paramsParsed.ok) {
        return reply.code(400).send({ error: paramsParsed.error, message: paramsParsed.message });
      }
      const bodyParsed = parseWithSchema(planPatchBodySchema, req.body);
      if (!bodyParsed.ok) {
        return reply.code(400).send({ error: bodyParsed.error, message: bodyParsed.message });
      }
      const planId = paramsParsed.data.planId.trim();
      const b = bodyParsed.data;
      try {
        const limitsPatch: { limits?: Prisma.InputJsonValue } = {};
        if (b.limits !== undefined) {
          limitsPatch.limits =
            b.limits === null ? {} : (b.limits as Prisma.InputJsonValue);
        }
        const updated = await prisma.plan.update({
          where: { id: planId },
          data: {
            ...(b.name !== undefined ? { name: b.name.trim() } : {}),
            ...(b.description !== undefined
              ? { description: b.description }
              : {}),
            ...(b.priceCents !== undefined
              ? { priceCents: Number(b.priceCents) }
              : {}),
            ...(b.planType === "free" ||
            b.planType === "pro" ||
            b.planType === "team"
              ? { planType: b.planType }
              : {}),
            ...(b.featureTags !== undefined ? { featureTags: b.featureTags } : {}),
            ...limitsPatch,
          },
        });
        await writeAudit(s.user.email, "plan.update", planId);
        return updated;
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  );
}
