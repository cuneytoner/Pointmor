import { getApiBaseUrl } from "./api-base";

export type PublicMenuPayload = {
  storeSettings: {
    storeName: string;
    logoUrl: string | null;
    primaryColor: string;
    defaultLanguage: string;
    supportedLanguages: string[];
    currency: string;
    timezone: string;
    address: unknown | null;
  };
  /** Tek istekte sadakat özeti — ek GET yok. */
  loyaltyPreview: {
    pointsPerMajorMinor: number;
    teaserTitle: string | null;
    teaserBody: string | null;
    ctaVariant: "default" | "alt";
  };
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      currency: string | null;
      imageUrl: string | null;
      sortOrder: number;
    }>;
  }>;
};

export async function getPublicMenu(tenantSlug: string): Promise<PublicMenuPayload> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/public/tenants/${encodeURIComponent(tenantSlug)}/menu`,
    { credentials: "omit" },
  );
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<PublicMenuPayload>;
}
