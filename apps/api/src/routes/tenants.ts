import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { writeAudit } from "../lib/audit.js";
import { canAccessTenant, requirePlatformAdmin } from "../lib/guards.js";
import { prisma } from "../lib/prisma.js";

export async function registerTenantRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/tenants",
    { preHandler: [authPreHandler] },
    async (req) => {
      const s = req.authSession as SessionPayload;
      if (s.user.platformAdmin) {
        return prisma.tenant.findMany({ orderBy: { name: "asc" } });
      }
      if (!s.tenant) return [];
      const row = await prisma.tenant.findUnique({ where: { id: s.tenant.id } });
      return row ? [row] : [];
    },
  );

  app.get<{ Params: { tenantId: string } }>(
    "/tenants/:tenantId",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const { tenantId } = req.params;
      if (!canAccessTenant(s, tenantId)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const row = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!row) return reply.code(404).send({ error: "not_found" });
      return row;
    },
  );

  app.post<{ Body: { slug?: string; name?: string } }>(
    "/tenants",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const slug = (req.body?.slug ?? "").trim().toLowerCase();
      const name = (req.body?.name ?? "").trim();
      if (!slug || !name) {
        return reply.code(400).send({ error: "validation_error" });
      }
      try {
        const created = await prisma.tenant.create({
          data: { slug, name },
        });
        await writeAudit(s.user.email, "tenant.create", `${slug}`);
        return created;
      } catch {
        return reply.code(409).send({ error: "slug_taken" });
      }
    },
  );

  app.patch<{
    Params: { tenantId: string };
    Body: { name?: string; slug?: string };
  }>(
    "/tenants/:tenantId",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const { tenantId } = req.params;
      if (!canAccessTenant(s, tenantId)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const name = (req.body?.name ?? "").trim();
      const slug = (req.body?.slug ?? "").trim().toLowerCase();
      if (!s.user.platformAdmin && slug) {
        return reply.code(403).send({ error: "cannot_change_slug" });
      }
      try {
        const updated = await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(name ? { name } : {}),
            ...(s.user.platformAdmin && slug ? { slug } : {}),
          },
        });
        await writeAudit(s.user.email, "tenant.update", tenantId);
        return updated;
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  );
}
