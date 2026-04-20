import { prisma } from "./prisma.js";
import {
  getPublicCampaignsCatalog,
  listRewards,
} from "./loyalty-service.js";
import { loadStoreSettingsView } from "./store-settings-service.js";

/** Menü fiyatına göre tahmini puan: her `pointsPerMajorMinor` minor birim için 1 puan (varsayılan 100 = 1,00 birim). */
const DEFAULT_POINTS_PER_MAJOR_MINOR = 100;

function buildLoyaltyTeaserCopy(
  campaigns: Awaited<ReturnType<typeof getPublicCampaignsCatalog>>,
  rewards: Awaited<ReturnType<typeof listRewards>>,
): { title: string | null; body: string | null } {
  const c0 = campaigns[0];
  if (c0) {
    const body =
      c0.description && String(c0.description).trim()
        ? String(c0.description).trim().slice(0, 220)
        : null;
    return { title: c0.name, body };
  }
  const r0 = rewards[0];
  if (r0) {
    const body =
      r0.description && String(r0.description).trim()
        ? String(r0.description).trim().slice(0, 220)
        : null;
    return { title: r0.name, body };
  }
  return { title: null, body: null };
}

export async function getPublicMenuPayload(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.trim() },
  });
  if (!tenant) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }
  const view = await loadStoreSettingsView(tenant.id, tenant.name);
  if (!view.menuPublicEnabled) {
    const err = Object.assign(new Error("menu_disabled"), { statusCode: 403 });
    throw err;
  }

  const [categories, campaigns, rewards] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    }),
    getPublicCampaignsCatalog(tenant.id),
    listRewards(tenant.id, true),
  ]);

  const teaser = buildLoyaltyTeaserCopy(campaigns, rewards);
  const ctaVariantRaw = process.env.PUBLIC_MENU_LOYALTY_CTA_VARIANT?.trim().toLowerCase();
  const ctaVariant = ctaVariantRaw === "alt" ? "alt" : "default";

  return {
    storeSettings: {
      storeName: view.storeName,
      logoUrl: view.logoUrl,
      primaryColor: view.primaryColor,
      defaultLanguage: view.defaultLanguage,
      supportedLanguages: view.supportedLanguages,
      currency: view.currency,
      timezone: view.timezone,
      address: view.address,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      items: c.items.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: it.price,
        currency: it.currency,
        imageUrl: it.imageUrl,
        sortOrder: it.sortOrder,
      })),
    })),
    loyaltyPreview: {
      /** Tahmini puan: max(1, floor(priceMinor / pointsPerMajorMinor)). */
      pointsPerMajorMinor: DEFAULT_POINTS_PER_MAJOR_MINOR,
      teaserTitle: teaser.title,
      teaserBody: teaser.body,
      ctaVariant,
    },
  };
}
