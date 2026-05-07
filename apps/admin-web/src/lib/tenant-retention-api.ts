import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type RetentionFieldLimit =
  | { kind: "fixed"; value: number }
  | { kind: "enum"; values: readonly number[] }
  | { kind: "range"; min: number; max: number };

export type TenantRetentionSettingsDto = {
  tier: "free" | "pro" | "growth";
  canCustomize: boolean;
  limits: {
    operationalAudit: RetentionFieldLimit;
    exportAudit: RetentionFieldLimit;
    messaging: RetentionFieldLimit;
    anomaly: RetentionFieldLimit;
  };
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
};

export type TenantRetentionPutBody = {
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
};

async function tenantApiFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(buildAuthHeaders(token) ?? {}),
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
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export function getTenantRetentionSettings(token: string) {
  return tenantApiFetch<TenantRetentionSettingsDto>(token, "/tenant/retention-settings");
}

export function putTenantRetentionSettings(token: string, body: TenantRetentionPutBody) {
  return tenantApiFetch<TenantRetentionSettingsDto>(token, "/tenant/retention-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
