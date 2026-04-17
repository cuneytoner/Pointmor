import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { FEATURE, getTenantEntitlementContext } from "./entitlement-service.js";
import { HQ_INSIGHT_ACTION, HQ_INSIGHT_TYPE } from "./hq-insight-types.js";
import { detectRelativeDrop, dropVsTrailingBaseline, isoWeekKey } from "./hq-insight-math.js";
import { upsertHqInsight } from "./hq-insight-service.js";
import { syncHqAutomationFromInsights } from "./hq-automation-sync.js";

const DROP_FRAC = 0.2;
const MIN_PREV_7D = 10;
const MIN_BASELINE_SUM = 30;
const GROWTH_MIN_PREV = 3;
const GROWTH_RATIO = 1.15;

function weekKey(): string {
  return isoWeekKey(new Date());
}

async function countVisitsRange(
  tenantId: string,
  branchId: string | null | undefined,
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.visit.count({
    where: {
      tenantId,
      ...(branchId ? { branchId } : {}),
      createdAt: { gte: from, lt: to },
    },
  });
}

/** Gün bazlı ziyaret serisi (en eski → en yeni), `dayCount` uzunluğunda. */
async function fetchDailyVisitSeries(
  tenantId: string,
  branchId: string | null,
  dayCount: number,
): Promise<number[]> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - dayCount);
  start.setUTCHours(0, 0, 0, 0);

  const branchFilter =
    branchId === null ? Prisma.empty : Prisma.sql`AND v."branchId" = ${branchId}`;

  const rows = await prisma.$queryRaw<Array<{ d: Date; c: bigint }>>(
    Prisma.sql`
      SELECT date_trunc('day', v."createdAt" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
      FROM "Visit" v
      WHERE v."tenantId" = ${tenantId}
        AND v."createdAt" >= ${start}
        ${branchFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  );

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.d.toISOString().slice(0, 10), Number(r.c));
  }

  const out: number[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const k = d.toISOString().slice(0, 10);
    out.push(map.get(k) ?? 0);
  }
  return out;
}

async function hourlyVisitBuckets(
  tenantId: string,
  since: Date,
): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<Array<{ h: number; c: bigint }>>(
    Prisma.sql`
      SELECT EXTRACT(HOUR FROM v."createdAt" AT TIME ZONE 'UTC')::int AS h, COUNT(*)::bigint AS c
      FROM "Visit" v
      WHERE v."tenantId" = ${tenantId}
        AND v."createdAt" >= ${since}
      GROUP BY 1
    `,
  );
  const m = new Map<number, number>();
  for (const r of rows) {
    m.set(r.h, Number(r.c));
  }
  return m;
}

export type HqInsightGenerationResult = {
  tenantId: string;
  upserts: number;
  skipped: number;
  errors: string[];
};

export async function generateHqInsightsForTenant(tenantId: string): Promise<HqInsightGenerationResult> {
  const errors: string[] = [];
  let upserts = 0;
  let skipped = 0;

  try {
    const ent = await getTenantEntitlementContext(tenantId);
    if (!ent.features.has(FEATURE.HQ_AI_INSIGHTS)) {
      return { tenantId, upserts: 0, skipped: 0, errors: ["feature_disabled"] };
    }

    const fullTier = ent.features.has(FEATURE.PRODUCT_ANALYTICS);
    const wk = weekKey();
    const now = new Date();
    const d7 = 7 * 24 * 60 * 60 * 1000;

    const curEnd = now;
    const curStart = new Date(now.getTime() - d7);
    const prevEnd = curStart;
    const prevStart = new Date(now.getTime() - 2 * d7);

    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    /** --- Tenant: 7g vs önceki 7g düşüş --- */
    const vCur = await countVisitsRange(tenantId, null, curStart, curEnd);
    const vPrev = await countVisitsRange(tenantId, null, prevStart, prevEnd);
    if (
      detectRelativeDrop(vCur, vPrev, {
        minPrevious: MIN_PREV_7D,
        dropFraction: DROP_FRAC,
      })
    ) {
      const r = await upsertHqInsight({
        tenantId,
        branchId: null,
        dedupeKey: `${HQ_INSIGHT_TYPE.VISIT_DROP_TENANT}:all:${wk}`,
        type: HQ_INSIGHT_TYPE.VISIT_DROP_TENANT,
        severity: "warn",
        message: `Son 7 günde ziyaretler önceki 7 güne göre belirgin düştü (${vCur} vs ${vPrev}).`,
        suggestedAction: "Trafik çekmek için kampanya veya mesaj tetikleyin.",
        actionKind: HQ_INSIGHT_ACTION.CREATE_CAMPAIGN,
        payload: { windowDays: 7, current: vCur, previous: vPrev },
      });
      if (r.skipped) skipped += 1;
      else upserts += 1;
    }

    /** --- Moving baseline (35 gün) --- */
    const daily = await fetchDailyVisitSeries(tenantId, null, 35);
    if (
      dropVsTrailingBaseline(daily, 7, 21, {
        dropFraction: DROP_FRAC,
        minBaselineSum: MIN_BASELINE_SUM,
      })
    ) {
      const r = await upsertHqInsight({
        tenantId,
        branchId: null,
        dedupeKey: `${HQ_INSIGHT_TYPE.VISIT_DROP_VS_MA}:all:${wk}`,
        type: HQ_INSIGHT_TYPE.VISIT_DROP_VS_MA,
        severity: "info",
        message:
          "Son 7 günlük ziyaret hacmi, önceki 3 haftanın günlük ortalamasına göre düşük (baseline kıyaslaması).",
        suggestedAction: "Bonus veya eşik kampanyası ile dengeleyin.",
        actionKind: HQ_INSIGHT_ACTION.OPEN_CAMPAIGNS,
        payload: { rule: "trailing_baseline_7_21" },
      });
      if (r.skipped) skipped += 1;
      else upserts += 1;
    }

    /** --- Şube bazlı düşüş / büyüme --- */
    if (branches.length > 0) {
      for (const b of branches) {
        const bc = await countVisitsRange(tenantId, b.id, curStart, curEnd);
        const bp = await countVisitsRange(tenantId, b.id, prevStart, prevEnd);
        if (
          detectRelativeDrop(bc, bp, {
            minPrevious: Math.max(5, Math.floor(MIN_PREV_7D / 2)),
            dropFraction: DROP_FRAC,
          })
        ) {
          const r = await upsertHqInsight({
            tenantId,
            branchId: b.id,
            dedupeKey: `${HQ_INSIGHT_TYPE.VISIT_DROP_BRANCH}:${b.id}:${wk}`,
            type: HQ_INSIGHT_TYPE.VISIT_DROP_BRANCH,
            severity: "warn",
            message: `“${b.name}” şubesinde ziyaretler önceki 7 güne göre %20+ geriledi (${bc} vs ${bp}).`,
            suggestedAction: "Şube kampanyası veya saha mesajı planlayın.",
            actionKind: HQ_INSIGHT_ACTION.CREATE_CAMPAIGN,
            payload: { branchId: b.id, current: bc, previous: bp },
          });
          if (r.skipped) skipped += 1;
          else upserts += 1;
        }

        if (bp >= GROWTH_MIN_PREV && bc > bp * GROWTH_RATIO && bc >= 8) {
          const r = await upsertHqInsight({
            tenantId,
            branchId: b.id,
            dedupeKey: `${HQ_INSIGHT_TYPE.TOP_BRANCH_GROWTH}:${b.id}:${wk}`,
            type: HQ_INSIGHT_TYPE.TOP_BRANCH_GROWTH,
            severity: "info",
            message: `“${b.name}” güçlü büyüme gösteriyor (${bc} ziyaret, önceki dönem ${bp}).`,
            suggestedAction: "Başarıyı diğer şubelerle paylaşın; benzer kampanyayı çoğaltın.",
            actionKind: HQ_INSIGHT_ACTION.OPEN_CAMPAIGNS,
            payload: { branchId: b.id, growth: true },
          });
          if (r.skipped) skipped += 1;
          else upserts += 1;
        }
      }
    }

    /** --- Anomali sinyalleri (ödül kötüye kullanım / olağanüstü kullanım) --- */
    const anomalySince = new Date(now.getTime() - d7);
    const anomalies = await prisma.anomalySignal.findMany({
      where: { tenantId, createdAt: { gte: anomalySince } },
      select: { id: true, type: true, severity: true, branchId: true, createdAt: true },
      take: 40,
    });

    const pushAnomaly = async (
      anomalyType: string,
      insightType: string,
      actionKind: string,
      label: string,
    ) => {
      const found = anomalies.find((a) => a.type === anomalyType);
      if (!found) return;
      const r = await upsertHqInsight({
        tenantId,
        branchId: found.branchId,
        dedupeKey: `${insightType}:${wk}`,
        type: insightType,
        severity: found.severity === "critical" ? "critical" : "warn",
        message: label,
        suggestedAction: "Denetim ve limitleri gözden geçirin.",
        actionKind,
        payload: { anomalyId: found.id, anomalyType },
      });
      if (r.skipped) skipped += 1;
      else upserts += 1;
    };

    await pushAnomaly(
      "high_redemption_volume_in_shift",
      HQ_INSIGHT_TYPE.ANOMALY_HIGH_REDEMPTION_SHIFT,
      HQ_INSIGHT_ACTION.OPEN_ANOMALIES,
      "Bir vardiyada olağanüstü yüksek kullanım hacmi tespit edildi.",
    );
    await pushAnomaly(
      "repeat_claim_attempts_short_window",
      HQ_INSIGHT_TYPE.ANOMALY_REPEAT_CLAIMS,
      HQ_INSIGHT_ACTION.OPEN_AUDIT,
      "Kısa sürede tekrarlayan ödül talepleri (şüpheli örüntü).",
    );
    await pushAnomaly(
      "duplicate_pending_reward_pattern",
      HQ_INSIGHT_TYPE.ANOMALY_DUPLICATE_PENDING,
      HQ_INSIGHT_ACTION.OPEN_AUDIT,
      "Aynı müşteride birden fazla bekleyen ödül — kötüye kullanım riski.",
    );

    /** --- Growth: düşük trafik saati + düşük retention --- */
    if (fullTier) {
      const since28 = new Date(now.getTime() - 28 * 86400000);
      const buckets = await hourlyVisitBuckets(tenantId, since28);
      let max = 0;
      for (const v of buckets.values()) max = Math.max(max, v);
      if (max >= 15) {
        for (const [h, c] of buckets) {
          if (c > 0 && c < max * 0.2) {
            const r = await upsertHqInsight({
              tenantId,
              branchId: null,
              dedupeKey: `${HQ_INSIGHT_TYPE.OPPORTUNITY_QUIET_HOUR}:h${h}:${wk}`,
              type: HQ_INSIGHT_TYPE.OPPORTUNITY_QUIET_HOUR,
              severity: "info",
              message: `Son 28 günde saat ${h}:00 (UTC) görece düşük trafik (${c} ziyaret; tepe ${max}).`,
              suggestedAction: "Bu saatlere hedefli SMS / kampanya deneyin.",
              actionKind: HQ_INSIGHT_ACTION.OPEN_MESSAGING,
              payload: { hourUtc: h, visits: c, peak: max },
            });
            if (r.skipped) skipped += 1;
            else upserts += 1;
            break;
          }
        }
      }

      const total = await prisma.customer.count({ where: { tenantId } });
      const stale = await prisma.customer.count({
        where: {
          tenantId,
          lastVisitAt: { lt: new Date(now.getTime() - 30 * 86400000) },
        },
      });
      if (total >= 25 && stale / total >= 0.35) {
        const r = await upsertHqInsight({
          tenantId,
          branchId: null,
          dedupeKey: `${HQ_INSIGHT_TYPE.OPPORTUNITY_LOW_RETENTION}:${wk}`,
          type: HQ_INSIGHT_TYPE.OPPORTUNITY_LOW_RETENTION,
          severity: "warn",
          message: `Müşterilerin yaklaşık %${Math.round((100 * stale) / total)}'i 30+ gündür ziyaret etmedi (düşük tutma).`,
          suggestedAction: "Uygulama içi mesaj veya geri kazanım kampanyası çalıştırın.",
          actionKind: HQ_INSIGHT_ACTION.OPEN_MESSAGING,
          payload: { staleCustomers: stale, totalCustomers: total },
        });
        if (r.skipped) skipped += 1;
        else upserts += 1;
      }
    }
  } catch (e) {
    errors.push((e as Error).message ?? String(e));
  }

  try {
    await syncHqAutomationFromInsights(tenantId);
  } catch (e) {
    errors.push(`automation:${(e as Error).message ?? String(e)}`);
  }

  return { tenantId, upserts, skipped, errors };
}

export async function runHqInsightJob(opts: { tenantId?: string } = {}): Promise<{
  processed: number;
  results: HqInsightGenerationResult[];
}> {
  const results: HqInsightGenerationResult[] = [];

  if (opts.tenantId?.trim()) {
    const r = await generateHqInsightsForTenant(opts.tenantId.trim());
    results.push(r);
    return { processed: 1, results };
  }

  const subs = await prisma.subscription.findMany({
    where: { status: "active" },
    select: { tenantId: true, plan: { select: { featureTags: true } } },
  });

  for (const s of subs) {
    if (!s.plan.featureTags.includes(FEATURE.HQ_AI_INSIGHTS)) continue;
    const r = await generateHqInsightsForTenant(s.tenantId);
    results.push(r);
  }

  return { processed: results.length, results };
}
