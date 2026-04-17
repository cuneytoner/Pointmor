import type { Plan } from "../generated/prisma/client.js";

/**
 * Ürün / faturalama katmanı — plan slug + planType ile türetilir.
 * - `starter` veya free → free
 * - `growth` / `scale` / `enterprise` → growth (geniş aralık)
 * - diğer ücretli planlar → pro (orta katman; gelecekteki `pro` slug dahil)
 */
export type RetentionCommercialTier = "free" | "pro" | "growth";

export function retentionTierFromPlan(plan: Pick<Plan, "slug" | "planType">): RetentionCommercialTier {
  const slug = plan.slug.trim().toLowerCase();
  if (plan.planType === "free" || slug === "starter") return "free";
  if (slug === "growth" || slug === "scale" || slug === "enterprise") return "growth";
  return "pro";
}

/** free: tek değer (sabit politika). pro: küçük whitelist. growth: min–max. */
export type RetentionFieldLimits = {
  operationalAudit: { kind: "fixed"; value: number } | { kind: "enum"; values: readonly number[] } | { kind: "range"; min: number; max: number };
  exportAudit: { kind: "fixed"; value: number } | { kind: "enum"; values: readonly number[] } | { kind: "range"; min: number; max: number };
  messaging: { kind: "fixed"; value: number } | { kind: "enum"; values: readonly number[] } | { kind: "range"; min: number; max: number };
  anomaly: { kind: "fixed"; value: number } | { kind: "enum"; values: readonly number[] } | { kind: "range"; min: number; max: number };
};

const FREE_FIXED = {
  operationalAudit: { kind: "fixed" as const, value: 30 },
  exportAudit: { kind: "fixed" as const, value: 30 },
  messaging: { kind: "fixed" as const, value: 30 },
  anomaly: { kind: "fixed" as const, value: 30 },
};

const PRO_ENUMS = {
  operationalAudit: { kind: "enum" as const, values: [30, 60, 90] as const },
  exportAudit: { kind: "enum" as const, values: [30, 60, 90] as const },
  messaging: { kind: "enum" as const, values: [30, 60] as const },
  anomaly: { kind: "enum" as const, values: [30, 60, 90] as const },
};

const GROWTH_RANGES = {
  operationalAudit: { kind: "range" as const, min: 30, max: 365 },
  exportAudit: { kind: "range" as const, min: 30, max: 365 },
  messaging: { kind: "range" as const, min: 7, max: 180 },
  anomaly: { kind: "range" as const, min: 30, max: 365 },
};

export function getRetentionFieldLimitsForTier(tier: RetentionCommercialTier): RetentionFieldLimits {
  switch (tier) {
    case "free":
      return FREE_FIXED;
    case "pro":
      return PRO_ENUMS;
    case "growth":
      return GROWTH_RANGES;
    default:
      return FREE_FIXED;
  }
}

/** Tier varsayılanları (satır yokken veya plan yükseltmede orta değer). */
export function defaultRetentionDaysForTier(tier: RetentionCommercialTier): {
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
} {
  if (tier === "growth") {
    return {
      operationalAuditDays: 90,
      exportAuditDays: 90,
      messagingDays: 45,
      anomalyDays: 90,
    };
  }
  const lim = getRetentionFieldLimitsForTier(tier);
  const pick = (f: RetentionFieldLimits["operationalAudit"]): number => {
    if (f.kind === "fixed") return f.value;
    if (f.kind === "enum") return f.values[Math.floor(f.values.length / 2)]!;
    return Math.round((f.min + f.max) / 2);
  };
  return {
    operationalAuditDays: pick(lim.operationalAudit),
    exportAuditDays: pick(lim.exportAudit),
    messagingDays: pick(lim.messaging),
    anomalyDays: pick(lim.anomaly),
  };
}

export function clampRetentionDays(
  field: keyof RetentionFieldLimits,
  tier: RetentionCommercialTier,
  value: number,
): number {
  const lim = getRetentionFieldLimitsForTier(tier)[field];
  const n = Math.floor(value);
  if (lim.kind === "fixed") return lim.value;
  if (lim.kind === "enum") return lim.values.includes(n) ? n : lim.values[0]!;
  return Math.max(lim.min, Math.min(lim.max, n));
}

export function validateRetentionDaysForTier(
  tier: RetentionCommercialTier,
  input: {
    operationalAuditDays: number;
    exportAuditDays: number;
    messagingDays: number;
    anomalyDays: number;
  },
): { ok: true } | { ok: false; error: string; field?: string } {
  const lim = getRetentionFieldLimitsForTier(tier);
  const check = (key: keyof typeof input, field: keyof RetentionFieldLimits, label: string) => {
    const v = input[key];
    const l = lim[field];
    if (l.kind === "fixed" && v !== l.value) {
      return { ok: false as const, error: `retention_invalid_${label}`, field: key };
    }
    if (l.kind === "enum" && !l.values.includes(v)) {
      return { ok: false as const, error: `retention_invalid_${label}`, field: key };
    }
    if (l.kind === "range" && (v < l.min || v > l.max)) {
      return { ok: false as const, error: `retention_out_of_range_${label}`, field: key };
    }
    return { ok: true as const };
  };
  const a = check("operationalAuditDays", "operationalAudit", "operational");
  if (!a.ok) return a;
  const b = check("exportAuditDays", "exportAudit", "export");
  if (!b.ok) return b;
  const c = check("messagingDays", "messaging", "messaging");
  if (!c.ok) return c;
  const d = check("anomalyDays", "anomaly", "anomaly");
  if (!d.ok) return d;
  return { ok: true };
}
