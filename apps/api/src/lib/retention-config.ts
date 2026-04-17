/**
 * Veri saklama politikası — varsayılan süreler ve env ile override.
 * İleride kiracı bazlı override için `Tenant` üzerinde JSON veya ayrı tablo eklenebilir;
 * şimdilik tek doğruluk kaynağı bu modül + ortam değişkenleri.
 */

export const EXPORT_EVENT_TYPE = "EXPORT" as const;

/** İş değeri yüksek / otomatik silinmez. */
export type RetentionDataType =
  | "operational_audit"
  | "export_audit"
  | "anomaly_signal"
  | "notification_delivery"
  | "platform_audit_log"
  | "product_analytics_event"
  /** Ziyaret ve ilişkili işlem kayıtları — varsayılan otomatik silme yok */
  | "visit_activity";

export type CleanupStrategy = "delete" | "archive_future";

export type RetentionRule = {
  dataType: RetentionDataType;
  /** `null` = otomatik temizlik uygulanmaz */
  retentionDays: number | null;
  cleanupStrategy: CleanupStrategy;
  description: string;
};

const DAY_MS = 86_400_000;

function parsePositiveInt(envVal: string | undefined, fallback: number, max: number): number {
  if (envVal === undefined || envVal.trim() === "") return fallback;
  const n = Number.parseInt(envVal.trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(n, max));
}

function parseOptionalDays(envVal: string | undefined, fallback: number | null): number | null {
  if (envVal === undefined || envVal.trim() === "") return fallback;
  const t = envVal.trim().toLowerCase();
  if (t === "never" || t === "off" || t === "0") return null;
  const n = Number.parseInt(envVal.trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return null;
  return Math.max(1, Math.min(n, 3650));
}

/** Varsayılan kurallar (görev spesifikasyonu ile uyumlu). */
export const DEFAULT_RETENTION_RULES: readonly RetentionRule[] = [
  {
    dataType: "operational_audit",
    retentionDays: 90,
    cleanupStrategy: "delete",
    description: "Operasyonel AuditEvent (EXPORT hariç)",
  },
  {
    dataType: "export_audit",
    retentionDays: 30,
    cleanupStrategy: "delete",
    description: "EXPORT tipi denetim kayıtları (dışa aktarım meta)",
  },
  {
    dataType: "anomaly_signal",
    retentionDays: 60,
    cleanupStrategy: "delete",
    description: "Anomali sinyalleri",
  },
  {
    dataType: "notification_delivery",
    retentionDays: 45,
    cleanupStrategy: "delete",
    description: "Mesajlaşma / bildirim teslim logları",
  },
  {
    dataType: "platform_audit_log",
    retentionDays: 90,
    cleanupStrategy: "delete",
    description: "Platform AuditLog (legacy)",
  },
  {
    dataType: "product_analytics_event",
    retentionDays: 180,
    cleanupStrategy: "delete",
    description: "Ürün analitiği olayları (maliyet kontrolü)",
  },
  {
    dataType: "visit_activity",
    retentionDays: null,
    cleanupStrategy: "archive_future",
    description: "Ziyaret ve sadakat işlemleri — varsayılan saklama; silme yok",
  },
] as const;

export type EffectiveRetentionConfig = {
  rules: Map<RetentionDataType, RetentionRule & { effectiveDays: number | null }>;
  batchSize: number;
  maxBatchesPerTable: number;
};

/**
 * Ortam değişkenlerinden efektif gün sayıları.
 * `RETENTION_*_DAYS=never` → otomatik silme kapalı (ilgili tablo atlanır).
 */
export function getEffectiveRetentionConfig(): EffectiveRetentionConfig {
  const batchSize = parsePositiveInt(process.env.RETENTION_CLEANUP_BATCH_SIZE, 500, 5000);
  const maxBatches = parsePositiveInt(process.env.RETENTION_CLEANUP_MAX_BATCHES_PER_TABLE, 2000, 50_000);

  const rules = new Map<RetentionDataType, RetentionRule & { effectiveDays: number | null }>();

  const opDays = parseOptionalDays(process.env.RETENTION_OPERATIONAL_AUDIT_DAYS, 90);
  const exDays = parseOptionalDays(process.env.RETENTION_EXPORT_AUDIT_DAYS, 30);
  const anDays = parseOptionalDays(process.env.RETENTION_ANOMALY_DAYS, 60);
  const msgDays = parseOptionalDays(process.env.RETENTION_MESSAGING_DELIVERY_DAYS, 45);
  const palDays = parseOptionalDays(process.env.RETENTION_PLATFORM_AUDIT_LOG_DAYS, 90);
  const paeDays = parseOptionalDays(process.env.RETENTION_PRODUCT_ANALYTICS_DAYS, 180);

  rules.set("operational_audit", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "operational_audit")!,
    retentionDays: opDays,
    effectiveDays: opDays,
  });
  rules.set("export_audit", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "export_audit")!,
    retentionDays: exDays,
    effectiveDays: exDays,
  });
  rules.set("anomaly_signal", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "anomaly_signal")!,
    retentionDays: anDays,
    effectiveDays: anDays,
  });
  rules.set("notification_delivery", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "notification_delivery")!,
    retentionDays: msgDays,
    effectiveDays: msgDays,
  });
  rules.set("platform_audit_log", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "platform_audit_log")!,
    retentionDays: palDays,
    effectiveDays: palDays,
  });
  rules.set("product_analytics_event", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "product_analytics_event")!,
    retentionDays: paeDays,
    effectiveDays: paeDays,
  });
  rules.set("visit_activity", {
    ...DEFAULT_RETENTION_RULES.find((r) => r.dataType === "visit_activity")!,
    retentionDays: null,
    effectiveDays: null,
  });

  return {
    rules,
    batchSize: Math.min(Math.max(batchSize, 50), 5000),
    maxBatchesPerTable: Math.min(Math.max(maxBatches, 1), 50_000),
  };
}

export function cutoffDate(retentionDays: number): Date {
  return new Date(Date.now() - retentionDays * DAY_MS);
}

/**
 * İleride: tenantId ile DB’den override okunur; şimdilik global config döner.
 */
export function getRetentionPolicyForTenant(_tenantId: string | undefined): EffectiveRetentionConfig {
  return getEffectiveRetentionConfig();
}

export type PublicRetentionPolicyItem = {
  dataType: RetentionDataType;
  labelKey: string;
  retentionDays: number | null;
  cleanupStrategy: CleanupStrategy;
  description: string;
};

/** Admin UI / API için salt okunur özet */
export function getPublicRetentionPolicySummary(): PublicRetentionPolicyItem[] {
  const cfg = getEffectiveRetentionConfig();
  return Array.from(cfg.rules.values()).map((r) => ({
    dataType: r.dataType,
    labelKey: `retention.dataType.${r.dataType}`,
    retentionDays: r.effectiveDays,
    cleanupStrategy: r.cleanupStrategy,
    description: r.description,
  }));
}
