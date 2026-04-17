import { Prisma } from "../generated/prisma/client.js";
import type { SessionPayload } from "./auth-memory.js";
import {
  assertDeviceSessionBranchAllowed,
  branchScopeFromSession,
} from "./branch-scope.js";
import { prisma } from "./prisma.js";
import { recordAuditEvent } from "./operational-audit-service.js";
import { getShiftClosingSummary } from "./closing-summary-service.js";
import {
  assertFeature,
  assertWithinLimit,
  FEATURE,
  getTenantEntitlementContext,
} from "./entitlement-service.js";

/** Visit / redemption / claim onayı için zorunlu çift bağlam (header veya body). */
export type CashierOperationContext = {
  deviceSessionId: string;
  cashierShiftId: string;
};

export async function createBranch(
  tenantId: string,
  name: string,
  slug?: string | null,
) {
  const n = name.trim();
  if (!n) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const ent = await getTenantEntitlementContext(tenantId);
  const branchCount = await prisma.branch.count({ where: { tenantId } });
  if (branchCount >= 1) {
    assertFeature(ent, FEATURE.MULTI_BRANCH);
  }
  assertWithinLimit(ent, "maxBranches", branchCount, 1);
  return prisma.branch.create({
    data: {
      tenantId,
      name: n,
      slug: slug?.trim() || null,
    },
  });
}

export async function updateBranch(
  tenantId: string,
  branchId: string,
  patch: {
    name?: string;
    slug?: string | null;
    address?: unknown | null;
    isActive?: boolean;
  },
) {
  const existing = await prisma.branch.findFirst({
    where: { id: branchId, tenantId },
  });
  if (!existing) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }
  const name =
    patch.name !== undefined ? patch.name.trim() : undefined;
  if (name !== undefined && !name) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  try {
    return await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(patch.slug !== undefined ? { slug: patch.slug?.trim() || null } : {}),
        ...(patch.address !== undefined
          ? {
              address:
                patch.address === null
                  ? Prisma.JsonNull
                  : (patch.address as Prisma.InputJsonValue),
            }
          : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      },
    });
  } catch (e) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      const err = Object.assign(new Error("branch_name_taken"), { statusCode: 409 });
      throw err;
    }
    throw e;
  }
}

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

/** Oturum şube kapsamına göre (staff tek şube; manager çoklu; owner tümü). */
export async function listBranchesForUser(
  tenantId: string,
  session: SessionPayload,
) {
  const all = await prisma.branch.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
  const scope = branchScopeFromSession(session);
  if (scope === "all") return all;
  if (scope.restrictedTo.length === 0) return [];
  const allowed = new Set(scope.restrictedTo);
  return all.filter((b) => allowed.has(b.id));
}

/** Aynı tenant + deviceLabel ile açık oturum varsa hata (tek aktif tablet oturumu). */
export async function startDeviceSession(
  tenantId: string,
  deviceLabel: string,
  branchId: string | null | undefined,
  createdByUserId: string | null,
) {
  const label = deviceLabel.trim();
  if (!label) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  if (branchId) {
    const br = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
    if (!br) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }
  }

  const existing = await prisma.deviceSession.findFirst({
    where: {
      tenantId,
      deviceLabel: label,
      status: "open",
    },
  });
  if (existing) {
    const err = Object.assign(new Error("device_session_already_open"), {
      statusCode: 409,
    });
    (err as Error & { existingId?: string }).existingId = existing.id;
    throw err;
  }

  const row = await prisma.deviceSession.create({
    data: {
      tenantId,
      branchId: branchId ?? null,
      deviceLabel: label,
      status: "open",
      createdByUserId,
    },
    include: { branch: true },
  });
  await recordAuditEvent({
    tenantId,
    actorUserId: createdByUserId ?? null,
    actorType: "cashier",
    branchId: row.branchId,
    deviceSessionId: row.id,
    eventType: "device_session_opened",
    entityType: "device_session",
    entityId: row.id,
    payload: { deviceLabel: label },
  });
  return row;
}

export async function closeDeviceSession(
  tenantId: string,
  deviceSessionId: string,
  closedByUserId?: string | null,
): Promise<{ closedShifts: number }> {
  const out = await prisma.$transaction(async (tx) => {
    const ds = await tx.deviceSession.findFirst({
      where: { id: deviceSessionId, tenantId, status: "open" },
    });
    if (!ds) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }

    const closed = await tx.cashierShift.updateMany({
      where: { tenantId, deviceSessionId, status: "open" },
      data: { status: "closed", endedAt: new Date() },
    });

    await tx.deviceSession.update({
      where: { id: deviceSessionId },
      data: { status: "closed", endedAt: new Date() },
    });

    return { closedShifts: closed.count, branchId: ds.branchId };
  });
  await recordAuditEvent({
    tenantId,
    actorUserId: closedByUserId ?? null,
    actorType: "cashier",
    branchId: out.branchId,
    deviceSessionId,
    eventType: "device_session_closed",
    entityType: "device_session",
    entityId: deviceSessionId,
    payload: { closedShifts: out.closedShifts },
  });
  return { closedShifts: out.closedShifts };
}

export async function startCashierShift(
  tenantId: string,
  userId: string,
  deviceSessionId: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
  if (!user) {
    const err = Object.assign(new Error("forbidden_user"), { statusCode: 403 });
    throw err;
  }

  const ds = await prisma.deviceSession.findFirst({
    where: { id: deviceSessionId, tenantId, status: "open" },
  });
  if (!ds) {
    const err = Object.assign(new Error("device_session_closed"), {
      statusCode: 409,
    });
    throw err;
  }

  const openOnDevice = await prisma.cashierShift.findFirst({
    where: { tenantId, deviceSessionId, status: "open" },
  });
  if (openOnDevice) {
    const err = Object.assign(new Error("shift_already_open_on_device"), {
      statusCode: 409,
    });
    throw err;
  }

  const openForUser = await prisma.cashierShift.findFirst({
    where: { tenantId, userId, status: "open" },
  });
  if (openForUser) {
    const err = Object.assign(new Error("user_shift_already_open"), {
      statusCode: 409,
    });
    throw err;
  }

  const row = await prisma.cashierShift.create({
    data: {
      tenantId,
      userId,
      deviceSessionId,
      status: "open",
    },
    include: {
      deviceSession: { include: { branch: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  await recordAuditEvent({
    tenantId,
    actorUserId: userId,
    actorType: "cashier",
    branchId: row.deviceSession.branchId,
    deviceSessionId: row.deviceSessionId,
    cashierShiftId: row.id,
    eventType: "shift_opened",
    entityType: "cashier_shift",
    entityId: row.id,
    payload: {},
  });
  return row;
}

export async function closeCashierShift(
  tenantId: string,
  shiftId: string,
  userId: string,
) {
  const sh = await prisma.cashierShift.findFirst({
    where: { id: shiftId, tenantId, status: "open" },
  });
  if (!sh) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }
  if (sh.userId !== userId) {
    const err = Object.assign(new Error("forbidden"), { statusCode: 403 });
    throw err;
  }
  const row = await prisma.cashierShift.update({
    where: { id: shiftId },
    data: { status: "closed", endedAt: new Date() },
    include: {
      deviceSession: { include: { branch: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  await recordAuditEvent({
    tenantId,
    actorUserId: userId,
    actorType: "cashier",
    branchId: row.deviceSession.branchId,
    deviceSessionId: row.deviceSessionId,
    cashierShiftId: row.id,
    eventType: "shift_closed",
    entityType: "cashier_shift",
    entityId: row.id,
    payload: {},
  });
  return row;
}

/**
 * Header’dan gelen çift kimliği doğrular: açık cihaz, açık vardiya, kullanıcı eşleşmesi.
 */
export async function assertCashierOperationContext(
  tenantId: string,
  userId: string,
  ctx: CashierOperationContext,
  session?: SessionPayload,
): Promise<void> {
  const ds = await prisma.deviceSession.findFirst({
    where: { id: ctx.deviceSessionId, tenantId, status: "open" },
  });
  if (!ds) {
    const err = Object.assign(new Error("device_session_invalid"), {
      statusCode: 409,
    });
    throw err;
  }

  const sh = await prisma.cashierShift.findFirst({
    where: {
      id: ctx.cashierShiftId,
      tenantId,
      deviceSessionId: ctx.deviceSessionId,
      status: "open",
      userId,
    },
  });
  if (!sh) {
    const err = Object.assign(new Error("cashier_shift_invalid"), {
      statusCode: 409,
    });
    throw err;
  }
  if (session) {
    assertDeviceSessionBranchAllowed(session, ds.branchId);
  }
}

export async function getCashierBootstrap(
  tenantId: string,
  userId: string,
  session?: SessionPayload,
) {
  const [branches, myOpenShift] = await Promise.all([
    session ? listBranchesForUser(tenantId, session) : listBranches(tenantId),
    prisma.cashierShift.findFirst({
      where: { tenantId, userId, status: "open" },
      include: {
        deviceSession: { include: { branch: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { branches, myOpenShift };
}

export async function getCashierShiftSummary(
  tenantId: string,
  shiftId: string,
  requestUserId: string,
  membershipRole?: string | null,
  platformAdmin?: boolean,
) {
  const full = await getShiftClosingSummary(
    tenantId,
    shiftId,
    requestUserId,
    membershipRole ?? null,
    { platformAdmin },
  );
  return {
    shift: {
      id: full.shift!.id,
      status: full.shift!.status,
      startedAt: full.shift!.startedAt,
      endedAt: full.shift!.endedAt,
      user: full.shift!.user,
      deviceSession: full.shift!.deviceSession,
    },
    visitCount: full.totalVisits,
    totalPointsIssued: full.totalPointsIssued,
    redemptionCount: full.totalRewardsRedeemed,
    totalPointsRedeemed: full.totalPointsRedeemed,
    closing: full,
  };
}
