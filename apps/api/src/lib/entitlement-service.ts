import type { Plan, PlanType } from "../generated/prisma/client.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

/** Plan.featureTags ile uyumlu özellik anahtarları. */
export const FEATURE = {
  LOYALTY_CORE: "loyalty_core",
  CUSTOMER_PWA: "customer_pwa",
  CAMPAIGNS: "campaigns",
  GROWTH_AUTOMATION: "growth_automation",
  MANAGER_CLOSING: "manager_closing",
  MULTI_BRANCH: "multi_branch",
  WEBHOOKS: "webhooks",
  PRODUCT_ANALYTICS: "product_analytics",
  /** Franchise / HQ paneli — Pro: özet + leaderboard; Growth + product_analytics: tam insight */
  HQ_DASHBOARD: "hq_dashboard",
  /** HQ AI önerileri (kural tabanlı); batch job + dismiss */
  HQ_AI_INSIGHTS: "hq_ai_insights",
  /** HQ otomasyon motoru (insight → kampanya / denetim kaydı); güvenlik + onay */
  HQ_AUTOMATION: "hq_automation",
  /** Pro: denetim özeti, kısa saklama, PDF özet export — tam CSV/GDPR yok */
  COMPLIANCE_LIMITED: "compliance_limited",
  /** Growth+: tam Compliance Pack (audit CSV/PDF, anomali, GDPR yapılandırılmış export, gelişmiş saklama) */
  COMPLIANCE_FULL: "compliance_full",
} as const;

export type CompliancePackLevel = "none" | "limited" | "full";

export function compliancePackLevelFromContext(ctx: TenantEntitlementContext): CompliancePackLevel {
  if (ctx.features.has(FEATURE.COMPLIANCE_FULL)) return "full";
  if (ctx.features.has(FEATURE.COMPLIANCE_LIMITED)) return "limited";
  return "none";
}

/** Kiracının Compliance Pack satırı var mı (limited veya full). */
export async function hasCompliancePack(tenantId: string): Promise<boolean> {
  const ctx = await getTenantEntitlementContext(tenantId);
  return compliancePackLevelFromContext(ctx) !== "none";
}

export function assertComplianceLimited(ctx: TenantEntitlementContext): void {
  if (
    !ctx.features.has(FEATURE.COMPLIANCE_FULL) &&
    !ctx.features.has(FEATURE.COMPLIANCE_LIMITED)
  ) {
    throw planFeatureError(FEATURE.COMPLIANCE_LIMITED);
  }
}

export function assertComplianceFull(ctx: TenantEntitlementContext): void {
  if (!ctx.features.has(FEATURE.COMPLIANCE_FULL)) {
    throw planFeatureError(FEATURE.COMPLIANCE_FULL);
  }
}

export type LimitMetric =
  | "maxCustomers"
  | "maxActiveRewards"
  | "maxActiveCampaigns"
  | "maxVisitsPerMonth"
  | "maxBranches"
  | "maxStaffUsers";

export type EffectiveLimits = {
  maxCustomers: number | null;
  maxActiveRewards: number | null;
  maxActiveCampaigns: number | null;
  maxVisitsPerMonth: number | null;
  maxBranches: number | null;
  maxStaffUsers: number | null;
  /** 1–100; limite yaklaşınca uyarı (sadece GET entitlements). */
  softWarningPercent: number;
};

export type TenantUsageSnapshot = {
  customerCount: number;
  activeRewardCount: number;
  activeCampaignCount: number;
  monthlyVisitCount: number;
  branchCount: number;
  staffUserCount: number;
};

export type TenantEntitlementContext = {
  tenantId: string;
  plan: Plan;
  limits: EffectiveLimits;
  features: Set<string>;
};

function planFeatureError(feature: string) {
  return Object.assign(new Error("plan_feature_disabled"), {
    statusCode: 403,
    code: "plan_feature_disabled" as const,
    feature,
  });
}

function planLimitError(metric: LimitMetric) {
  return Object.assign(new Error("plan_limit_exceeded"), {
    statusCode: 403,
    code: "plan_limit_exceeded" as const,
    metric,
  });
}

function readLimit(
  raw: Record<string, unknown>,
  key: keyof EffectiveLimits,
  fallback: number | null,
): number | null {
  if (!(key in raw)) return fallback;
  const v = raw[key];
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  return fallback;
}

function readSoftPct(raw: Record<string, unknown>, fallback: number): number {
  const v = raw.softWarningPercent;
  if (typeof v === "number" && v >= 0 && v <= 100) return Math.floor(v);
  return fallback;
}

/** Slug / planType için taban limitler (JSON boşsa). */
function defaultLimitsForPlan(slug: string, planType: PlanType): EffectiveLimits {
  const unlimited: EffectiveLimits = {
    maxCustomers: null,
    maxActiveRewards: null,
    maxActiveCampaigns: null,
    maxVisitsPerMonth: null,
    maxBranches: null,
    maxStaffUsers: null,
    softWarningPercent: 80,
  };
  /** Growth+: çoklu lokasyon sınırsız (slug öncelikli — growth planType’ı da `pro` olabilir). */
  if (slug === "growth" || slug === "scale" || slug === "enterprise") {
    return unlimited;
  }
  /** Pro: çoklu lokasyon ücretli paket — sınırlı şube. */
  if (slug === "pro") {
    return {
      maxCustomers: null,
      maxActiveRewards: null,
      maxActiveCampaigns: null,
      maxVisitsPerMonth: null,
      maxBranches: 5,
      maxStaffUsers: null,
      softWarningPercent: 80,
    };
  }
  if (planType === "pro" || planType === "team") {
    return {
      maxCustomers: null,
      maxActiveRewards: null,
      maxActiveCampaigns: null,
      maxVisitsPerMonth: null,
      maxBranches: 5,
      maxStaffUsers: null,
      softWarningPercent: 80,
    };
  }
  return {
    maxCustomers: 150,
    maxActiveRewards: 8,
    maxActiveCampaigns: 0,
    maxVisitsPerMonth: 1000,
    maxBranches: 1,
    maxStaffUsers: 2,
    softWarningPercent: 80,
  };
}

export function mergeEffectiveLimits(plan: Plan): EffectiveLimits {
  const base = defaultLimitsForPlan(plan.slug, plan.planType);
  const raw =
    plan.limits !== null &&
    typeof plan.limits === "object" &&
    !Array.isArray(plan.limits)
      ? (plan.limits as Record<string, unknown>)
      : {};
  return {
    maxCustomers: readLimit(raw, "maxCustomers", base.maxCustomers),
    maxActiveRewards: readLimit(raw, "maxActiveRewards", base.maxActiveRewards),
    maxActiveCampaigns: readLimit(raw, "maxActiveCampaigns", base.maxActiveCampaigns),
    maxVisitsPerMonth: readLimit(raw, "maxVisitsPerMonth", base.maxVisitsPerMonth),
    maxBranches: readLimit(raw, "maxBranches", base.maxBranches),
    maxStaffUsers: readLimit(raw, "maxStaffUsers", base.maxStaffUsers),
    softWarningPercent: readSoftPct(raw, base.softWarningPercent),
  };
}

export async function resolvePlanForTenant(tenantId: string): Promise<Plan | null> {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (sub?.plan) return sub.plan;
  return prisma.plan.findFirst({
    where: { slug: "starter" },
  });
}

export async function getTenantEntitlementContext(
  tenantId: string,
): Promise<TenantEntitlementContext> {
  const plan = await resolvePlanForTenant(tenantId);
  if (!plan) {
    throw Object.assign(new Error("plan_not_configured"), {
      statusCode: 503,
      code: "plan_not_configured" as const,
    });
  }
  const limits = mergeEffectiveLimits(plan);
  const features = new Set(plan.featureTags ?? []);
  return { tenantId, plan, limits, features };
}

export function assertFeature(ctx: TenantEntitlementContext, feature: string): void {
  if (!ctx.features.has(feature)) {
    throw planFeatureError(feature);
  }
}

export function assertWithinLimit(
  ctx: TenantEntitlementContext,
  metric: LimitMetric,
  current: number,
  delta: number,
): void {
  const cap = ctx.limits[metric];
  if (cap === null) return;
  if (current + delta > cap) {
    throw planLimitError(metric);
  }
}

export function utcMonthRange(d = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getUsageSnapshot(tenantId: string): Promise<TenantUsageSnapshot> {
  const { start, end } = utcMonthRange();
  const [
    customerCount,
    activeRewardCount,
    activeCampaignCount,
    monthlyVisitCount,
    branchCount,
    staffUserCount,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.reward.count({ where: { tenantId, isActive: true } }),
    prisma.campaign.count({
      where: { tenantId, status: "active", isActive: true },
    }),
    prisma.visit.count({
      where: { tenantId, createdAt: { gte: start, lt: end } },
    }),
    prisma.branch.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
  ]);
  return {
    customerCount,
    activeRewardCount,
    activeCampaignCount,
    monthlyVisitCount,
    branchCount,
    staffUserCount,
  };
}

export function isCampaignRowActive(row: {
  status: string;
  isActive: boolean;
}): boolean {
  return row.status === "active" && row.isActive === true;
}

type Warning = { code: string; metric: LimitMetric; percentUsed: number };

function percentUsed(used: number, cap: number | null): number | null {
  if (cap === null || cap <= 0) return null;
  return Math.min(100, Math.round((used / cap) * 1000) / 10);
}

export function buildSoftWarnings(
  limits: EffectiveLimits,
  usage: TenantUsageSnapshot,
): Warning[] {
  const pct = limits.softWarningPercent;
  const out: Warning[] = [];
  const check = (metric: LimitMetric, used: number, cap: number | null) => {
    const pu = percentUsed(used, cap);
    if (pu !== null && pu >= pct) {
      out.push({ code: "approaching_limit", metric, percentUsed: pu });
    }
  };
  check("maxCustomers", usage.customerCount, limits.maxCustomers);
  check("maxActiveRewards", usage.activeRewardCount, limits.maxActiveRewards);
  check("maxActiveCampaigns", usage.activeCampaignCount, limits.maxActiveCampaigns);
  check("maxVisitsPerMonth", usage.monthlyVisitCount, limits.maxVisitsPerMonth);
  check("maxBranches", usage.branchCount, limits.maxBranches);
  check("maxStaffUsers", usage.staffUserCount, limits.maxStaffUsers);
  return out;
}

export function remainingAmount(used: number, cap: number | null): number | null {
  if (cap === null) return null;
  return Math.max(0, cap - used);
}

export async function buildEntitlementsPayload(tenantId: string) {
  const ctx = await getTenantEntitlementContext(tenantId);
  const usage = await getUsageSnapshot(tenantId);
  const { limits, plan } = ctx;
  const warnings = buildSoftWarnings(limits, usage);
  const complianceLevel = compliancePackLevelFromContext(ctx);
  return {
    plan: {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      planType: plan.planType,
    },
    compliance: {
      level: complianceLevel,
    },
    features: Array.from(ctx.features),
    limits: {
      maxCustomers: limits.maxCustomers,
      maxActiveRewards: limits.maxActiveRewards,
      maxActiveCampaigns: limits.maxActiveCampaigns,
      maxVisitsPerMonth: limits.maxVisitsPerMonth,
      maxBranches: limits.maxBranches,
      maxStaffUsers: limits.maxStaffUsers,
      softWarningPercent: limits.softWarningPercent,
    },
    usage,
    remaining: {
      customers: remainingAmount(usage.customerCount, limits.maxCustomers),
      activeRewards: remainingAmount(usage.activeRewardCount, limits.maxActiveRewards),
      activeCampaigns: remainingAmount(
        usage.activeCampaignCount,
        limits.maxActiveCampaigns,
      ),
      visitsThisMonth: remainingAmount(usage.monthlyVisitCount, limits.maxVisitsPerMonth),
      branches: remainingAmount(usage.branchCount, limits.maxBranches),
      staffUsers: remainingAmount(usage.staffUserCount, limits.maxStaffUsers),
    },
    warnings,
    upgradeSuggested: plan.planType === "free" && warnings.length > 0,
  };
}

/** Müşteri oluşturma — sayı + Serializable transaction ile yarış riskini azaltır. */
/** Fastify reply ile plan/limit hatalarını tek formatta döndürür; işlendiyse true. */
export function sendEntitlementHttpError(
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  e: unknown,
): boolean {
  const er = e as Error & {
    code?: string;
    feature?: string;
    metric?: string;
    statusCode?: number;
  };
  if (er.statusCode === 403 && er.code === "plan_limit_exceeded") {
    reply.code(403).send({ error: er.code, metric: er.metric });
    return true;
  }
  if (er.statusCode === 403 && er.code === "plan_feature_disabled") {
    reply.code(403).send({ error: er.code, feature: er.feature });
    return true;
  }
  if (er.statusCode === 503 && er.code === "plan_not_configured") {
    reply.code(503).send({ error: "plan_not_configured" });
    return true;
  }
  return false;
}

export async function createCustomerWithinEntitlements<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const plan = await resolvePlanForTenant(tenantId);
      if (!plan) {
        const err = Object.assign(new Error("plan_not_configured"), { statusCode: 503 });
        throw err;
      }
      const ctx: TenantEntitlementContext = {
        tenantId,
        plan,
        limits: mergeEffectiveLimits(plan),
        features: new Set(plan.featureTags ?? []),
      };
      const n = await tx.customer.count({ where: { tenantId } });
      assertWithinLimit(ctx, "maxCustomers", n, 1);
      return fn(tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
