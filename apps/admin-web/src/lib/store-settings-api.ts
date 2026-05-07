import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type StoreSettingsDto = {
  id: string;
  tenantId: string;
  storeName: string;
  logoUrl: string | null;
  primaryColor: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  timezone: string;
  address: unknown | null;
  contactPhone: string | null;
  contactEmail: string | null;
  loyaltyPublicEnabled: boolean;
  menuPublicEnabled: boolean;
  createdAt: string;
  updatedAt: string;
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

export function getStoreSettings(token: string) {
  return tenantApiFetch<StoreSettingsDto>(token, "/tenant/store-settings");
}

export function putStoreSettings(token: string, body: Record<string, unknown>) {
  return tenantApiFetch<StoreSettingsDto>(token, "/tenant/store-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
