import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import type { SessionPayload } from "./auth-memory.js";
import {
  assertVisitBranchForSession,
  branchScopeFromSession,
  redemptionWhereForSession,
  visitWhereForSession,
} from "./branch-scope.js";
import { listBranchesForUser } from "./cashier-operation-service.js";
import { isCampaignRunnable } from "./loyalty-campaign-eval.js";
import { FEATURE, getTenantEntitlementContext } from "./entitlement-service.js";
import { computeHqLeaderboard } from "./hq-dashboard-leaderboard.js";

export type HqDashboardTier = "basic" | "full";

function visitWherePeriod(
  vw: Prisma.VisitWhereInput,
  since: Date,
  until: Date,
): Prisma.VisitWhereInput {
  return {
    AND: [vw, { createdAt: { gte: since, lt: until } }],
  };
}

function redemptionWhereCompletedPeriod(
  tenantId: string,
  session: SessionPayload,
  since: Date,
  until: Date,
): Prisma.RedemptionWhereInput {
  return {
    AND: [
      redemptionWhereForSession(tenantId, session),
      { status: "completed" as const },
      { createdAt: { gte: since, lt: until } },
    ],
  };
}

export async function getHqDashboardPayload(
  tenantId: string,
  session: SessionPayload,
  opts: { days: number },
) {
  const days = Math.min(Math.max(opts.days, 7), 90);
  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

  const ent = await getTenantEntitlementContext(tenantId);
  const tier: HqDashboardTier = ent.features.has(FEATURE.PRODUCT_ANALYTICS) ? "full" : "basic";

  const vw = visitWhereForSession(tenantId, session);
  const branches = await listBranchesForUser(tenantId, session);
  const scope = branchScopeFromSession(session);

  const [
    visitAgg,
    visitPrevAgg,
    redemptionCount,
    redemptionPrevCount,
    activeCampaigns,
    visitByBranch,
  ] = await Promise.all([
    prisma.visit.aggregate({
      where: visitWherePeriod(vw, periodStart, periodEnd),
      _sum: { pointsEarned: true },
      _count: { _all: true },
    }),
    prisma.visit.aggregate({
      where: visitWherePeriod(vw, prevStart, periodStart),
      _count: { _all: true },
    }),
    prisma.redemption.count({
      where: redemptionWhereCompletedPeriod(tenantId, session, periodStart, periodEnd),
    }),
    prisma.redemption.count({
      where: redemptionWhereCompletedPeriod(tenantId, session, prevStart, periodStart),
    }),
    prisma.campaign.count({
      where: { tenantId, status: "active", isActive: true },
    }),
    prisma.visit.groupBy({
      by: ["branchId"],
      where: visitWherePeriod(vw, periodStart, periodEnd),
      _count: { _all: true },
    }),
  ]);

  const totalVisits = visitAgg._count._all;
  const totalPointsIssued = visitAgg._sum.pointsEarned ?? 0;
  const visitsPrevPeriod = visitPrevAgg._count._all;

  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const counts = new Map<string, number>();
  for (const g of visitByBranch) {
    if (g.branchId) counts.set(g.branchId, g._count._all);
  }

  const {
    rows: leaderboardRows,
    bestBranchId: bestId,
    worstBranchId: worstId,
    medianVisits,
  } = computeHqLeaderboard(
    branches.map((b) => ({ id: b.id, name: b.name })),
    counts,
  );

  const insights: Array<{
    id: string;
    severity: "info" | "warn" | "critical";
    code: "low_vs_median" | "period_drop_visits";
    detail?: string;
    branchId?: string | null;
  }> = [];

  for (const r of leaderboardRows) {
    if (r.branchId && medianVisits > 0 && r.visits > 0 && r.visits < medianVisits * 0.4) {
      insights.push({
        id: `low_${r.branchId}`,
        severity: "warn",
        code: "low_vs_median",
        detail: r.name,
        branchId: r.branchId,
      });
    }
  }

  if (visitsPrevPeriod > 0 && totalVisits < visitsPrevPeriod * 0.65) {
    insights.unshift({
      id: "tenant_visit_drop",
      severity: "warn",
      code: "period_drop_visits",
    });
  }

  let trends:
    | {
        days: Array<{ date: string; visits: number; points: number; redemptions: number }>;
      }
    | undefined;

  if (tier === "full") {
    const bucketDays = Math.min(days, 21);
    const trendStart = new Date(now.getTime() - bucketDays * 24 * 60 * 60 * 1000);
    const dayJobs = [];
    for (let i = 0; i < bucketDays; i++) {
      const d0 = new Date(trendStart.getTime() + i * 24 * 60 * 60 * 1000);
      const d1 = new Date(d0.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = d0.toISOString().slice(0, 10);
      dayJobs.push(
        (async () => {
          const [v, p, red] = await Promise.all([
            prisma.visit.count({ where: visitWherePeriod(vw, d0, d1) }),
            prisma.visit.aggregate({
              where: visitWherePeriod(vw, d0, d1),
              _sum: { pointsEarned: true },
            }),
            prisma.redemption.count({
              where: redemptionWhereCompletedPeriod(tenantId, session, d0, d1),
            }),
          ]);
          return {
            date: dateStr,
            visits: v,
            points: p._sum.pointsEarned ?? 0,
            redemptions: red,
          };
        })(),
      );
    }
    trends = { days: await Promise.all(dayJobs) };
  }

  const anomalyWhere: Prisma.AnomalySignalWhereInput = {
    tenantId,
    createdAt: { gte: periodStart },
    ...(scope === "all"
      ? {}
      : scope.restrictedTo.length === 0
        ? { id: { in: [] } }
        : { branchId: { in: scope.restrictedTo } }),
  };

  const anomalyRows = await prisma.anomalySignal.findMany({
    where: anomalyWhere,
    orderBy: { createdAt: "desc" },
    take: tier === "full" ? 25 : 8,
    select: {
      id: true,
      type: true,
      severity: true,
      branchId: true,
      createdAt: true,
    },
  });

  const campaignApps = await prisma.visitCampaignApplication.groupBy({
    by: ["campaignId"],
    where: {
      tenantId,
      visit: { is: visitWherePeriod(vw, periodStart, periodEnd) },
    },
    _count: { _all: true },
    _sum: { pointsAwarded: true },
  });
  const campIds = campaignApps.map((c) => c.campaignId);
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campIds }, tenantId },
    select: { id: true, name: true, branchId: true, status: true },
  });
  const cMap = new Map(campaigns.map((c) => [c.id, c]));
  const campaignPerformance = campaignApps
    .map((a) => {
      const c = cMap.get(a.campaignId);
      return {
        campaignId: a.campaignId,
        name: c?.name ?? "—",
        branchScope: c?.branchId ?? null,
        applications: a._count._all,
        bonusPoints: a._sum.pointsAwarded ?? 0,
      };
    })
    .sort((a, b) => b.bonusPoints - a.bonusPoints)
    .slice(0, 15);

  let campaignByLocation:
    | Array<{
        campaignId: string;
        name: string;
        branchId: string | null;
        branchName: string;
        applications: number;
      }>
    | undefined;

  if (tier === "full" && branches.length > 1) {
    const raw = await prisma.visitCampaignApplication.findMany({
      where: {
        tenantId,
        visit: { is: visitWherePeriod(vw, periodStart, periodEnd) },
      },
      take: 8000,
      select: {
        campaignId: true,
        visit: { select: { branchId: true } },
      },
    });
    const cmap2 = new Map(campaigns.map((c) => [c.id, c.name]));
    const agg = new Map<string, number>();
    for (const row of raw) {
      const bid = row.visit.branchId ?? "null";
      const key = `${row.campaignId}:${bid}`;
      agg.set(key, (agg.get(key) ?? 0) + 1);
    }
    const rows: Array<{
      campaignId: string;
      name: string;
      branchId: string | null;
      branchName: string;
      applications: number;
    }> = [];
    for (const [key, n] of agg) {
      const [cid, bidPart] = key.split(":");
      const branchId = bidPart === "null" ? null : bidPart;
      const branchName =
        branchId === null ? "—" : branchMap.get(branchId)?.name ?? bidPart;
      rows.push({
        campaignId: cid!,
        name: cmap2.get(cid!) ?? "—",
        branchId,
        branchName,
        applications: n,
      });
    }
    campaignByLocation = rows.sort((a, b) => b.applications - a.applications).slice(0, 40);
  }

  return {
    tier,
    period: {
      days,
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    globalSummary: {
      totalVisits,
      totalPointsIssued,
      totalRedemptions: redemptionCount,
      activeCampaigns,
      deltaVisitsVsPrevPeriod:
        visitsPrevPeriod > 0
          ? Math.round(((totalVisits - visitsPrevPeriod) / visitsPrevPeriod) * 1000) / 10
          : null,
      deltaRedemptionsVsPrevPeriod:
        redemptionPrevCount > 0
          ? Math.round(((redemptionCount - redemptionPrevCount) / redemptionPrevCount) * 1000) / 10
          : null,
    },
    leaderboard: {
      rows: leaderboardRows,
      bestBranchId: bestId,
      worstBranchId: worstId,
    },
    trends,
    insights,
    anomalies: anomalyRows.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      branchId: a.branchId,
      createdAt: a.createdAt.toISOString(),
    })),
    campaignPerformance,
    campaignByLocation,
  };
}

export async function getHqLocationDetail(
  tenantId: string,
  session: SessionPayload,
  branchId: string,
  opts: { days: number },
) {
  assertVisitBranchForSession(session, branchId);

  const days = Math.min(Math.max(opts.days, 7), 90);
  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const vw: Prisma.VisitWhereInput = {
    tenantId,
    branchId,
  };

  const [visits, points, redemptions, campaignRows, branch] = await Promise.all([
    prisma.visit.count({
      where: { ...vw, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.visit.aggregate({
      where: { ...vw, createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { pointsEarned: true },
    }),
    prisma.redemption.count({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: periodStart, lt: periodEnd },
        OR: [
          { deviceSession: { branchId } },
          { cashierShift: { deviceSession: { branchId } } },
        ],
      },
    }),
    prisma.campaign.findMany({
      where: {
        tenantId,
        OR: [{ branchId: null }, { branchId }],
        status: "active",
        isActive: true,
      },
    }),
    prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true, name: true, slug: true, isActive: true },
    }),
  ]);

  const activeCampaignsAtLocation = campaignRows.filter((c) => isCampaignRunnable(c, now)).length;

  if (!branch) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }

  return {
    branch,
    period: { days, start: periodStart.toISOString(), end: periodEnd.toISOString() },
    metrics: {
      visits,
      pointsIssued: points._sum.pointsEarned ?? 0,
      redemptions,
      activeCampaignsAtLocation,
    },
  };
}
