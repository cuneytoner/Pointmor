import type { AuditActorType, Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { redactJsonForExport } from "./export-redaction.js";
import { recordAuditEvent } from "./operational-audit-service.js";

/** Tamamlanan ödül kullanımı (vardiya başına) — olağanüstü yüksek hacim. */
export const HIGH_REDEMPTION_COUNT_PER_SHIFT = 50;

/** Kısa sürede çok sayıda talep oluşturma (müşteri başına). */
export const CLAIM_VELOCITY_WINDOW_MS = 15 * 60 * 1000;
export const CLAIM_VELOCITY_THRESHOLD = 5;

/** Manuel puan düzeltmesi uyarı eşiği (mutlak değer). */
export const MANUAL_POINTS_ADJUST_WARN_THRESHOLD = 500;

export type AnomalyCreateInput = {
  tenantId: string;
  type: string;
  severity?: string;
  branchId?: string | null;
  cashierShiftId?: string | null;
  customerId?: string | null;
  payload?: Record<string, unknown>;
  sourceAuditEventId?: string | null;
};

export async function createAnomalySignal(input: AnomalyCreateInput) {
  return prisma.anomalySignal.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      severity: input.severity ?? "warn",
      branchId: input.branchId ?? null,
      cashierShiftId: input.cashierShiftId ?? null,
      customerId: input.customerId ?? null,
      payload: (input.payload ?? {}) as object,
      sourceAuditEventId: input.sourceAuditEventId ?? null,
    },
  });
}

/** Vardiyada tamamlanan ödül kullanımı sayısı eşiği. */
export async function maybeFlagHighRedemptionVolume(params: {
  tenantId: string;
  cashierShiftId: string | null | undefined;
  branchId: string | null;
  sourceAuditEventId?: string;
}) {
  if (!params.cashierShiftId) return null;
  const count = await prisma.redemption.count({
    where: {
      tenantId: params.tenantId,
      cashierShiftId: params.cashierShiftId,
      status: "completed",
    },
  });
  if (count < HIGH_REDEMPTION_COUNT_PER_SHIFT) return null;
  return createAnomalySignal({
    tenantId: params.tenantId,
    type: "high_redemption_volume_in_shift",
    branchId: params.branchId,
    cashierShiftId: params.cashierShiftId,
    payload: { completedRedemptionsInShift: count },
    sourceAuditEventId: params.sourceAuditEventId ?? null,
  });
}

/** Aynı müşteri için kısa sürede çok sayıda ödül kaydı (talep + tamamlanan). */
export async function maybeFlagClaimVelocity(params: {
  tenantId: string;
  customerId: string;
  branchId: string | null;
}) {
  const since = new Date(Date.now() - CLAIM_VELOCITY_WINDOW_MS);
  const recent = await prisma.redemption.count({
    where: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      createdAt: { gte: since },
    },
  });
  if (recent < CLAIM_VELOCITY_THRESHOLD) return null;
  return createAnomalySignal({
    tenantId: params.tenantId,
    type: "repeat_claim_attempts_short_window",
    branchId: params.branchId,
    customerId: params.customerId,
    payload: { redemptionRowsInWindow: recent, windowMs: CLAIM_VELOCITY_WINDOW_MS },
  });
}

/** Aynı müşteride birden fazla bekleyen ödül (farklı ödüller). */
export async function maybeFlagDuplicatePendingPattern(params: {
  tenantId: string;
  customerId: string;
  branchId: string | null;
}) {
  const pending = await prisma.redemption.count({
    where: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      status: "pending",
    },
  });
  if (pending < 2) return null;
  return createAnomalySignal({
    tenantId: params.tenantId,
    type: "duplicate_pending_reward_pattern",
    branchId: params.branchId,
    customerId: params.customerId,
    payload: { pendingCount: pending },
  });
}

/** Onay/redemption aktif vardiya veya oturum olmadan (payload’da işaret). */
export async function maybeFlagOperationOutsideSession(params: {
  tenantId: string;
  eventType: string;
  entityId: string;
  actorType: AuditActorType;
  hasCashierContext: boolean;
  branchId: string | null;
  customerId?: string | null;
  sourceAuditEventId?: string;
}) {
  if (params.hasCashierContext) return null;
  if (params.actorType !== "cashier") return null;
  return createAnomalySignal({
    tenantId: params.tenantId,
    type: "operation_outside_active_session",
    branchId: params.branchId,
    customerId: params.customerId ?? null,
    payload: {
      eventType: params.eventType,
      entityId: params.entityId,
    },
    sourceAuditEventId: params.sourceAuditEventId ?? null,
  });
}

/** Manuel puan düzeltmesi büyük tutar (ledger satırı oluşunca). */
export async function maybeFlagManualPointsAdjustment(params: {
  tenantId: string;
  branchId: string | null;
  customerId: string;
  points: number;
  ledgerId: string;
  actorUserId?: string | null;
}) {
  const abs = Math.abs(params.points);
  if (abs < MANUAL_POINTS_ADJUST_WARN_THRESHOLD) return null;
  const ev = await recordAuditEvent({
    tenantId: params.tenantId,
    actorUserId: params.actorUserId ?? null,
    actorType: "manager",
    branchId: params.branchId,
    eventType: "points_adjusted",
    entityType: "customer",
    entityId: params.customerId,
    payload: {
      ledgerId: params.ledgerId,
      points: params.points,
    },
  });
  const sig = await createAnomalySignal({
    tenantId: params.tenantId,
    type: "manual_points_adjustment_above_threshold",
    branchId: params.branchId,
    customerId: params.customerId,
    payload: { points: params.points, threshold: MANUAL_POINTS_ADJUST_WARN_THRESHOLD },
    sourceAuditEventId: ev.id,
  });
  return { audit: ev, anomaly: sig };
}

export async function listAnomalySignalsForTenant(
  tenantId: string,
  opts: {
    take: number;
    cursorCreatedAt?: Date;
    cashierShiftId?: string;
    branchId?: string;
  },
) {
  const take = Math.min(Math.max(opts.take, 1), 200);
  const rows = await prisma.anomalySignal.findMany({
    where: {
      tenantId,
      ...(opts.cashierShiftId ? { cashierShiftId: opts.cashierShiftId } : {}),
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(opts.cursorCreatedAt
        ? { createdAt: { lt: opts.cursorCreatedAt } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    select: {
      id: true,
      type: true,
      severity: true,
      branchId: true,
      cashierShiftId: true,
      customerId: true,
      payload: true,
      sourceAuditEventId: true,
      createdAt: true,
    },
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!.createdAt.toISOString() : null;
  return {
    items: page.map((r) => ({
      ...r,
      payload: r.payload as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function listAnomalySignalsForExport(
  tenantId: string,
  opts: {
    maxRows: number;
    from?: Date;
    to?: Date;
    branchId?: string;
  },
) {
  const take = Math.min(Math.max(opts.maxRows, 1), 5000);
  const createdAt: Prisma.DateTimeFilter | undefined =
    opts.from || opts.to
      ? {
          ...(opts.from ? { gte: opts.from } : {}),
          ...(opts.to ? { lte: opts.to } : {}),
        }
      : undefined;
  const where: Prisma.AnomalySignalWhereInput = {
    tenantId,
    ...(createdAt ? { createdAt } : {}),
    ...(opts.branchId ? { branchId: opts.branchId } : {}),
  };
  const rows = await prisma.anomalySignal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      severity: true,
      branchId: true,
      cashierShiftId: true,
      customerId: true,
      payload: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    branchId: r.branchId,
    cashierShiftId: r.cashierShiftId,
    customerId: r.customerId,
    payload: redactJsonForExport(r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}
