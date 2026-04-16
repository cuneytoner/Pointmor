import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";
import { prisma } from "../lib/prisma.js";

export async function registerTenantOnboardingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/onboarding", { preHandler: authPreHandler }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (!s.tenant) {
      return reply.code(403).send({ error: "forbidden" });
    }
    const t = await prisma.tenant.findUnique({
      where: { id: s.tenant.id },
      select: { onboardingStep: true, onboardingCompletedAt: true },
    });
    if (!t) return reply.code(404).send({ error: "not_found" });
    return {
      onboardingStep: t.onboardingStep,
      onboardingCompletedAt: t.onboardingCompletedAt?.toISOString() ?? null,
    };
  });

  app.patch<{
    Body: { onboardingStep?: number; complete?: boolean };
  }>("/tenant/onboarding", { preHandler: authPreHandler }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (!s.tenant) {
      return reply.code(403).send({ error: "forbidden" });
    }
    if (!hasPermissionForSession(s, "settings.manage")) {
      return reply.code(403).send({ error: "permission_denied" });
    }
    const b = req.body ?? {};
    const data: { onboardingStep?: number; onboardingCompletedAt?: Date | null } = {};
    if (typeof b.onboardingStep === "number" && b.onboardingStep >= 1 && b.onboardingStep <= 6) {
      data.onboardingStep = b.onboardingStep;
    }
    if (b.complete === true) {
      data.onboardingCompletedAt = new Date();
      data.onboardingStep = 6;
    }
    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: "validation_error" });
    }
    const updated = await prisma.tenant.update({
      where: { id: s.tenant.id },
      data,
      select: { onboardingStep: true, onboardingCompletedAt: true },
    });
    return {
      onboardingStep: updated.onboardingStep,
      onboardingCompletedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
    };
  });
}
