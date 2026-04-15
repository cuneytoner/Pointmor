import { prisma } from "./prisma.js";

export function isManagerRole(membershipRole: string | null | undefined): boolean {
  const r = (membershipRole ?? "").toLowerCase();
  return r === "owner" || r === "admin" || r === "manager";
}

export function assertCanViewShiftClosing(
  shift: { userId: string },
  viewerUserId: string,
  membershipRole: string | null | undefined,
  opts?: { platformAdmin?: boolean },
): void {
  if (opts?.platformAdmin) return;
  if (shift.userId === viewerUserId) return;
  if (isManagerRole(membershipRole)) return;
  const err = Object.assign(new Error("forbidden"), { statusCode: 403 });
  throw err;
}

export type ClosingSummaryDto = {
  scope: "shift" | "branch_day";
  shift?: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    durationMs: number;
    user: { id: string; name: string; email: string };
    deviceSession: {
      id: string;
      deviceLabel: string;
      branchId: string | null;
    };
  };
  branch?: { id: string; name: string };
  period: { start: string; end: string };
  totalVisits: number;
  totalPointsIssued: number;
  totalRewardsRedeemed: number;
  totalPointsRedeemed: number;
  pendingClaimsOpenedInPeriod: number;
  rejectedClaimsInPeriod: number;
  uniqueCustomersServed: number;
  manualAdjustmentCount: number;
  anomalyCountInPeriod: number;
  anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    createdAt: string;
    payload: Record<string, unknown>;
  }>;
};

function shiftDurationMs(
  startedAt: Date,
  endedAt: Date | null,
  capAt: Date,
): number {
  const end = endedAt ?? capAt;
  return Math.max(0, end.getTime() - startedAt.getTime());
}

export async function getShiftClosingSummary(
  tenantId: string,
  shiftId: string,
  viewerUserId: string,
  membershipRole: string | null | undefined,
  opts?: { platformAdmin?: boolean },
): Promise<ClosingSummaryDto> {
  const sh = await prisma.cashierShift.findFirst({
    where: { id: shiftId, tenantId },
    include: {
      deviceSession: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!sh) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }
  assertCanViewShiftClosing(sh, viewerUserId, membershipRole, opts);

  const now = new Date();
  const periodEnd = sh.endedAt ?? now;
  const periodStart = sh.startedAt;

  const [
    visitCount,
    visitSum,
    redemptionCount,
    redemptionSum,
    pendingOpened,
    rejectedAudit,
    visitDistinct,
    redemptionDistinct,
    manualAdj,
    anomalyRows,
  ] = await Promise.all([
    prisma.visit.count({ where: { tenantId, cashierShiftId: shiftId } }),
    prisma.visit.aggregate({
      where: { tenantId, cashierShiftId: shiftId },
      _sum: { pointsEarned: true },
    }),
    prisma.redemption.count({
      where: { tenantId, cashierShiftId: shiftId, status: "completed" },
    }),
    prisma.redemption.aggregate({
      where: { tenantId, cashierShiftId: shiftId, status: "completed" },
      _sum: { pointsSpent: true },
    }),
    prisma.redemption.count({
      where: {
        tenantId,
        status: "pending",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.auditEvent.count({
      where: {
        tenantId,
        eventType: "reward_rejected",
        cashierShiftId: shiftId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.visit.findMany({
      where: { tenantId, cashierShiftId: shiftId },
      distinct: ["customerId"],
      select: { customerId: true },
    }),
    prisma.redemption.findMany({
      where: { tenantId, cashierShiftId: shiftId, status: "completed" },
      distinct: ["customerId"],
      select: { customerId: true },
    }),
    prisma.pointsLedger.count({
      where: {
        tenantId,
        type: "adjust",
        source: "manual",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.anomalySignal.findMany({
      where: {
        tenantId,
        cashierShiftId: shiftId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        severity: true,
        payload: true,
        createdAt: true,
      },
    }),
  ]);

  const cust = new Set<string>();
  for (const v of visitDistinct) cust.add(v.customerId);
  for (const r of redemptionDistinct) cust.add(r.customerId);

  return {
    scope: "shift",
    shift: {
      id: sh.id,
      status: sh.status,
      startedAt: sh.startedAt.toISOString(),
      endedAt: sh.endedAt?.toISOString() ?? null,
      durationMs: shiftDurationMs(sh.startedAt, sh.endedAt, now),
      user: sh.user,
      deviceSession: {
        id: sh.deviceSession.id,
        deviceLabel: sh.deviceSession.deviceLabel,
        branchId: sh.deviceSession.branchId,
      },
    },
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    totalVisits: visitCount,
    totalPointsIssued: visitSum._sum.pointsEarned ?? 0,
    totalRewardsRedeemed: redemptionCount,
    totalPointsRedeemed: redemptionSum._sum.pointsSpent ?? 0,
    pendingClaimsOpenedInPeriod: pendingOpened,
    rejectedClaimsInPeriod: rejectedAudit,
    uniqueCustomersServed: cust.size,
    manualAdjustmentCount: manualAdj,
    anomalyCountInPeriod: anomalyRows.length,
    anomalies: anomalyRows.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      createdAt: a.createdAt.toISOString(),
      payload: a.payload as Record<string, unknown>,
    })),
  };
}

function utcDayBounds(dateYmd: string): { start: Date; end: Date } {
  const [y, m, d] = dateYmd.split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !d) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getBranchDayClosingSummary(
  tenantId: string,
  branchId: string,
  _viewerUserId: string,
  membershipRole: string | null | undefined,
  dateYmd: string,
  opts?: { platformAdmin?: boolean },
): Promise<ClosingSummaryDto> {
  if (!isManagerRole(membershipRole) && !opts?.platformAdmin) {
    const err = Object.assign(new Error("forbidden"), { statusCode: 403 });
    throw err;
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId },
  });
  if (!branch) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }

  const { start, end } = utcDayBounds(dateYmd);

  const branchOr = {
    OR: [
      { deviceSession: { branchId } },
      { cashierShift: { deviceSession: { branchId } } },
    ],
  };

  const [
    visitCount,
    visitSum,
    redemptionCount,
    redemptionSum,
    pendingOpened,
    rejectedAudit,
    visitDistinct,
    redemptionDistinct,
    manualAdj,
    anomalyRows,
  ] = await Promise.all([
    prisma.visit.count({
      where: {
        tenantId,
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
    }),
    prisma.visit.aggregate({
      where: {
        tenantId,
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
      _sum: { pointsEarned: true },
    }),
    prisma.redemption.count({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
    }),
    prisma.redemption.aggregate({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
      _sum: { pointsSpent: true },
    }),
    prisma.redemption.count({
      where: {
        tenantId,
        status: "pending",
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.auditEvent.count({
      where: {
        tenantId,
        eventType: "reward_rejected",
        branchId,
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.visit.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
      distinct: ["customerId"],
      select: { customerId: true },
    }),
    prisma.redemption.findMany({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: start, lt: end },
        ...branchOr,
      },
      distinct: ["customerId"],
      select: { customerId: true },
    }),
    prisma.pointsLedger.count({
      where: {
        tenantId,
        type: "adjust",
        source: "manual",
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.anomalySignal.findMany({
      where: {
        tenantId,
        branchId,
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        severity: true,
        payload: true,
        createdAt: true,
      },
    }),
  ]);

  const cust = new Set<string>();
  for (const v of visitDistinct) cust.add(v.customerId);
  for (const r of redemptionDistinct) cust.add(r.customerId);

  return {
    scope: "branch_day",
    branch: { id: branch.id, name: branch.name },
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    totalVisits: visitCount,
    totalPointsIssued: visitSum._sum.pointsEarned ?? 0,
    totalRewardsRedeemed: redemptionCount,
    totalPointsRedeemed: redemptionSum._sum.pointsSpent ?? 0,
    pendingClaimsOpenedInPeriod: pendingOpened,
    rejectedClaimsInPeriod: rejectedAudit,
    uniqueCustomersServed: cust.size,
    manualAdjustmentCount: manualAdj,
    anomalyCountInPeriod: anomalyRows.length,
    anomalies: anomalyRows.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      createdAt: a.createdAt.toISOString(),
      payload: a.payload as Record<string, unknown>,
    })),
  };
}
