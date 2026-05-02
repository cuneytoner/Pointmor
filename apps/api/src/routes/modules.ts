import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";

const tenantModuleBodySchema = z.object({
  moduleId: z.string().trim().min(1, "Module gerekli."),
  isActive: z.boolean(),
});

export async function registerModuleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/modules", { preHandler: [authPreHandler] }, async () =>
    prisma.module.findMany({ orderBy: { name: "asc" } }),
  );

  app.get("/tenant/modules", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (!s.tenant) return reply.code(403).send({ error: "tenant_context_required" });
    const access = await requireTenantAccess(s.user, s.tenant.id);
    if (!access.ok) return reply.code(403).send({ error: access.error ?? "forbidden" });
    return prisma.tenantModule.findMany({
      where: { tenantId: s.tenant.id },
      include: { module: true },
      orderBy: { module: { name: "asc" } },
    });
  });

  app.put<{ Body: unknown }>(
    "/tenant/modules",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      if (!s.tenant) return reply.code(403).send({ error: "tenant_context_required" });
      const access = await requireTenantAccess(s.user, s.tenant.id, {
        permission: "settings.manage",
      });
      if (!access.ok) {
        return reply.code(403).send({ error: access.error ?? "permission_denied" });
      }
      const parsed = parseWithSchema(tenantModuleBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const moduleExists = await prisma.module.findUnique({
        where: { id: parsed.data.moduleId },
        select: { id: true },
      });
      if (!moduleExists) {
        return reply.code(404).send({ error: "module_not_found" });
      }
      const upserted = await prisma.tenantModule.upsert({
        where: {
          tenantId_moduleId: { tenantId: s.tenant.id, moduleId: parsed.data.moduleId },
        },
        create: {
          tenantId: s.tenant.id,
          moduleId: parsed.data.moduleId,
          isActive: parsed.data.isActive,
        },
        update: { isActive: parsed.data.isActive },
        include: { module: true },
      });
      return upserted;
    },
  );
}
