import type { AuditActorType, AuditEntityType } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

export type RecordAuditEventInput = {
  tenantId: string;
  actorUserId?: string | null;
  actorType: AuditActorType;
  branchId?: string | null;
  deviceSessionId?: string | null;
  cashierShiftId?: string | null;
  eventType: string;
  entityType: AuditEntityType;
  entityId: string;
  payload?: Record<string, unknown>;
};

/**
 * Operasyonel audit kaydı — güncelleme yok; yalnızca ekleme.
 */
export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType,
      branchId: input.branchId ?? null,
      deviceSessionId: input.deviceSessionId ?? null,
      cashierShiftId: input.cashierShiftId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: (input.payload ?? {}) as object,
    },
  });
}

export async function resolveBranchFromDeviceSession(
  tenantId: string,
  deviceSessionId: string | null | undefined,
): Promise<string | null> {
  if (!deviceSessionId) return null;
  const ds = await prisma.deviceSession.findFirst({
    where: { id: deviceSessionId, tenantId },
    select: { branchId: true },
  });
  return ds?.branchId ?? null;
}

export async function listAuditEventsForTenant(
  tenantId: string,
  opts: {
    take: number;
    cursorCreatedAt?: Date;
    eventType?: string;
    cashierShiftId?: string;
    branchId?: string;
  },
) {
  const take = Math.min(Math.max(opts.take, 1), 200);
  const where = {
    tenantId,
    ...(opts.eventType ? { eventType: opts.eventType } : {}),
    ...(opts.cashierShiftId ? { cashierShiftId: opts.cashierShiftId } : {}),
    ...(opts.branchId ? { branchId: opts.branchId } : {}),
    ...(opts.cursorCreatedAt
      ? { createdAt: { lt: opts.cursorCreatedAt } }
      : {}),
  };
  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    select: {
      id: true,
      actorUserId: true,
      actorType: true,
      branchId: true,
      deviceSessionId: true,
      cashierShiftId: true,
      eventType: true,
      entityType: true,
      entityId: true,
      payload: true,
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
