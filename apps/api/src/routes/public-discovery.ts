import type { FastifyInstance } from "fastify";

const MISROUTE_HINT = {
  error: "invalid_path" as const,
  message:
    "Müşteri public API kiracı kapsamlıdır. Tüm uçlar `/public/tenants/:tenantSlug/...` altındadır; keşif için `GET /public` kullanın.",
  doc: "/public",
};

/**
 * Phase 3 — PWA / harici istemciler için keşif belgesi ve düz `/public/*` yanlış path uyarıları.
 * Kanonik uçlar: `public-tenants.ts`, `public-verify.ts`, `public-loyalty.ts` (legacy).
 */
export async function registerPublicDiscoveryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/public", async () => ({
    name: "Pointmor Public Customer API",
    phase: 3,
    access: {
      model: "phone_session_bearer",
      summary:
        "Telefon ile POST /public/tenants/:tenantSlug/session → kısa ömürlü HS256 müşteri JWT (Authorization: Bearer).",
      verifyOptional:
        "İşletme ayarında zorunluysa /public/tenants/:tenantSlug/verify/start + verify/check.",
      tokenHeader: "Authorization: Bearer <customer_access_token>",
    },
    isolation: {
      rule: "tenantSlug URL ile çözülür; token içindeki tenantId eşleşmezse 403 tenant_mismatch.",
    },
    tenantBase: "/public/tenants/:tenantSlug",
    endpoints: [
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug",
        description: "İşletme özeti, vitrin ödülleri ve aktif kampanyalar (anonim)",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/rewards",
        description: "Ödül listesi",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/campaigns",
        description: "Kampanya listesi",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/menu",
        description: "Menü (plan + ayarlara bağlı)",
      },
      {
        method: "POST",
        path: "/public/tenants/:tenantSlug/session",
        description: "Telefon → müşteri JWT + portal özeti",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/customers/me",
        description: "Kimlik doğrulanmış müşteri özeti (Bearer)",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/customers/me/account",
        description: "Hesap: bakiye, ödüller, kampanyalar, aktivite özeti",
      },
      {
        method: "GET",
        path: "/public/tenants/:tenantSlug/activity",
        description: "Points ledger (earn/redeem/adjust)",
      },
      {
        method: "POST",
        path: "/public/tenants/:tenantSlug/claims",
        description: "Ödül talebi (pending redemption); yetersiz puan / mükerrer 409",
      },
      {
        method: "POST",
        path: "/public/tenants/:tenantSlug/analytics/events",
        description: "Ürün analitiği olayları (opsiyonel token)",
      },
    ],
    legacy: {
      note: "/public/loyalty/* uçları 308 ile yeni path’e yönlendirilir veya uyumluluk için bırakılmıştır.",
    },
  }));

  const flat = [
    "/public/customers",
    "/public/rewards",
    "/public/campaigns",
    "/public/activity",
    "/public/claims",
  ];
  for (const url of flat) {
    app.all(url, async (_req, reply) => reply.code(404).send(MISROUTE_HINT));
  }
}
