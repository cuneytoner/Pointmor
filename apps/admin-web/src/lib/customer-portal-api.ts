import { getApiBaseUrl } from "./api-base";

export type CustomerTenantBranding = {
  primaryHex: string;
  logoUrl: string | null;
};

export type CustomerTenantMeta = {
  slug: string;
  name: string;
  branding: CustomerTenantBranding;
};

export type CustomerPortalBootstrap = {
  tenant: CustomerTenantMeta;
  /** Dil stratejisi — mağaza ayarlarından (DB yoksa API varsayılanı). */
  storeSettings?: {
    defaultLanguage: string;
    supportedLanguages: string[];
    menuPublicEnabled?: boolean;
  };
  rewards: Array<{
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
    isActive: boolean;
    rewardType?: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: string;
  }>;
};

export type CustomerPortalDashboard = {
  token?: string;
  tenant?: CustomerTenantMeta;
  storeSettings?: CustomerPortalBootstrap["storeSettings"];
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  pointsBalance: number;
  ledgerSum: number;
  ledgerMatchesCache: boolean;
  recentVisits: Array<{
    id: string;
    amount: number;
    pointsEarned: number;
    basePointsEarned?: number;
    bonusPointsEarned?: number;
    createdAt: string;
  }>;
  rewards: CustomerPortalBootstrap["rewards"];
  campaigns: CustomerPortalBootstrap["campaigns"];
  pendingClaims: Array<{
    id: string;
    pointsSpent: number;
    createdAt: string;
    reward: { id: string; name: string; pointsCost: number };
  }>;
  recentRedemptions: Array<{
    id: string;
    pointsSpent: number;
    createdAt: string;
    reward: { id: string; name: string };
  }>;
  recentLedger: Array<{
    id: string;
    type: string;
    points: number;
    source: string;
    referenceId: string | null;
    createdAt: string;
  }>;
};

function publicFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }
  return fetch(`${base}${path}`, {
    method: init?.method,
    body: init?.body,
    headers,
    credentials: "omit",
  }).then(async (res) => {
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
  });
}

const publicTenantBase = (tenantSlug: string) =>
  `/public/tenants/${encodeURIComponent(tenantSlug)}`;

export function getCustomerPortalBootstrap(tenantSlug: string) {
  return publicFetch<CustomerPortalBootstrap>(`${publicTenantBase(tenantSlug)}`);
}

export function postCustomerPortalSession(tenantSlug: string, phone: string) {
  return publicFetch<CustomerPortalDashboard & { token: string }>(
    `${publicTenantBase(tenantSlug)}/session`,
    { method: "POST", body: JSON.stringify({ phone }) },
  );
}

export function getCustomerPortalMe(tenantSlug: string, token: string) {
  return publicFetch<CustomerPortalDashboard>(
    `${publicTenantBase(tenantSlug)}/customers/me`,
    { token },
  );
}

export function postCustomerClaim(
  tenantSlug: string,
  token: string,
  rewardId: string,
) {
  return publicFetch<{
    id: string;
    status: string;
    reward?: { id: string; name: string; pointsCost: number };
  }>(`${publicTenantBase(tenantSlug)}/claims`, {
    method: "POST",
    body: JSON.stringify({ rewardId }),
    token,
  });
}

export function postCustomerProductAnalyticsEvent(
  tenantSlug: string,
  token: string | null,
  body: { type: string; payload?: Record<string, unknown> },
) {
  return publicFetch<{ ok: boolean }>(
    `${publicTenantBase(tenantSlug)}/analytics/events`,
    {
      method: "POST",
      body: JSON.stringify({
        type: body.type,
        ...(body.payload ? { payload: body.payload } : {}),
        ...(token ? { token } : {}),
      }),
    },
  );
}

export function customerTokenStorageKey(tenantSlug: string) {
  return `pointmor_customer_token_${tenantSlug}`;
}

export const CUSTOMER_LAST_TENANT_SLUG_KEY = "pointmor_customer_last_slug";

/** Son görüntülenen bakiye — ziyaret sonrası artış kutlaması için */
export function customerLastSeenBalanceKey(tenantSlug: string) {
  return `pointmor_seen_balance_${tenantSlug}`;
}

export function customerPwaSnapshotKey(tenantSlug: string) {
  return `pointmor_pwa_snapshot_${tenantSlug}`;
}
