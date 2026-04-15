import { getApiBaseUrl } from "./api-base";

export type LoyaltySummary = {
  totalCustomers: number;
  visitsToday: number;
  pointsIssuedToday: number;
  redemptionsToday: number;
  activeCampaigns: number;
};

export type CustomerWithBalance = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyaltyAccount: { pointsBalance: number } | null;
};

export type VisitRecordResult = {
  visitId: string;
  basePoints: number;
  bonusPoints: number;
  totalPointsAwarded: number;
  pointsEarned: number;
  appliedCampaigns: Array<{
    campaignId: string;
    name: string;
    type: string;
    pointsAwarded: number;
  }>;
};

/** Sunucu ile aynı kurallar — anlık önizleme (POS). */
export type VisitPreviewResult = {
  basePoints: number;
  bonusPoints: number;
  totalPointsAwarded: number;
  priorVisitCount: number;
  appliedCampaigns: VisitRecordResult["appliedCampaigns"];
};

export type CustomerDetail = {
  customer: CustomerWithBalance;
  pointsBalance: number;
  ledgerSum: number;
  ledgerMatchesCache: boolean;
  recentVisits: Array<{
    id: string;
    amount: number;
    pointsEarned: number;
    basePointsEarned: number;
    bonusPointsEarned: number;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    type: string;
    points: number;
    source: string;
    referenceId: string | null;
    visitId: string | null;
    createdAt: string;
  }>;
  rewardClaims: Array<{
    id: string;
    status: string;
    pointsSpent: number;
    createdAt: string;
    reward: { id: string; name: string };
  }>;
};

export type VisitRow = {
  id: string;
  amount: number;
  pointsEarned: number;
  basePointsEarned: number;
  bonusPointsEarned: number;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
};

export type RedemptionRow = {
  id: string;
  pointsSpent: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
  reward: { id: string; name: string };
};

/** Bekleyen müşteri talebi (app claim) — kasiyer listesi. */
export type PendingClaimRow = {
  id: string;
  pointsSpent: number;
  status: string;
  createdAt: string;
  reward: { id: string; name: string };
};

export type RewardDto = {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: string;
  valueType: string;
  value: number;
  redemptionMethod: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CampaignDto = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  config: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashierOperationIds = {
  deviceSessionId: string;
  cashierShiftId: string;
};

function cashierHeaders(
  ctx?: CashierOperationIds | null,
): Record<string, string> {
  if (!ctx) return {};
  return {
    "X-Pointmor-Device-Session": ctx.deviceSessionId,
    "X-Pointmor-Cashier-Shift": ctx.cashierShiftId,
  };
}

async function loyaltyFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getLoyaltySummary(token: string) {
  return loyaltyFetch<LoyaltySummary>(token, "/summary");
}

export function getCustomers(token: string) {
  return loyaltyFetch<CustomerWithBalance[]>(token, "/customers");
}

export function getCustomerDetail(token: string, customerId: string) {
  return loyaltyFetch<CustomerDetail>(
    token,
    `/customers/${encodeURIComponent(customerId)}/detail`,
  );
}

export function getPendingClaims(token: string, customerId: string) {
  return loyaltyFetch<PendingClaimRow[]>(
    token,
    `/customers/${encodeURIComponent(customerId)}/pending-claims`,
  );
}

export function getVisits(token: string, limit = 100) {
  return loyaltyFetch<VisitRow[]>(token, `/visits?limit=${limit}`);
}

export function getRedemptions(token: string, limit = 100) {
  return loyaltyFetch<RedemptionRow[]>(token, `/redemptions?limit=${limit}`);
}

/** Varsayılan API: yalnız aktif ödüller; tümü için `activeOnly: false`. */
export function getRewards(token: string, activeOnly = true) {
  const q = activeOnly ? "" : "?active=false";
  return loyaltyFetch<RewardDto[]>(token, `/rewards${q}`);
}

export function getCampaigns(token: string) {
  return loyaltyFetch<CampaignDto[]>(token, "/campaigns");
}

export function postVisit(
  token: string,
  body: { customerId: string; amount: number },
  cashierCtx?: CashierOperationIds | null,
) {
  return loyaltyFetch<VisitRecordResult>(token, "/visits", {
    method: "POST",
    body: JSON.stringify(body),
    headers: cashierHeaders(cashierCtx),
  });
}

export function postVisitPreview(
  token: string,
  body: { customerId: string; amount: number },
) {
  return loyaltyFetch<VisitPreviewResult>(token, "/visits/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postCustomer(
  token: string,
  body: { name: string; phone: string; email?: string | null },
) {
  return loyaltyFetch<{ id: string; name: string; phone: string }>(token, "/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postReward(
  token: string,
  body: Record<string, unknown>,
) {
  return loyaltyFetch<RewardDto>(token, "/rewards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchReward(token: string, rewardId: string, body: Record<string, unknown>) {
  return loyaltyFetch<RewardDto>(
    token,
    `/rewards/${encodeURIComponent(rewardId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export function postCampaign(token: string, body: Record<string, unknown>) {
  return loyaltyFetch<CampaignDto>(token, "/campaigns", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchCampaign(
  token: string,
  campaignId: string,
  body: Record<string, unknown>,
) {
  return loyaltyFetch<CampaignDto>(
    token,
    `/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export function postRedemption(
  token: string,
  body: { customerId: string; rewardId: string },
  cashierCtx?: CashierOperationIds | null,
) {
  return loyaltyFetch<{ id: string }>(token, "/redemptions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: cashierHeaders(cashierCtx),
  });
}

export function postRedemptionApprove(
  token: string,
  redemptionId: string,
  cashierCtx?: CashierOperationIds | null,
) {
  return loyaltyFetch<RedemptionRow>(
    token,
    `/redemptions/${encodeURIComponent(redemptionId)}/approve`,
    { method: "POST", headers: cashierHeaders(cashierCtx) },
  );
}

export type CashierBootstrap = {
  branches: Array<{ id: string; name: string; slug: string | null }>;
  myOpenShift: null | {
    id: string;
    deviceSessionId: string;
    status: string;
    startedAt: string;
    deviceSession: {
      id: string;
      deviceLabel: string;
      branchId: string | null;
      branch: { id: string; name: string } | null;
    };
    user: { id: string; name: string; email: string };
  };
};

export function getCashierBootstrap(token: string) {
  return loyaltyFetch<CashierBootstrap>(token, "/cashier/bootstrap");
}

export function postCashierDeviceSession(
  token: string,
  body: { deviceLabel: string; branchId?: string | null },
) {
  return loyaltyFetch<{
    id: string;
    deviceLabel: string;
    branchId: string | null;
    status: string;
    startedAt: string;
  }>(token, "/cashier/device-sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postCashierDeviceSessionClose(token: string, deviceSessionId: string) {
  return loyaltyFetch<{ ok: boolean; closedShifts: number }>(
    token,
    `/cashier/device-sessions/${encodeURIComponent(deviceSessionId)}/close`,
    { method: "POST" },
  );
}

export function postCashierShiftStart(
  token: string,
  body: { deviceSessionId: string },
) {
  return loyaltyFetch<unknown>(token, "/cashier/shifts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postCashierShiftClose(token: string, shiftId: string) {
  return loyaltyFetch<unknown>(
    token,
    `/cashier/shifts/${encodeURIComponent(shiftId)}/close`,
    { method: "POST" },
  );
}

export type CashierShiftSummary = {
  shift: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    user: { id: string; name: string; email: string };
    deviceSession: {
      id: string;
      deviceLabel: string;
      branchId: string | null;
    };
  };
  visitCount: number;
  totalPointsIssued: number;
  redemptionCount: number;
  totalPointsRedeemed: number;
};

export function getCashierShiftSummary(token: string, shiftId: string) {
  return loyaltyFetch<CashierShiftSummary>(
    token,
    `/cashier/shifts/${encodeURIComponent(shiftId)}/summary`,
  );
}

export function postRedemptionReject(token: string, redemptionId: string) {
  return loyaltyFetch<RedemptionRow>(
    token,
    `/redemptions/${encodeURIComponent(redemptionId)}/reject`,
    { method: "POST" },
  );
}
