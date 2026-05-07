import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type MenuCategoryDto = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemDto = {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
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
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getMenuCategories(token: string) {
  return tenantApiFetch<MenuCategoryDto[]>(token, "/tenant/menu/categories");
}

export function postMenuCategory(
  token: string,
  body: {
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return tenantApiFetch<MenuCategoryDto>(token, "/tenant/menu/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function putMenuCategory(
  token: string,
  categoryId: string,
  body: Record<string, unknown>,
) {
  return tenantApiFetch<MenuCategoryDto>(
    token,
    `/tenant/menu/categories/${encodeURIComponent(categoryId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function deleteMenuCategory(token: string, categoryId: string) {
  return tenantApiFetch<void>(
    token,
    `/tenant/menu/categories/${encodeURIComponent(categoryId)}`,
    { method: "DELETE" },
  );
}

export function getMenuItems(token: string, categoryId?: string) {
  const q = categoryId
    ? `?categoryId=${encodeURIComponent(categoryId)}`
    : "";
  return tenantApiFetch<MenuItemDto[]>(token, `/tenant/menu/items${q}`);
}

export function postMenuItem(
  token: string,
  body: {
    categoryId: string;
    name: string;
    description?: string | null;
    price: number;
    currency?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  return tenantApiFetch<MenuItemDto>(token, "/tenant/menu/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function putMenuItem(token: string, itemId: string, body: Record<string, unknown>) {
  return tenantApiFetch<MenuItemDto>(
    token,
    `/tenant/menu/items/${encodeURIComponent(itemId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function deleteMenuItem(token: string, itemId: string) {
  return tenantApiFetch<void>(
    token,
    `/tenant/menu/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
}
