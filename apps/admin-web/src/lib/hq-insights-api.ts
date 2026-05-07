import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type HqAiInsightRow = {
  id: string;
  branchId: string | null;
  type: string;
  severity: string;
  message: string;
  suggestedAction: string;
  actionKind: string;
  payload: unknown;
  createdAt: string;
};

async function hqInsightsFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(buildAuthHeaders(token) ?? {}),
      ...(init?.headers ?? {}),
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
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export function fetchHqAiInsights(token: string) {
  return hqInsightsFetch<HqAiInsightRow[]>(token, "/tenant/hq-insights");
}

export function dismissHqAiInsight(token: string, id: string) {
  return hqInsightsFetch<{ ok: true }>(token, `/tenant/hq-insights/${encodeURIComponent(id)}/dismiss`, {
    method: "POST",
  });
}

export type HqInsightExecuteResult =
  | { result: "campaign_created"; campaignId: string }
  | { result: "navigate"; path: string };

export function executeHqAiInsight(token: string, id: string) {
  return hqInsightsFetch<HqInsightExecuteResult>(
    token,
    `/tenant/hq-insights/${encodeURIComponent(id)}/execute`,
    { method: "POST" },
  );
}
