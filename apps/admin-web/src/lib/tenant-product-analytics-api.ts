import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type ProductAnalyticsEventType =
  | "qr_opened"
  | "customer_viewed_home"
  | "visit_recorded"
  | "points_awarded"
  | "reward_viewed"
  | "reward_claimed"
  | "redemption_completed";

export type FunnelStepRow = {
  step: ProductAnalyticsEventType;
  uniqueCustomers: number;
  eventsApprox: number;
};

export type FunnelTransitionRow = {
  from: ProductAnalyticsEventType;
  to: ProductAnalyticsEventType;
  rate: number | null;
  dropOff: number | null;
  sequentialUsers: number;
};

export type FunnelAnalytics = {
  periodDays: number;
  from: string;
  to: string;
  steps: FunnelStepRow[];
  stepToStep: FunnelTransitionRow[];
  biggestDropOff: FunnelTransitionRow | null;
};

export type RetentionAnalytics = {
  cohortFrom: string;
  cohortTo: string;
  cohortSize: number;
  day1Rate: number | null;
  day3Rate: number | null;
  day7Rate: number | null;
  definition: string;
};

export type RewardUsageStats = {
  periodDays: number;
  redemptionCompletedCount: number;
  rewardClaimedEvents: number;
  rewardViewedEvents: number;
  claimPerViewApprox: number | null;
};

export type GrowthOverview = {
  funnel: FunnelAnalytics;
  retention: RetentionAnalytics;
  rewardUsage: RewardUsageStats;
  insights: { summary: string; suggestions: string[] };
};

async function analyticsFetch<T>(
  token: string,
  path: string,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { ...(buildAuthHeaders(token) ?? {}) },
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error("auth"), { status: res.status });
  }
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw Object.assign(new Error("api_error"), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}

export function getGrowthOverview(
  token: string,
  opts?: { funnelDays?: number; cohortDays?: number; rewardDays?: number },
) {
  const q = new URLSearchParams();
  if (opts?.funnelDays != null) q.set("funnelDays", String(opts.funnelDays));
  if (opts?.cohortDays != null) q.set("cohortDays", String(opts.cohortDays));
  if (opts?.rewardDays != null) q.set("rewardDays", String(opts.rewardDays));
  const qs = q.toString();
  return analyticsFetch<GrowthOverview>(
    token,
    `/analytics/overview${qs ? `?${qs}` : ""}`,
  );
}
