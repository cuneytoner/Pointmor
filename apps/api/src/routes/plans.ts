import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import { requirePlatformAdmin } from "../lib/guards.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { writeAudit } from "../lib/audit.js";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export async function registerPlanRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/plans",
    { preHandler: [authPreHandler] },
    async () => prisma.plan.findMany({ orderBy: { name: "asc" } }),
  );

  app.post<{
    Body: {
      slug?: string;
      name?: string;
      description?: string;
      priceCents?: number;
      currency?: string;
      interval?: string;
      planType?: "free" | "pro" | "team";
      featureTags?: string[];
      limits?: Record<string, unknown>;
    };
  }>(
    "/plans",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const slug = (b.slug ?? "").trim().toLowerCase();
      const name = (b.name ?? "").trim();
      if (!slug || !name) {
        return reply.code(400).send({ error: "validation_error" });
      }
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
    Body: {
      name?: string;
      description?: string | null;
      priceCents?: number;
      planType?: "free" | "pro" | "team";
      featureTags?: string[];
      limits?: Record<string, unknown> | null;
    };
  }>(
    "/plans/:planId",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const { planId } = req.params;
      const b = req.body ?? {};
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
