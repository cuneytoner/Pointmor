import { randomUUID } from "node:crypto";
import type { AuditActorType, AuditEntityType, Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { redactJsonForExport } from "./export-redaction.js";

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

export type AuditExportFilters = {
  maxRows: number;
  from?: Date;
  to?: Date;
  eventType?: string;
  actorUserId?: string;
  branchId?: string;
  entityType?: AuditEntityType;
  /** Belirli varlık kaydı (ör. visit id). */
  entityId?: string;
};

/**
 * Dışa aktarım için audit sorgusu — tenant izolasyonlu; payload redakte edilir.
 */
export async function queryAuditEventsForExport(
  tenantId: string,
  filters: AuditExportFilters,
): Promise<
  Array<{
    id: string;
    createdAt: string;
    eventType: string;
    entityType: AuditEntityType;
    entityId: string;
    actorType: string;
    actorUserId: string | null;
    payload: Record<string, unknown>;
  }>
> {
  const take = Math.min(Math.max(filters.maxRows, 1), 5000);
  const createdAt: Prisma.DateTimeFilter | undefined =
    filters.from || filters.to
      ? {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        }
      : undefined;
  const where: Prisma.AuditEventWhereInput = {
    tenantId,
    ...(createdAt ? { createdAt } : {}),
    ...(filters.eventType ? { eventType: filters.eventType } : {}),
    ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
  };
  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      eventType: true,
      entityType: true,
      entityId: true,
      actorType: true,
      actorUserId: true,
      payload: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    eventType: r.eventType,
    entityType: r.entityType,
    entityId: r.entityId,
    actorType: r.actorType,
    actorUserId: r.actorUserId,
    payload: redactJsonForExport(r.payload ?? {}) as Record<string, unknown>,
  }));
}

/**
 * Dışa aktarım audit kaydı — içerik yok, yalnızca tür + filtre özeti (PII riski yok).
 * `eventType`: `EXPORT` — dışa aktarılan dosya içeriği yazılmaz.
 * Yazım başarısız olsa bile dışa aktarım yanıtını düşürmez (operasyonel tercih; loglanır).
 */
export async function recordDataExportEvent(input: {
  tenantId: string;
  actorUserId: string;
  kind: string;
  exportType: "CSV" | "PDF" | "JSON";
  filters: Record<string, unknown>;
}): Promise<void> {
  try {
    await recordAuditEvent({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "manager",
      branchId: null,
      deviceSessionId: null,
      cashierShiftId: null,
      eventType: "EXPORT",
      entityType: "other",
      entityId: randomUUID(),
      payload: {
        exportKind: input.kind,
        exportType: input.exportType,
        filters: input.filters,
      },
    });
  } catch (e) {
    console.error("export_audit_write_failed", e);
  }
}

/**
 * İsteğe bağlı saklama politikası — cron / yönetim işi ile çağrılabilir.
 * @returns silinen toplam satır (export + operasyonel audit); süreler env ile.
 */
export async function purgeAuditEventsOlderThan(params: {
  olderThanDays: number;
  tenantId?: string;
}): Promise<number> {
  void params.olderThanDays;
  const { runRetentionCleanup } = await import("./retention-cleanup-service.js");
  const r = await runRetentionCleanup({
    tenantId: params.tenantId,
    only: ["export_audit", "operational_audit"],
  });
  return r.tables.reduce((s, t) => s + t.deleted, 0);
}
