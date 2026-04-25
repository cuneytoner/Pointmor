import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { prisma } from "../lib/prisma.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";
import { parseWithSchema, z } from "../lib/validation.js";

const invitationCreateBodySchema = z.object({
  tenantId: z.string().trim().min(1, "Kiracı gerekli.").optional(),
  email: z.string().trim().email("Geçerli e-posta gerekli."),
  role: z.enum(["ADMIN", "MEMBER", "ADVISOR"]).default("MEMBER"),
  isExternal: z.boolean().optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export async function registerTenantInvitationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/invitations", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (!s.tenant) return reply.code(403).send({ error: "tenant_context_required" });
    if (!hasPermissionForSession(s, "team.view") && s.membership?.role !== "ADVISOR") {
      return reply.code(403).send({ error: "permission_denied" });
    }
    return prisma.tenantInvitation.findMany({
      where: { tenantId: s.tenant.id },
      orderBy: { invitedAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        isExternal: true,
        status: true,
        invitedAt: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });
  });

  app.post<{ Body: unknown }>("/tenant/invitations", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    const parsed = parseWithSchema(invitationCreateBodySchema, req.body);
    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.error, message: parsed.message });
    }
    const targetTenantId = parsed.data.tenantId ?? s.tenant?.id;
    if (!targetTenantId) {
      return reply.code(403).send({ error: "tenant_context_required" });
    }

    if (!s.user.platformAdmin && targetTenantId !== s.tenant?.id) {
      return reply.code(403).send({ error: "forbidden" });
    }
    if (!s.user.platformAdmin) {
      const canManageTeam = hasPermissionForSession(s, "team.manage");
      const isAdvisor = s.membership?.role === "ADVISOR";
      if (!canManageTeam && !isAdvisor) {
        return reply.code(403).send({ error: "permission_denied" });
      }
    }

    const inviterMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: s.user.id,
          tenantId: targetTenantId,
        },
      },
      select: { id: true },
    });
    if (!s.user.platformAdmin && !inviterMembership) {
      return reply.code(403).send({ error: "membership_required" });
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const created = await prisma.tenantInvitation.create({
      data: {
        tenantId: targetTenantId,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        isExternal: parsed.data.isExternal ?? parsed.data.role === "ADVISOR",
        token,
        invitedByUserId: s.user.id,
        invitedByMembershipId: inviterMembership?.id,
        expiresAt,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        isExternal: true,
        status: true,
        invitedAt: true,
        expiresAt: true,
      },
    });
    return created;
  });
}
