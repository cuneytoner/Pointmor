import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { ProductAnalyticsEventType } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { normalizeCustomerPhone } from "../lib/loyalty-config.js";
import {
  createRedemptionClaim,
  getCustomerPortalData,
  getPublicCampaignsCatalog,
  getPublicCustomerAccountSummary,
  getPublicCustomerActivityLedger,
  listRewards,
  toPublicCampaignDto,
  toPublicRewardDto,
} from "../lib/loyalty-service.js";
import {
  customerPortalTokenTtlSeconds,
  signCustomerAccessToken,
  verifyCustomerAccessToken,
} from "../lib/customer-portal-jwt.js";
import { requireCustomerSession } from "../lib/public-customer-auth.js";
import { recordProductAnalyticsEvent } from "../lib/product-analytics-service.js";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  customerSessionCookieClearOptions,
  customerSessionCookieOnlyMode,
  customerSessionCookieOptions,
} from "../lib/customer-session-cookie.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";
import { loadTenantPublicMeta } from "../lib/store-settings-service.js";
import { getSecurityState } from "../lib/security-state.js";
import { bumpRuntimeSecurityMetric } from "../lib/runtime-security-metrics.js";
import { getPublicMenuPayload } from "../lib/public-menu-service.js";
import { getOrCreateStoreMessagingSettings } from "../lib/messaging/store-messaging-settings.js";
import { parseWithSchema, z } from "../lib/validation.js";

const PRODUCT_ANALYTICS_TYPES = new Set<string>([
  "qr_opened",
  "customer_viewed_home",
  "visit_recorded",
  "points_awarded",
  "reward_viewed",
  "reward_claimed",
  "redemption_completed",
]);

const customerSessionSchema = z.object({
  phone: z.string().trim().min(3, "Telefon gerekli."),
});

const customerClaimSchema = z.object({
  rewardId: z.string().trim().min(1, "Ödül gerekli."),
});

const productAnalyticsSchema = z.object({
  type: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  token: z.string().trim().optional(),
});

async function resolveTenantOr404(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.trim() },
  });
  return tenant;
}

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

export async function registerPublicTenantRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async function publicTenantScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_API_RATE_MAX ?? 120),
        timeWindow: "1 minute",
      });

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            req.log.warn({ slug, route: "public.tenants.get" }, "public_api_not_found");
            return reply.code(404).send({ error: "not_found" });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;
          await recordProductAnalyticsEvent({
            tenantId: tenant.id,
            customerId: null,
            type: "qr_opened",
            payload: { source: "tenant_catalog" },
          });
          const [rewards, campaigns, meta] = await Promise.all([
            listRewards(tenant.id, true),
            getPublicCampaignsCatalog(tenant.id),
            loadTenantPublicMeta(tenant),
          ]);
          return {
            tenant: meta.tenant,
            storeSettings: meta.storeSettings,
            rewards: rewards.map(toPublicRewardDto),
            campaigns: campaigns.map(toPublicCampaignDto),
          };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/rewards",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            return reply.code(404).send({ error: "not_found" });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;
          const rewards = await listRewards(tenant.id, true);
          return { items: rewards.map(toPublicRewardDto) };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/campaigns",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            return reply.code(404).send({ error: "not_found" });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;
          const campaigns = await getPublicCampaignsCatalog(tenant.id);
          return { items: campaigns.map(toPublicCampaignDto) };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/menu",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          try {
            return await getPublicMenuPayload(slug);
          } catch (e) {
            const code = (e as Error & { statusCode?: number }).statusCode;
            const msg = (e as Error).message;
            if (code === 404) return reply.code(404).send({ error: "not_found" });
            if (code === 403 && msg === "menu_disabled") {
              return reply.code(403).send({ error: "menu_disabled" });
            }
            throw e;
          }
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/customers/me",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerSession(req, reply, slug);
          if (!ctx) return;
          if (!(await ensureCustomerPwaEnabled(ctx.tenantId, reply))) return;
          const [dashboard, tenantRow] = await Promise.all([
            getCustomerPortalData(ctx.tenantId, ctx.customerId),
            prisma.tenant.findUnique({ where: { id: ctx.tenantId } }),
          ]);
          if (!tenantRow) {
            return reply.code(404).send({ error: "not_found" });
          }
          const meta = await loadTenantPublicMeta(tenantRow);
          await recordProductAnalyticsEvent({
            tenantId: ctx.tenantId,
            customerId: ctx.customerId,
            type: "customer_viewed_home",
            payload: { source: "customers_me" },
          });
          return {
            ...dashboard,
            rewards: dashboard.rewards.map(toPublicRewardDto),
            campaigns: dashboard.campaigns.map(toPublicCampaignDto),
            tenant: meta.tenant,
            storeSettings: meta.storeSettings,
          };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/customers/me/account",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerSession(req, reply, slug);
          if (!ctx) return;
          if (!(await ensureCustomerPwaEnabled(ctx.tenantId, reply))) return;
          try {
            return await getPublicCustomerAccountSummary(ctx.tenantId, ctx.customerId);
          } catch (e) {
            const code = (e as Error & { statusCode?: number }).statusCode;
            if (code === 404) return reply.code(404).send({ error: "not_found" });
            throw e;
          }
        },
      );

      f.get<{ Params: { tenantSlug: string }; Querystring: { limit?: string } }>(
        "/public/tenants/:tenantSlug/activity",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerSession(req, reply, slug);
          if (!ctx) return;
          if (!(await ensureCustomerPwaEnabled(ctx.tenantId, reply))) return;
          const raw = req.query?.limit;
          const n = raw !== undefined ? Number(raw) : 40;
          const items = await getPublicCustomerActivityLedger(
            ctx.tenantId,
            ctx.customerId,
            Number.isFinite(n) ? n : 40,
          );
          return { items };
        },
      );

      f.post<{ Params: { tenantSlug: string }; Body: unknown }>(
        "/public/tenants/:tenantSlug/claims",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerSession(req, reply, slug);
          if (!ctx) return;
          if (!(await ensureCustomerPwaEnabled(ctx.tenantId, reply))) return;
          const parsed = parseWithSchema(customerClaimSchema, req.body);
          if (!parsed.ok) {
            req.log.warn({ route: "public.claims" }, "public_api_validation");
            return reply.code(400).send({ error: parsed.error, message: parsed.message });
          }
          const rewardId = parsed.data.rewardId;
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

      f.post<{ Params: { tenantSlug: string }; Body: unknown }>(
        "/public/tenants/:tenantSlug/analytics/events",
        async (req, reply) => {
        const slug = req.params.tenantSlug.trim();
        const tenant = await resolveTenantOr404(slug);
        if (!tenant) {
          return reply.code(404).send({ error: "not_found" });
        }
        const parsed = parseWithSchema(productAnalyticsSchema, req.body);
        if (!parsed.ok) {
          return reply.code(400).send({ error: parsed.error, message: parsed.message });
        }
        const rawType = parsed.data.type;
        if (!PRODUCT_ANALYTICS_TYPES.has(rawType)) {
          return reply.code(400).send({ error: "validation_error" });
        }
        const type = rawType as ProductAnalyticsEventType;
        let customerId: string | null = null;
        const tok = parsed.data.token?.trim() ?? "";
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
        const payload = parsed.data.payload;
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
        },
      );
    },
    { prefix: "" },
  );

  await app.register(
    async function sessionScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_SESSION_RATE_MAX ?? 20),
        timeWindow: "1 minute",
      });

      f.post<{ Params: { tenantSlug: string }; Body: unknown }>(
        "/public/tenants/:tenantSlug/session",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const parsed = parseWithSchema(customerSessionSchema, req.body);
          if (!parsed.ok) {
            req.log.warn({ route: "public.session", ip: req.ip }, "public_api_validation");
            return reply.code(400).send({ error: parsed.error, message: parsed.message });
          }
          const phone = normalizeCustomerPhone(parsed.data.phone);
          if (!phone) {
            req.log.warn({ route: "public.session", ip: req.ip }, "public_api_validation");
            return reply.code(400).send({ error: "validation_error" });
          }
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            req.log.warn({ slug, route: "public.session" }, "public_api_not_found");
            return reply.code(404).send({ error: "not_found" });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;
          const customer = await prisma.customer.findFirst({
            where: { tenantId: tenant.id, phone },
          });
          if (!customer) {
            req.log.warn(
              { tenantId: tenant.id, route: "public.session" },
              "public_api_customer_not_found",
            );
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
          const meta = await loadTenantPublicMeta(tenant);
          const baseResponse = {
            ...dashboard,
            rewards: dashboard.rewards.map(toPublicRewardDto),
            campaigns: dashboard.campaigns.map(toPublicCampaignDto),
            tenant: meta.tenant,
            storeSettings: meta.storeSettings,
          };
          if (customerSessionCookieOnlyMode()) return baseResponse;
          return { token, ...baseResponse };
        },
      );

      f.post<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/session/logout",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            return reply.code(404).send({ error: "not_found" });
          }
          const raw = String(req.cookies?.[CUSTOMER_SESSION_COOKIE_NAME] ?? "").trim();
          if (raw) {
            const pl = verifyCustomerAccessToken(raw);
            if (pl?.jti) {
              await getSecurityState().markCustomerJtiRevoked(
                pl.jti,
                customerPortalTokenTtlSeconds(),
              );
            }
          }
          reply.setCookie(
            CUSTOMER_SESSION_COOKIE_NAME,
            "",
            customerSessionCookieClearOptions(tenant.slug),
          );
          return { ok: true };
        },
      );
    },
    { prefix: "" },
  );
}
