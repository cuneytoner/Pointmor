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
import { signCustomerAccessToken, verifyCustomerAccessToken } from "../lib/customer-portal-jwt.js";
import { requireCustomerBearer } from "../lib/public-customer-auth.js";
import { recordProductAnalyticsEvent } from "../lib/product-analytics-service.js";

const PRODUCT_ANALYTICS_TYPES = new Set<string>([
  "qr_opened",
  "customer_viewed_home",
  "visit_recorded",
  "points_awarded",
  "reward_viewed",
  "reward_claimed",
  "redemption_completed",
]);

function tenantBrandingPlaceholder() {
  return {
    primaryHex: "#0056b3",
    logoUrl: null as string | null,
  };
}

async function resolveTenantOr404(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.trim() },
  });
  return tenant;
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
          await recordProductAnalyticsEvent({
            tenantId: tenant.id,
            customerId: null,
            type: "qr_opened",
            payload: { source: "tenant_catalog" },
          });
          const [rewards, campaigns] = await Promise.all([
            listRewards(tenant.id, true),
            getPublicCampaignsCatalog(tenant.id),
          ]);
          return {
            tenant: {
              slug: tenant.slug,
              name: tenant.name,
              branding: tenantBrandingPlaceholder(),
            },
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
          const campaigns = await getPublicCampaignsCatalog(tenant.id);
          return { items: campaigns.map(toPublicCampaignDto) };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/customers/me",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerBearer(req, reply, slug);
          if (!ctx) return;
          const [dashboard, tenantRow] = await Promise.all([
            getCustomerPortalData(ctx.tenantId, ctx.customerId),
            prisma.tenant.findUnique({ where: { id: ctx.tenantId } }),
          ]);
          if (!tenantRow) {
            return reply.code(404).send({ error: "not_found" });
          }
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
            tenant: {
              slug: tenantRow.slug,
              name: tenantRow.name,
              branding: tenantBrandingPlaceholder(),
            },
          };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/tenants/:tenantSlug/customers/me/account",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerBearer(req, reply, slug);
          if (!ctx) return;
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
          const ctx = await requireCustomerBearer(req, reply, slug);
          if (!ctx) return;
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

      f.post<{ Params: { tenantSlug: string }; Body: { rewardId?: string } }>(
        "/public/tenants/:tenantSlug/claims",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerBearer(req, reply, slug);
          if (!ctx) return;
          const rewardId = String(req.body?.rewardId ?? "").trim();
          if (!rewardId) {
            req.log.warn({ route: "public.claims" }, "public_api_validation");
            return reply.code(400).send({ error: "validation_error" });
          }
          try {
            const row = await createRedemptionClaim(
              ctx.tenantId,
              ctx.customerId,
              rewardId,
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
      }>("/public/tenants/:tenantSlug/analytics/events", async (req, reply) => {
        const slug = req.params.tenantSlug.trim();
        const tenant = await resolveTenantOr404(slug);
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
        if (tok) {
          const pl = verifyCustomerAccessToken(tok);
          if (pl && pl.tenantId === tenant.id) {
            customerId = pl.customerId;
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

  await app.register(
    async function sessionScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_SESSION_RATE_MAX ?? 20),
        timeWindow: "1 minute",
      });

      f.post<{ Params: { tenantSlug: string }; Body: { phone?: string } }>(
        "/public/tenants/:tenantSlug/session",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const phone = normalizeCustomerPhone(String(req.body?.phone ?? ""));
          if (!phone) {
            req.log.warn({ route: "public.session", ip: req.ip }, "public_api_validation");
            return reply.code(400).send({ error: "validation_error" });
          }
          const tenant = await resolveTenantOr404(slug);
          if (!tenant) {
            req.log.warn({ slug, route: "public.session" }, "public_api_not_found");
            return reply.code(404).send({ error: "not_found" });
          }
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
          const token = signCustomerAccessToken(customer.id, tenant.id);
          const dashboard = await getCustomerPortalData(tenant.id, customer.id);
          return {
            token,
            ...dashboard,
            rewards: dashboard.rewards.map(toPublicRewardDto),
            campaigns: dashboard.campaigns.map(toPublicCampaignDto),
            tenant: {
              slug: tenant.slug,
              name: tenant.name,
              branding: tenantBrandingPlaceholder(),
            },
          };
        },
      );
    },
    { prefix: "" },
  );
}
