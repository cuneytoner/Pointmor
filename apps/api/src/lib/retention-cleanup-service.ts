import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import {
  cutoffDate,
  EXPORT_EVENT_TYPE,
  getEffectiveRetentionConfig,
  type RetentionDataType,
} from "./retention-config.js";
import { getEffectiveDaysForTenantCleanup } from "./tenant-retention-service.js";

export type RetentionCleanupOptions = {
  dryRun?: boolean;
  tenantId?: string;
  only?: RetentionDataType[];
};

export type RetentionCleanupTableResult = {
  key: string;
  deleted: number;
  batchesRun: number;
  skipped?: string;
};

export type RetentionCleanupResult = {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  tables: RetentionCleanupTableResult[];
  totalDeleted: number;
};

async function deleteChunked(
  batchSize: number,
  maxBatches: number,
  ops: {
    findIds: (take: number) => Promise<{ id: string }[]>;
    removeIds: (ids: string[]) => Promise<number>;
  },
): Promise<{ deleted: number; batchesRun: number }> {
  let deleted = 0;
  let batchesRun = 0;
  while (batchesRun < maxBatches) {
    const rows = await ops.findIds(batchSize);
    if (rows.length === 0) break;
    const ids = rows.map((r) => r.id);
    const n = await ops.removeIds(ids);
    deleted += n;
    batchesRun += 1;
    if (rows.length < batchSize) break;
  }
  return { deleted, batchesRun };
}

function mergeAgg(
  agg: Map<string, { deleted: number; batchesRun: number }>,
  key: string,
  r: { deleted: number; batchesRun: number },
) {
  const prev = agg.get(key) ?? { deleted: 0, batchesRun: 0 };
  agg.set(key, {
    deleted: prev.deleted + r.deleted,
    batchesRun: prev.batchesRun + r.batchesRun,
  });
}

async function cleanupConfigurableTenantSlice(params: {
  tenantId: string;
  days: {
    operationalAuditDays: number;
    exportAuditDays: number;
    messagingDays: number;
    anomalyDays: number;
  };
  cfg: ReturnType<typeof getEffectiveRetentionConfig>;
  dryRun: boolean;
  want: (t: RetentionDataType) => boolean;
}): Promise<RetentionCleanupTableResult[]> {
  const { tenantId, days, cfg, dryRun, want } = params;
  const out: RetentionCleanupTableResult[] = [];
  if (want("export_audit")) {
    const cutoff = cutoffDate(days.exportAuditDays);
    const where: Prisma.AuditEventWhereInput = {
      tenantId,
      eventType: EXPORT_EVENT_TYPE,
      createdAt: { lt: cutoff },
    };
    if (dryRun) {
      const c = await prisma.auditEvent.count({ where });
      out.push({ key: "export_audit", deleted: c, batchesRun: 0 });
    } else {
      const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
        findIds: (take) =>
          prisma.auditEvent.findMany({
            where,
            select: { id: true },
            take,
            orderBy: { createdAt: "asc" },
          }),
        removeIds: async (ids) =>
          (await prisma.auditEvent.deleteMany({ where: { id: { in: ids } } })).count,
      });
      console.info("retention_cleanup", { key: "export_audit", tenantId, deleted, batchesRun });
      out.push({ key: "export_audit", deleted, batchesRun });
    }
  }

  if (want("operational_audit")) {
    const cutoff = cutoffDate(days.operationalAuditDays);
    const where: Prisma.AuditEventWhereInput = {
      tenantId,
      eventType: { not: EXPORT_EVENT_TYPE },
      createdAt: { lt: cutoff },
    };
    if (dryRun) {
      const c = await prisma.auditEvent.count({ where });
      out.push({ key: "operational_audit", deleted: c, batchesRun: 0 });
    } else {
      const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
        findIds: (take) =>
          prisma.auditEvent.findMany({
            where,
            select: { id: true },
            take,
            orderBy: { createdAt: "asc" },
          }),
        removeIds: async (ids) =>
          (await prisma.auditEvent.deleteMany({ where: { id: { in: ids } } })).count,
      });
      console.info("retention_cleanup", { key: "operational_audit", tenantId, deleted, batchesRun });
      out.push({ key: "operational_audit", deleted, batchesRun });
    }
  }

  if (want("anomaly_signal")) {
    const cutoff = cutoffDate(days.anomalyDays);
    const where: Prisma.AnomalySignalWhereInput = {
      tenantId,
      createdAt: { lt: cutoff },
    };
    if (dryRun) {
      const c = await prisma.anomalySignal.count({ where });
      out.push({ key: "anomaly_signal", deleted: c, batchesRun: 0 });
    } else {
      const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
        findIds: (take) =>
          prisma.anomalySignal.findMany({
            where,
            select: { id: true },
            take,
            orderBy: { createdAt: "asc" },
          }),
        removeIds: async (ids) =>
          (await prisma.anomalySignal.deleteMany({ where: { id: { in: ids } } })).count,
      });
      console.info("retention_cleanup", { key: "anomaly_signal", tenantId, deleted, batchesRun });
      out.push({ key: "anomaly_signal", deleted, batchesRun });
    }
  }

  if (want("notification_delivery")) {
    const cutoff = cutoffDate(days.messagingDays);
    const where: Prisma.NotificationDeliveryWhereInput = {
      tenantId,
      createdAt: { lt: cutoff },
    };
    if (dryRun) {
      const c = await prisma.notificationDelivery.count({ where });
      out.push({ key: "notification_delivery", deleted: c, batchesRun: 0 });
    } else {
      const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
        findIds: (take) =>
          prisma.notificationDelivery.findMany({
            where,
            select: { id: true },
            take,
            orderBy: { createdAt: "asc" },
          }),
        removeIds: async (ids) =>
          (await prisma.notificationDelivery.deleteMany({ where: { id: { in: ids } } })).count,
      });
      console.info("retention_cleanup", { key: "notification_delivery", tenantId, deleted, batchesRun });
      out.push({ key: "notification_delivery", deleted, batchesRun });
    }
  }

  return out;
}

/**
 * Günlük retention job — kiracı bazlı süreler (`TenantRetentionSettings` + plan katmanı).
 * Ürün analitiği ve platform AuditLog hâlâ env (`retention-config`) ile yönetilir.
 */
export async function runRetentionCleanup(
  options: RetentionCleanupOptions = {},
): Promise<RetentionCleanupResult> {
  const startedAt = new Date().toISOString();
  const cfg = getEffectiveRetentionConfig();
  const dryRun = Boolean(options.dryRun);

  const want = (t: RetentionDataType): boolean => {
    if (options.only && options.only.length > 0) return options.only.includes(t);
    return true;
  };

  const tables: RetentionCleanupTableResult[] = [];
  let totalDeleted = 0;

  const run = async (fn: () => Promise<RetentionCleanupTableResult>) => {
    const r = await fn();
    tables.push(r);
    totalDeleted += r.deleted;
  };

  const tenantIds = options.tenantId
    ? [options.tenantId]
    : (await prisma.tenant.findMany({ select: { id: true } })).map((x) => x.id);

  const agg = new Map<string, { deleted: number; batchesRun: number }>();

  for (const tid of tenantIds) {
    const days = await getEffectiveDaysForTenantCleanup(tid);
    const slice = await cleanupConfigurableTenantSlice({
      tenantId: tid,
      days,
      cfg,
      dryRun,
      want,
    });
    for (const row of slice) {
      mergeAgg(agg, row.key, { deleted: row.deleted, batchesRun: row.batchesRun });
    }
  }

  for (const [key, v] of agg) {
    tables.push({ key: `${key}_total`, deleted: v.deleted, batchesRun: v.batchesRun });
    totalDeleted += v.deleted;
  }

  // Platform AuditLog — yalnızca global job
  if (want("platform_audit_log") && !options.tenantId) {
    const rule = cfg.rules.get("platform_audit_log");
    const days = rule?.effectiveDays;
    await run(async () => {
      if (days == null) {
        return { key: "platform_audit_log", deleted: 0, batchesRun: 0, skipped: "disabled" };
      }
      const cutoff = cutoffDate(days);
      const where = { createdAt: { lt: cutoff } };
      if (dryRun) {
        const c = await prisma.auditLog.count({ where });
        return { key: "platform_audit_log", deleted: c, batchesRun: 0 };
      }
      const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
        findIds: (take) =>
          prisma.auditLog.findMany({
            where,
            select: { id: true },
            take,
            orderBy: { createdAt: "asc" },
          }),
        removeIds: async (ids) =>
          (await prisma.auditLog.deleteMany({ where: { id: { in: ids } } })).count,
      });
      console.info("retention_cleanup", { key: "platform_audit_log", deleted, batchesRun });
      return { key: "platform_audit_log", deleted, batchesRun };
    });
  }

  // Ürün analitiği — env süresi; kiracı bazlı filtre
  if (want("product_analytics_event")) {
    const rule = cfg.rules.get("product_analytics_event");
    const days = rule?.effectiveDays;
    await run(async () => {
      if (days == null) {
        return { key: "product_analytics_event", deleted: 0, batchesRun: 0, skipped: "disabled" };
      }
      const cutoff = cutoffDate(days);
      let deletedTotal = 0;
      let batchesTotal = 0;
      const scope = options.tenantId ? [options.tenantId] : tenantIds;
      for (const tid of scope) {
        const where: Prisma.ProductAnalyticsEventWhereInput = {
          tenantId: tid,
          createdAt: { lt: cutoff },
        };
        if (dryRun) {
          deletedTotal += await prisma.productAnalyticsEvent.count({ where });
        } else {
          const { deleted, batchesRun } = await deleteChunked(cfg.batchSize, cfg.maxBatchesPerTable, {
            findIds: (take) =>
              prisma.productAnalyticsEvent.findMany({
                where,
                select: { id: true },
                take,
                orderBy: { createdAt: "asc" },
              }),
            removeIds: async (ids) =>
              (await prisma.productAnalyticsEvent.deleteMany({ where: { id: { in: ids } } })).count,
          });
          deletedTotal += deleted;
          batchesTotal += batchesRun;
        }
      }
      console.info("retention_cleanup", {
        key: "product_analytics_event",
        deleted: deletedTotal,
        batchesRun: batchesTotal,
      });
      return { key: "product_analytics_event", deleted: deletedTotal, batchesRun: batchesTotal };
    });
  }

  const finishedAt = new Date().toISOString();
  console.info("retention_cleanup_done", {
    startedAt,
    finishedAt,
    dryRun,
    totalDeleted,
    tenantId: options.tenantId ?? null,
  });

  return {
    startedAt,
    finishedAt,
    dryRun,
    tables,
    totalDeleted,
  };
}
