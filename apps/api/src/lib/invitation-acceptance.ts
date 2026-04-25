import { prisma } from "./prisma.js";

export type AcceptInvitationInput = {
  user: {
    id: string;
    email: string;
  };
  token: string;
};

export type AcceptInvitationResult = {
  tenantId: string;
  role: "ADMIN" | "MEMBER" | "ADVISOR";
  isExternal: boolean;
};

type AcceptInvitationErrorCode =
  | "invitation_not_found"
  | "invitation_already_used"
  | "invitation_expired"
  | "invitation_email_mismatch"
  | "invitation_role_not_allowed"
  | "membership_create_failed";

const ERROR_STATUS_BY_CODE: Record<AcceptInvitationErrorCode, number> = {
  invitation_not_found: 404,
  invitation_already_used: 400,
  invitation_expired: 400,
  invitation_email_mismatch: 403,
  invitation_role_not_allowed: 403,
  membership_create_failed: 500,
};

export class InvitationAcceptanceError extends Error {
  code: AcceptInvitationErrorCode;
  statusCode: number;

  constructor(code: AcceptInvitationErrorCode) {
    super(code);
    this.code = code;
    this.statusCode = ERROR_STATUS_BY_CODE[code];
  }
}

/**
 * TenantMembership is the source of truth for access.
 * Invitation acceptance is idempotent and transaction-safe.
 */
export async function acceptInvitation(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
  const token = input.token.trim();
  if (!token) {
    throw new InvitationAcceptanceError("invitation_not_found");
  }

  const normalizedEmail = input.user.email.trim().toLowerCase();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.tenantInvitation.findUnique({
      where: { token },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        isExternal: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      throw new InvitationAcceptanceError("invitation_not_found");
    }
    if (invitation.status !== "PENDING") {
      throw new InvitationAcceptanceError("invitation_already_used");
    }
    if (invitation.expiresAt && invitation.expiresAt < now) {
      throw new InvitationAcceptanceError("invitation_expired");
    }
    if (invitation.email.trim().toLowerCase() !== normalizedEmail) {
      throw new InvitationAcceptanceError("invitation_email_mismatch");
    }
    if (invitation.isExternal && invitation.role === "ADMIN") {
      throw new InvitationAcceptanceError("invitation_role_not_allowed");
    }

    const membership = await tx.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: input.user.id,
          tenantId: invitation.tenantId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      try {
        await tx.tenantMembership.create({
          data: {
            userId: input.user.id,
            tenantId: invitation.tenantId,
            role: invitation.role,
            isExternal: invitation.isExternal,
          },
          select: { id: true },
        });
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        if (code !== "P2002") {
          throw new InvitationAcceptanceError("membership_create_failed");
        }
      }
    }

    // Idempotent finalize; no-op if another transaction already accepted it.
    await tx.tenantInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    return {
      tenantId: invitation.tenantId,
      role: invitation.role,
      isExternal: invitation.isExternal,
    };
  });
}
