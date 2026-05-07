import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type CompliancePackLevel = "none" | "limited" | "full";

export type EntitlementsPayload = {
  plan: {
    id: string;
    slug: string;
    name: string;
    planType: string;
  };
  /** Yoksa `none` kabul edilir (eski API yanıtları). */
  compliance?: {
    level: CompliancePackLevel;
  };
  features: string[];
  limits: {
    maxCustomers: number | null;
    maxActiveRewards: number | null;
    maxActiveCampaigns: number | null;
    maxVisitsPerMonth: number | null;
    maxBranches: number | null;
    maxStaffUsers: number | null;
    softWarningPercent: number;
  };
  usage: {
    customerCount: number;
    activeRewardCount: number;
    activeCampaignCount: number;
    monthlyVisitCount: number;
    branchCount: number;
    staffUserCount: number;
  };
  remaining: {
    customers: number | null;
    activeRewards: number | null;
    activeCampaigns: number | null;
    visitsThisMonth: number | null;
    branches: number | null;
    staffUsers: number | null;
  };
  warnings: Array<{
    code: string;
    metric: string;
    percentUsed: number;
  }>;
  upgradeSuggested: boolean;
};

export async function fetchEntitlements(token: string): Promise<EntitlementsPayload> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/tenant/entitlements`, {
    headers: { ...(buildAuthHeaders(token) ?? {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = new Error("entitlements_failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<EntitlementsPayload>;
}

export async function postDemoPlanSwitch(
  token: string,
  planSlug: string,
): Promise<{ ok: boolean; subscription: unknown }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/tenant/billing/demo-plan-switch`, {
    method: "POST",
    headers: {
      ...(buildAuthHeaders(token) ?? {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ planSlug }),
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw Object.assign(new Error("demo_plan_switch_failed"), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<{ ok: boolean; subscription: unknown }>;
}

export function planErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.error === "plan_limit_exceeded" && typeof b.metric === "string") {
    return `limit:${b.metric}`;
  }
  if (b.error === "plan_feature_disabled" && typeof b.feature === "string") {
    return `feature:${b.feature}`;
  }
  return null;
}
