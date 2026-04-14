import { prisma } from "./prisma.js";
import type { ProductAnalyticsEventType } from "../generated/prisma/client.js";

/** Funnel sırası (daralma analizi) */
export const FUNNEL_STEP_ORDER: ProductAnalyticsEventType[] = [
  "qr_opened",
  "customer_viewed_home",
  "visit_recorded",
  "points_awarded",
  "reward_viewed",
  "reward_claimed",
  "redemption_completed",
];

export async function recordProductAnalyticsEvent(input: {
  tenantId: string;
  customerId: string | null;
  type: ProductAnalyticsEventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.productAnalyticsEvent.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        type: input.type,
        payload: (input.payload ?? {}) as object,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[product-analytics] record failed", e);
  }
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Benzersiz müşteri sayısı — belirli tipte, pencerede */
async function distinctCustomersForType(
  tenantId: string,
  type: ProductAnalyticsEventType,
  from: Date,
  to: Date,
): Promise<number> {
  const groups = await prisma.productAnalyticsEvent.groupBy({
    by: ["customerId"],
    where: {
      tenantId,
      type,
      customerId: { not: null },
      createdAt: { gte: from, lte: to },
    },
  });
  return groups.length;
}

/** Ardışık iki adım: önce fromType, sonra toType (zaman sırası) */
async function distinctCustomersSequential(
  tenantId: string,
  fromType: ProductAnalyticsEventType,
  toType: ProductAnalyticsEventType,
  windowFrom: Date,
  windowTo: Date,
): Promise<number> {
  const a = await prisma.productAnalyticsEvent.findMany({
    where: {
      tenantId,
      type: fromType,
      customerId: { not: null },
      createdAt: { gte: windowFrom, lte: windowTo },
    },
    select: { customerId: true, createdAt: true },
  });
  const b = await prisma.productAnalyticsEvent.findMany({
    where: {
      tenantId,
      type: toType,
      customerId: { not: null },
      createdAt: { gte: windowFrom, lte: windowTo },
    },
    select: { customerId: true, createdAt: true },
  });
  const byCustomer = new Map<string, Date[]>();
  for (const row of a) {
    if (!row.customerId) continue;
    const list = byCustomer.get(row.customerId) ?? [];
    list.push(row.createdAt);
    byCustomer.set(row.customerId, list);
  }
  const seq = new Set<string>();
  for (const row of b) {
    if (!row.customerId) continue;
    const firsts = byCustomer.get(row.customerId);
    if (!firsts?.length) continue;
    const t2 = row.createdAt.getTime();
    if (firsts.some((t1) => t1.getTime() < t2)) {
      seq.add(row.customerId);
    }
  }
  return seq.size;
}

export async function getFunnelAnalytics(tenantId: string, periodDays: number) {
  const to = new Date();
  const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const steps: Array<{
    step: ProductAnalyticsEventType;
    uniqueCustomers: number;
    eventsApprox: number;
  }> = [];

  for (const step of FUNNEL_STEP_ORDER) {
    const [uniq, countEv] = await Promise.all([
      distinctCustomersForType(tenantId, step, from, to),
      prisma.productAnalyticsEvent.count({
        where: { tenantId, type: step, createdAt: { gte: from, lte: to } },
      }),
    ]);
    steps.push({ step, uniqueCustomers: uniq, eventsApprox: countEv });
  }

  const stepToStep: Array<{
    from: ProductAnalyticsEventType;
    to: ProductAnalyticsEventType;
    rate: number | null;
    dropOff: number | null;
    sequentialUsers: number;
  }> = [];

  for (let i = 0; i < FUNNEL_STEP_ORDER.length - 1; i++) {
    const fromStep = FUNNEL_STEP_ORDER[i]!;
    const toStep = FUNNEL_STEP_ORDER[i + 1]!;
    const [base, seq] = await Promise.all([
      distinctCustomersForType(tenantId, fromStep, from, to),
      distinctCustomersSequential(tenantId, fromStep, toStep, from, to),
    ]);
    const rate = base > 0 ? seq / base : null;
    const dropOff = rate !== null ? 1 - rate : null;
    stepToStep.push({
      from: fromStep,
      to: toStep,
      rate,
      dropOff,
      sequentialUsers: seq,
    });
  }

  let biggestDropOff: (typeof stepToStep)[0] | null = null;
  for (const row of stepToStep) {
    if (row.dropOff === null) continue;
    if (
      !biggestDropOff ||
      (biggestDropOff.dropOff !== null && row.dropOff > biggestDropOff.dropOff)
    ) {
      biggestDropOff = row;
    }
  }

  return {
    periodDays,
    from: from.toISOString(),
    to: to.toISOString(),
    steps,
    stepToStep,
    biggestDropOff,
  };
}

/**
 * Retention: kohort = ilk `visit_recorded` olayı [cohortFrom, cohortTo] aralığına düşen müşteriler.
 * D1/D3/D7 = o müşterinin UTC takvim günü anchor+1, +3, +7 gününde herhangi bir ürün analitik olayı var mı.
 */
export async function getRetentionAnalytics(
  tenantId: string,
  cohortDays: number,
) {
  const cohortTo = new Date();
  const cohortFrom = new Date(
    cohortTo.getTime() - cohortDays * 24 * 60 * 60 * 1000,
  );

  const visitEvents = await prisma.productAnalyticsEvent.findMany({
    where: { tenantId, type: "visit_recorded", customerId: { not: null } },
    select: { customerId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const firstVisit = new Map<string, Date>();
  for (const e of visitEvents) {
    if (!e.customerId) continue;
    if (!firstVisit.has(e.customerId)) {
      firstVisit.set(e.customerId, e.createdAt);
    }
  }

  const cohortCustomerIds = [...firstVisit.entries()]
    .filter(([, d]) => d >= cohortFrom && d <= cohortTo)
    .map(([id]) => id);

  const cohortSize = cohortCustomerIds.length;
  if (cohortSize === 0) {
    return {
      cohortFrom: cohortFrom.toISOString(),
      cohortTo: cohortTo.toISOString(),
      cohortSize: 0,
      day1Rate: null,
      day3Rate: null,
      day7Rate: null,
      definition:
        "İlk visit_recorded kohort tarihi aralığında; D1/D3/D7 = anchor gününden sonraki 1/3/7. UTC gün.",
    };
  }

  const allEvents = await prisma.productAnalyticsEvent.findMany({
    where: {
      tenantId,
      customerId: { in: cohortCustomerIds },
    },
    select: { customerId: true, createdAt: true },
  });

  const byCustomer = new Map<string, Date[]>();
  for (const e of allEvents) {
    if (!e.customerId) continue;
    const list = byCustomer.get(e.customerId) ?? [];
    list.push(e.createdAt);
    byCustomer.set(e.customerId, list);
  }

  let d1 = 0;
  let d3 = 0;
  let d7 = 0;

  for (const cid of cohortCustomerIds) {
    const anchor = firstVisit.get(cid);
    if (!anchor) continue;
    const anchorDay = startOfUtcDay(anchor);
    const t1 = addUtcDays(anchorDay, 1);
    const t3 = addUtcDays(anchorDay, 3);
    const t7 = addUtcDays(anchorDay, 7);
    const dayEnd = (day: Date) => addUtcDays(day, 1);

    const times = byCustomer.get(cid) ?? [];
    const hasOn = (dayStart: Date) =>
      times.some((t) => t >= dayStart && t < dayEnd(dayStart));

    if (hasOn(t1)) d1 += 1;
    if (hasOn(t3)) d3 += 1;
    if (hasOn(t7)) d7 += 1;
  }

  return {
    cohortFrom: cohortFrom.toISOString(),
    cohortTo: cohortTo.toISOString(),
    cohortSize,
    day1Rate: cohortSize ? d1 / cohortSize : null,
    day3Rate: cohortSize ? d3 / cohortSize : null,
    day7Rate: cohortSize ? d7 / cohortSize : null,
    definition:
      "Kohort: ilk visit_recorded tarihi verilen aralıkta olan müşteriler. D1/D3/D7: anchor UTC gününden sonraki 1/3/7. gün içinde herhangi bir analitik olay.",
  };
}

export async function getRewardUsageStats(tenantId: string, periodDays: number) {
  const to = new Date();
  const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const [completedRedemptions, claims, views] = await Promise.all([
    prisma.redemption.count({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.productAnalyticsEvent.count({
      where: {
        tenantId,
        type: "reward_claimed",
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.productAnalyticsEvent.count({
      where: {
        tenantId,
        type: "reward_viewed",
        createdAt: { gte: from, lte: to },
      },
    }),
  ]);
  return {
    periodDays,
    redemptionCompletedCount: completedRedemptions,
    rewardClaimedEvents: claims,
    rewardViewedEvents: views,
    claimPerViewApprox:
      views > 0 ? Math.round((claims / views) * 1000) / 1000 : null,
  };
}

export function buildGrowthInsights(
  funnel: Awaited<ReturnType<typeof getFunnelAnalytics>>,
  retention: Awaited<ReturnType<typeof getRetentionAnalytics>>,
): { summary: string; suggestions: string[] } {
  const suggestions: string[] = [];
  const bd = funnel.biggestDropOff;
  if (bd && bd.dropOff !== null && bd.dropOff > 0.4) {
    suggestions.push(
      `En keskin düşüş: ${bd.from} → ${bd.to} (kayıp ~${Math.round(bd.dropOff * 100)}%). Bu adımda basitleştirilmiş mesaj veya teşvik deneyin.`,
    );
  }
  if (retention.day1Rate !== null && retention.day1Rate < 0.2) {
    suggestions.push(
      "D1 geri dönüş düşük görünüyor: push yoksa bile PWA’da ikinci ziyaret için küçük hatırlatma veya kampanya önerisi düşünün.",
    );
  }
  if (retention.day7Rate !== null && retention.day7Rate < 0.1) {
    suggestions.push(
      "7 günlük tekrar düşük: haftalık ödül veya inaktivite otomasyonu (Phase 4) ile destekleyin.",
    );
  }
  const summary =
    bd && bd.dropOff !== null
      ? `Büyük düşüş adımı: ${bd.from} → ${bd.to}. Kohort büyüklüğü (visit_recorded): ${retention.cohortSize}.`
      : "Funnel adımları dengeli görünebilir; veri arttıkça tekrar kontrol edin.";

  return { summary, suggestions };
}

export async function getGrowthOverview(tenantId: string, options?: {
  funnelDays?: number;
  cohortDays?: number;
  rewardDays?: number;
}) {
  const funnelDays = options?.funnelDays ?? 30;
  const cohortDays = options?.cohortDays ?? 90;
  const rewardDays = options?.rewardDays ?? 30;

  const [funnel, retention, rewardUsage] = await Promise.all([
    getFunnelAnalytics(tenantId, funnelDays),
    getRetentionAnalytics(tenantId, cohortDays),
    getRewardUsageStats(tenantId, rewardDays),
  ]);

  const insights = buildGrowthInsights(funnel, retention);

  return { funnel, retention, rewardUsage, insights };
}
