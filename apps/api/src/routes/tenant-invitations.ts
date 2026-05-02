import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantAccess } from "../lib/guards.js";
import { InvitationAcceptanceError, acceptInvitation } from "../lib/invitation-acceptance.js";
import { prisma } from "../lib/prisma.js";
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
    if (!s.user.platformAdmin && s.membership?.role !== "ADMIN") {
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
    const inviterRole = s.membership?.role;
    const inviterIsAdmin = s.user.platformAdmin || inviterRole === "ADMIN";
    const inviterIsAdvisor = inviterRole === "ADVISOR";
    if (!inviterIsAdmin && !inviterIsAdvisor) {
      return reply.code(403).send({ error: "permission_denied" });
    }

    const inviterMembership = s.user.platformAdmin
      ? null
      : await prisma.tenantMembership.findUnique({
          where: {
            userId_tenantId: {
              userId: s.user.id,
              tenantId: targetTenantId,
            },
          },
          select: { id: true, role: true },
        });
    if (!s.user.platformAdmin && !inviterMembership) {
      return reply.code(403).send({ error: "membership_required" });
    }

    const requestedRole = parsed.data.role;
    const requestedIsExternal = parsed.data.isExternal ?? requestedRole === "ADVISOR";
    const effectiveInviterRole = s.user.platformAdmin ? "ADMIN" : inviterMembership?.role;

    // isExternal must match invitation role invariants.
    if (requestedRole === "ADVISOR" && requestedIsExternal !== true) {
      return reply.code(400).send({ error: "invitation_is_external_mismatch" });
    }
    if ((requestedRole === "ADMIN" || requestedRole === "MEMBER") && requestedIsExternal !== false) {
      return reply.code(400).send({ error: "invitation_is_external_mismatch" });
    }

    // ADVISOR inviters are strictly limited to external ADVISOR invitations.
    if (effectiveInviterRole === "ADVISOR") {
      if (requestedRole !== "ADVISOR") {
        return reply.code(403).send({ error: "advisor_invite_role_forbidden" });
      }
      if (requestedIsExternal !== true) {
        return reply.code(403).send({ error: "advisor_invite_external_required" });
      }
    }

    // ADMIN/MEMBER invitations require ADMIN-level inviter in tenant context.
    if ((requestedRole === "ADMIN" || requestedRole === "MEMBER") && effectiveInviterRole !== "ADMIN") {
      return reply.code(403).send({ error: "admin_role_required_for_invite" });
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
        isExternal: requestedIsExternal,
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
