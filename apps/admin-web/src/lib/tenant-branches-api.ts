import { buildAuthHeaders, getApiBaseUrl, type ApiAuthToken } from "./api-base";

export type TenantBranchDto = {
  id: string;
  tenantId: string;
  name: string;
  slug: string | null;
  address: unknown | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

async function tenantApiFetch<T>(
  token: ApiAuthToken,
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

export function fetchTenantBranches(token: ApiAuthToken) {
  return tenantApiFetch<TenantBranchDto[]>(token, "/cashier/branches");
}

export function createTenantBranch(
  token: ApiAuthToken,
  body: { name: string; slug?: string | null },
) {
  return tenantApiFetch<TenantBranchDto>(token, "/cashier/branches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchTenantBranch(
  token: ApiAuthToken,
  branchId: string,
  body: Partial<{
    name: string;
    slug: string | null;
    address: unknown | null;
    isActive: boolean;
  }>,
) {
  return tenantApiFetch<TenantBranchDto>(
    token,
    `/cashier/branches/${encodeURIComponent(branchId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}
