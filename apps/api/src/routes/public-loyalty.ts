import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { ProductAnalyticsEventType } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { normalizeCustomerPhone } from "../lib/loyalty-config.js";
import { createRedemptionClaim, getCustomerPortalData } from "../lib/loyalty-service.js";
import {
  signCustomerAccessToken,
  verifyCustomerAccessToken,
} from "../lib/customer-portal-jwt.js";
import { requireCustomerSession } from "../lib/public-customer-auth.js";
import { recordProductAnalyticsEvent } from "../lib/product-analytics-service.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";
import { getOrCreateStoreMessagingSettings } from "../lib/messaging/store-messaging-settings.js";
import { getSecurityState } from "../lib/security-state.js";
import { bumpRuntimeSecurityMetric } from "../lib/runtime-security-metrics.js";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  customerSessionCookieOnlyMode,
  customerSessionCookieOptions,
} from "../lib/customer-session-cookie.js";

async function ensureCustomerPwaEnabled(
  tenantId: string,
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): Promise<boolean> {
  try {
    const ent = await getTenantEntitlementContext(tenantId);
    assertFeature(ent, FEATURE.CUSTOMER_PWA);
    return true;
  } catch (e) {
    if (sendEntitlementHttpError(reply, e)) return false;
    throw e;
  }
}

const PRODUCT_ANALYTICS_TYPES = new Set<string>([
  "qr_opened",
  "customer_viewed_home",
  "visit_recorded",
  "points_awarded",
  "reward_viewed",
  "reward_claimed",
  "redemption_completed",
]);

/** @deprecated Legacy `/public/loyalty/*` — canonical müşteri API’si `/public/tenants/:slug/*`. GET uçları 308 ile yönlendirilir; POST uçları geçici uyumluluk için yerinde kalır. */
export async function registerPublicLoyaltyRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async function publicLoyaltyScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_LOYALTY_RATE_MAX ?? 60),
        timeWindow: "1 minute",
      });

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/loyalty/:tenantSlug/bootstrap",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const encoded = encodeURIComponent(slug);
          return reply.redirect(`/public/tenants/${encoded}`, 308);
        },
      );

      f.post<{ Params: { tenantSlug: string }; Body: { phone?: string } }>(
        "/public/loyalty/:tenantSlug/session",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const phone = normalizeCustomerPhone(String(req.body?.phone ?? ""));
          if (!phone) {
            return reply.code(400).send({ error: "validation_error" });
          }
          const tenant = await prisma.tenant.findUnique({ where: { slug } });
          if (!tenant) {
            return reply.code(404).send({ error: "not_found" });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;
          const customer = await prisma.customer.findFirst({
            where: { tenantId: tenant.id, phone },
          });
          if (!customer) {
            return reply.code(404).send({ error: "customer_not_found" });
          }
          const messaging = await getOrCreateStoreMessagingSettings(tenant.id);
          if (messaging.requireVerifiedForSession) {
            const pref = await prisma.customerContactPreference.findUnique({
              where: { customerId: customer.id },
            });
            if (!pref?.verifiedAt) {
              return reply.code(403).send({
                error: "phone_not_verified",
                message: "Bu işletme telefon doğrulaması gerektiriyor; /verify akışını kullanın.",
              });
            }
          }
          const token = signCustomerAccessToken(customer.id, tenant.id);
          reply.setCookie(
            CUSTOMER_SESSION_COOKIE_NAME,
            token,
            customerSessionCookieOptions(tenant.slug),
          );
          const dashboard = await getCustomerPortalData(tenant.id, customer.id);
          const baseResponse = {
            ...dashboard,
            tenant: {
              slug: tenant.slug,
              name: tenant.name,
              branding: { primaryHex: "#0056b3", logoUrl: null as string | null },
            },
          };
          if (customerSessionCookieOnlyMode()) return baseResponse;
          return { token, ...baseResponse };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/loyalty/:tenantSlug/me",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const encoded = encodeURIComponent(slug);
          return reply.redirect(`/public/tenants/${encoded}/customers/me`, 308);
        },
      );

      f.post<{ Params: { tenantSlug: string }; Body: { rewardId?: string } }>(
        "/public/loyalty/:tenantSlug/claims",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerSession(req, reply, slug);
          if (!ctx) return;
          if (!(await ensureCustomerPwaEnabled(ctx.tenantId, reply))) return;
          const rewardId = String(req.body?.rewardId ?? "").trim();
          if (!rewardId) {
            return reply.code(400).send({ error: "validation_error" });
          }
          try {
            const row = await createRedemptionClaim(
              ctx.tenantId,
              ctx.customerId,
              rewardId,
              { actorType: "system", userId: null },
            );
            return {
              id: row.id,
              status: row.status,
              reward: row.reward
                ? {
                    id: row.reward.id,
                    name: row.reward.name,
                    pointsCost: row.reward.pointsCost,
                  }
                : undefined,
            };
          } catch (e) {
            const err = e as Error & { statusCode?: number };
            const code = err.statusCode;
            const msg = err.message;
            if (code === 404) return reply.code(404).send({ error: "not_found" });
            if (code === 409) {
              if (msg === "duplicate_pending_claim") {
                return reply.code(409).send({ error: "duplicate_pending_claim" });
              }
              return reply.code(409).send({ error: "insufficient_points" });
            }
            throw e;
          }
        },
      );

      f.post<{
        Params: { tenantSlug: string };
        Body: { type?: string; payload?: Record<string, unknown>; token?: string };
      }>("/public/loyalty/:tenantSlug/analytics/events", async (req, reply) => {
        const slug = req.params.tenantSlug.trim();
        const tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenant) {
          return reply.code(404).send({ error: "not_found" });
        }
        const rawType = String(req.body?.type ?? "").trim();
        if (!PRODUCT_ANALYTICS_TYPES.has(rawType)) {
          return reply.code(400).send({ error: "validation_error" });
        }
        const type = rawType as ProductAnalyticsEventType;
        let customerId: string | null = null;
        const tok = String(req.body?.token ?? "").trim();
        const cookieTok = String(req.cookies?.[CUSTOMER_SESSION_COOKIE_NAME] ?? "").trim();
        const authTok = tok || cookieTok;
        if (authTok) {
          const pl = verifyCustomerAccessToken(authTok);
          if (pl && pl.tenantId === tenant.id) {
            if (!pl.jti) bumpRuntimeSecurityMetric("customer_token_missing_jti");
            const revoked = pl.jti ? await getSecurityState().isCustomerJtiRevoked(pl.jti) : false;
            if (!revoked) customerId = pl.customerId;
          }
        }
        const payload = req.body?.payload;
        await recordProductAnalyticsEvent({
          tenantId: tenant.id,
          customerId,
          type,
          payload:
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? (payload as Record<string, unknown>)
              : {},
        });
        return { ok: true };
      });
    },
    { prefix: "" },
  );
}
