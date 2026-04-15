import { Prisma, type StoreSettings, type Tenant } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

const DEFAULT_PRIMARY = "#0056b3";

export type StoreSettingsPublicView = {
  storeName: string;
  logoUrl: string | null;
  primaryColor: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  timezone: string;
  address: Prisma.JsonValue | null;
  contactPhone: string | null;
  contactEmail: string | null;
  loyaltyPublicEnabled: boolean;
  menuPublicEnabled: boolean;
};

export function tenantBrandingFromView(
  view: StoreSettingsPublicView,
  tenant: Pick<Tenant, "slug" | "name">,
): {
  slug: string;
  name: string;
  branding: { primaryHex: string; logoUrl: string | null };
} {
  return {
    slug: tenant.slug,
    name: view.storeName.trim() || tenant.name,
    branding: {
      primaryHex: view.primaryColor || DEFAULT_PRIMARY,
      logoUrl: view.logoUrl,
    },
  };
}

/** Tek DB görünümü — tenant + dil stratejisi (public bootstrap). */
export async function loadTenantPublicMeta(tenant: Tenant) {
  const view = await loadStoreSettingsView(tenant.id, tenant.name);
  return {
    tenant: tenantBrandingFromView(view, tenant),
    storeSettings: {
      defaultLanguage: view.defaultLanguage,
      supportedLanguages: view.supportedLanguages,
      menuPublicEnabled: view.menuPublicEnabled,
    },
  };
}

export async function loadStoreSettingsView(
  tenantId: string,
  tenantName: string,
): Promise<StoreSettingsPublicView> {
  const row = await prisma.storeSettings.findUnique({ where: { tenantId } });
  if (row) return mapRowToView(row);
  return {
    storeName: tenantName,
    logoUrl: null,
    primaryColor: DEFAULT_PRIMARY,
    defaultLanguage: "en",
    supportedLanguages: ["en", "tr"],
    currency: "EUR",
    timezone: "UTC",
    address: null,
    contactPhone: null,
    contactEmail: null,
    loyaltyPublicEnabled: true,
    menuPublicEnabled: false,
  };
}

function mapRowToView(row: StoreSettings): StoreSettingsPublicView {
  return {
    storeName: row.storeName,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    defaultLanguage: row.defaultLanguage,
    supportedLanguages: row.supportedLanguages,
    currency: row.currency,
    timezone: row.timezone,
    address: row.address,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    loyaltyPublicEnabled: row.loyaltyPublicEnabled,
    menuPublicEnabled: row.menuPublicEnabled,
  };
}

export async function ensureStoreSettingsRow(tenantId: string): Promise<StoreSettings> {
  const existing = await prisma.storeSettings.findUnique({ where: { tenantId } });
  if (existing) return existing;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    const err = Object.assign(new Error("tenant_not_found"), { statusCode: 404 });
    throw err;
  }
  return prisma.storeSettings.create({
    data: {
      tenantId,
      storeName: tenant.name,
      primaryColor: DEFAULT_PRIMARY,
      defaultLanguage: "en",
      supportedLanguages: ["en", "tr"],
      currency: "EUR",
      timezone: "UTC",
    },
  });
}

function normalizeLangList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function isHexColor(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());
}

export function validateStoreSettingsPut(body: unknown): {
  storeName: string;
  logoUrl: string | null;
  primaryColor: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency: string;
  timezone: string;
  address: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  contactPhone: string | null;
  contactEmail: string | null;
  loyaltyPublicEnabled: boolean;
  menuPublicEnabled: boolean;
} {
  if (!body || typeof body !== "object") {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const b = body as Record<string, unknown>;

  const storeName = String(b.storeName ?? "").trim();
  if (!storeName || storeName.length > 200) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  const logoRaw = b.logoUrl;
  const logoUrl =
    logoRaw === null || logoRaw === undefined
      ? null
      : String(logoRaw).trim() || null;
  if (logoUrl && logoUrl.length > 2000) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  const primaryColor = String(b.primaryColor ?? DEFAULT_PRIMARY).trim() || DEFAULT_PRIMARY;
  if (!isHexColor(primaryColor)) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  const defaultLanguage = String(b.defaultLanguage ?? "en")
    .trim()
    .toLowerCase()
    .slice(0, 16);
  if (!defaultLanguage) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  let supportedLanguages = normalizeLangList(b.supportedLanguages);
  if (supportedLanguages.length === 0) {
    supportedLanguages = [defaultLanguage];
  }
  if (supportedLanguages.length > 32) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  if (!supportedLanguages.includes(defaultLanguage)) {
    const err = Object.assign(new Error("default_language_not_supported"), {
      statusCode: 400,
    });
    throw err;
  }

  const currency = String(b.currency ?? "EUR")
    .trim()
    .toUpperCase()
    .slice(0, 8);
  if (!currency || currency.length !== 3) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  const timezone = String(b.timezone ?? "UTC").trim().slice(0, 80);
  if (!timezone) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  let address: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (b.address === undefined) {
    address = undefined;
  } else if (b.address === null) {
    address = Prisma.JsonNull;
  } else if (typeof b.address === "object" && b.address !== null) {
    address = b.address as Prisma.InputJsonValue;
  } else if (typeof b.address === "string") {
    const t = b.address.trim();
    if (!t) {
      address = Prisma.JsonNull;
    } else {
      try {
        address = JSON.parse(t) as Prisma.InputJsonValue;
      } catch {
        const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
        throw err;
      }
    }
  } else {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  const contactPhone =
    b.contactPhone === null || b.contactPhone === undefined
      ? null
      : String(b.contactPhone).trim().slice(0, 40) || null;
  const contactEmail =
    b.contactEmail === null || b.contactEmail === undefined
      ? null
      : String(b.contactEmail).trim().slice(0, 200) || null;

  const loyaltyPublicEnabled = Boolean(b.loyaltyPublicEnabled);
  const menuPublicEnabled = Boolean(b.menuPublicEnabled);

  return {
    storeName,
    logoUrl,
    primaryColor,
    defaultLanguage,
    supportedLanguages,
    currency,
    timezone,
    address,
    contactPhone,
    contactEmail,
    loyaltyPublicEnabled,
    menuPublicEnabled,
  };
}
