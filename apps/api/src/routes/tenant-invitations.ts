import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { InvitationAcceptanceError, acceptInvitation } from "../lib/invitation-acceptance.js";
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

const invitationAcceptBodySchema = z.object({
  token: z.string().trim().min(1, "Davet token gerekli."),
});

export async function registerTenantInvitationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/invitations", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    if (!s.tenant) return reply.code(403).send({ error: "tenant_context_required" });
    const access = await requireTenantAccess(s.user, s.tenant.id);
    if (!access.ok) return reply.code(403).send({ error: access.error ?? "forbidden" });
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

    const targetAccess = await requireTenantAccess(s.user, targetTenantId);
    if (!targetAccess.ok) return reply.code(403).send({ error: targetAccess.error ?? "forbidden" });
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

  app.post<{ Body: unknown }>("/tenant/invitations/accept", { preHandler: [authPreHandler] }, async (req, reply) => {
    const s = req.authSession as SessionPayload;
    const parsed = parseWithSchema(invitationAcceptBodySchema, req.body);
    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.error, message: parsed.message });
    }

    try {
      const accepted = await acceptInvitation({
        user: {
          id: s.user.id,
          email: s.user.email,
        },
        token: parsed.data.token,
      });
      return reply.send(accepted);
    } catch (err) {
      if (err instanceof InvitationAcceptanceError) {
        return reply.code(err.statusCode).send({ error: err.code });
      }
      req.log.error({ err }, "tenant_invitation_accept_failed");
      return reply.code(500).send({ error: "membership_create_failed" });
    }
  });
}
