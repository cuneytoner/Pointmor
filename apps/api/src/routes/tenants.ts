import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { writeAudit } from "../lib/audit.js";
import { canAccessTenant, requirePlatformAdmin } from "../lib/guards.js";
import { prisma } from "../lib/prisma.js";
import { parseWithSchema, z } from "../lib/validation.js";

const tenantCreateBodySchema = z.object({
  slug: z.string().trim().min(1, "Slug gerekli."),
  name: z.string().trim().min(1, "İsim gerekli."),
  type: z.enum(["BUSINESS", "ADVISOR"]).optional(),
});

const tenantIdParamsSchema = z.object({
  tenantId: z.string().trim().min(1, "Kiracı gerekli."),
});

const tenantPatchBodySchema = z.object({
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  type: z.enum(["BUSINESS", "ADVISOR"]).optional(),
});

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
      const paramsParsed = parseWithSchema(tenantIdParamsSchema, req.params);
      if (!paramsParsed.ok) {
        return reply.code(400).send({ error: paramsParsed.error, message: paramsParsed.message });
      }
      const tenantId = paramsParsed.data.tenantId.trim();
      if (!canAccessTenant(s, tenantId)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const row = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!row) return reply.code(404).send({ error: "not_found" });
      return row;
    },
  );

  app.post<{ Body: unknown }>(
    "/tenants",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const parsed = parseWithSchema(tenantCreateBodySchema, req.body);
      if (!parsed.ok) {
        return reply.code(400).send({ error: parsed.error, message: parsed.message });
      }
      const slug = parsed.data.slug.trim().toLowerCase();
      const name = parsed.data.name.trim();
      try {
        const created = await prisma.tenant.create({
          data: { slug, name, type: parsed.data.type ?? "BUSINESS" },
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
    Body: unknown;
  }>(
    "/tenants/:tenantId",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      const paramsParsed = parseWithSchema(tenantIdParamsSchema, req.params);
      if (!paramsParsed.ok) {
        return reply.code(400).send({ error: paramsParsed.error, message: paramsParsed.message });
      }
      const tenantId = paramsParsed.data.tenantId.trim();
      if (!canAccessTenant(s, tenantId)) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const bodyParsed = parseWithSchema(tenantPatchBodySchema, req.body);
      if (!bodyParsed.ok) {
        return reply.code(400).send({ error: bodyParsed.error, message: bodyParsed.message });
      }
      const name = (bodyParsed.data.name ?? "").trim();
      const slug = (bodyParsed.data.slug ?? "").trim().toLowerCase();
      if (!s.user.platformAdmin && slug) {
        return reply.code(403).send({ error: "cannot_change_slug" });
      }
      try {
        const updated = await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(name ? { name } : {}),
            ...(s.user.platformAdmin && slug ? { slug } : {}),
            ...(s.user.platformAdmin && bodyParsed.data.type ? { type: bodyParsed.data.type } : {}),
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
