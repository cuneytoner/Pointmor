import { getApiBaseUrl } from "./api-base";

export type HqDashboardTier = "basic" | "full";

export type HqDashboardPayload = {
  tier: HqDashboardTier;
  period: { days: number; start: string; end: string };
  globalSummary: {
    totalVisits: number;
    totalPointsIssued: number;
    totalRedemptions: number;
    activeCampaigns: number;
    deltaVisitsVsPrevPeriod: number | null;
    deltaRedemptionsVsPrevPeriod: number | null;
  };
  leaderboard: {
    rows: Array<{
      branchId: string | null;
      name: string;
      visits: number;
      rank: number;
    }>;
    bestBranchId: string | null;
    worstBranchId: string | null;
  };
  trends?: {
    days: Array<{
      date: string;
      visits: number;
      points: number;
      redemptions: number;
    }>;
  };
  insights: Array<{
    id: string;
    severity: "info" | "warn" | "critical";
    code: "low_vs_median" | "period_drop_visits";
    detail?: string;
    branchId?: string | null;
  }>;
  anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    branchId: string | null;
    createdAt: string;
  }>;
  campaignPerformance: Array<{
    campaignId: string;
    name: string;
    branchScope: string | null;
    applications: number;
    bonusPoints: number;
  }>;
  campaignByLocation?: Array<{
    campaignId: string;
    name: string;
    branchId: string | null;
    branchName: string;
    applications: number;
  }>;
};

export type HqLocationDetailPayload = {
  branch: { id: string; name: string; slug: string | null; isActive: boolean } | null;
  period: { days: number; start: string; end: string };
  metrics: {
    visits: number;
    pointsIssued: number;
    redemptions: number;
    activeCampaignsAtLocation: number;
  };
};

async function hqFetch<T>(token: string, path: string): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
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
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export function fetchHqDashboard(token: string, days = 28) {
  const q = new URLSearchParams({ days: String(days) });
  return hqFetch<HqDashboardPayload>(token, `/tenant/hq-dashboard?${q.toString()}`);
}

export function fetchHqLocationDetail(token: string, branchId: string, days = 28) {
  const q = new URLSearchParams({ days: String(days) });
  return hqFetch<HqLocationDetailPayload>(
    token,
    `/tenant/hq-dashboard/locations/${encodeURIComponent(branchId)}?${q.toString()}`,
  );
}
