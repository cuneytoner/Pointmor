import { buildAuthHeaders, getApiBaseUrl, type ApiAuthToken } from "./api-base";

export type TenantAutomationSettingsDto = {
  id: string;
  tenantId: string;
  mode: string;
  maxActionsPerDay: number;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type AutomationActionSummary = {
  id: string;
  branchId: string | null;
  triggerType: string;
  ruleKey: string;
  actionType: string;
  status: string;
  payload?: unknown;
  result?: unknown;
  errorMessage?: string | null;
  executedAt?: string | null;
  createdAt: string;
};

export type AutomationSummaryPayload = {
  settings: TenantAutomationSettingsDto;
  pending: AutomationActionSummary[];
  recent: AutomationActionSummary[];
};

async function autFetch<T>(token: ApiAuthToken, path: string, init?: RequestInit): Promise<T> {
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

export function fetchAutomationSummary(token: ApiAuthToken) {
  return autFetch<AutomationSummaryPayload>(token, "/tenant/automation/summary");
}

export function approveAutomationAction(token: ApiAuthToken, id: string) {
  return autFetch<{ ok: true }>(
    token,
    `/tenant/automation/actions/${encodeURIComponent(id)}/approve`,
    { method: "POST" },
  );
}

export function rejectAutomationAction(token: ApiAuthToken, id: string) {
  return autFetch<{ ok: true }>(
    token,
    `/tenant/automation/actions/${encodeURIComponent(id)}/reject`,
    { method: "POST" },
  );
}
