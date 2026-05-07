import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type TenantBranchMetricsResponse = {
  periodDays: number;
  branches: Array<{
    branchId: string;
    name: string;
    slug: string | null;
    visits: number;
  }>;
  unassignedVisits: number;
};

export async function fetchTenantBranchMetrics(
  token: string,
): Promise<TenantBranchMetricsResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/tenant/branches/metrics`, {
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
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<TenantBranchMetricsResponse>;
}
