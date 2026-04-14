import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { ProductAnalyticsEventType } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { normalizeCustomerPhone } from "../lib/loyalty-config.js";
import {
  createRedemptionClaim,
  getCustomerPortalData,
  getPublicCampaignsCatalog,
  listRewards,
} from "../lib/loyalty-service.js";
import {
  signCustomerAccessToken,
  verifyCustomerAccessToken,
} from "../lib/customer-portal-jwt.js";
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
          const tenant = await prisma.tenant.findUnique({ where: { slug } });
          if (!tenant) {
            return reply.code(404).send({ error: "not_found" });
          }
          const [rewards, campaigns] = await Promise.all([
            listRewards(tenant.id, true),
            getPublicCampaignsCatalog(tenant.id),
          ]);
          await recordProductAnalyticsEvent({
            tenantId: tenant.id,
            customerId: null,
            type: "qr_opened",
            payload: { source: "bootstrap" },
          });
          return {
            tenant: {
              slug: tenant.slug,
              name: tenant.name,
              branding: {
                primaryHex: "#0056b3",
                logoUrl: null as string | null,
              },
            },
            rewards,
            campaigns,
          };
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
          const customer = await prisma.customer.findFirst({
            where: { tenantId: tenant.id, phone },
          });
          if (!customer) {
            return reply.code(404).send({ error: "customer_not_found" });
          }
          const token = signCustomerAccessToken(customer.id, tenant.id);
          const dashboard = await getCustomerPortalData(tenant.id, customer.id);
          return {
            token,
            ...dashboard,
            tenant: {
              slug: tenant.slug,
              name: tenant.name,
              branding: { primaryHex: "#0056b3", logoUrl: null as string | null },
            },
          };
        },
      );

      f.get<{ Params: { tenantSlug: string } }>(
        "/public/loyalty/:tenantSlug/me",
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
            payload: { source: "me" },
          });
          return {
            ...dashboard,
            tenant: {
              slug: tenantRow.slug,
              name: tenantRow.name,
              branding: { primaryHex: "#0056b3", logoUrl: null as string | null },
            },
          };
        },
      );

      f.post<{ Params: { tenantSlug: string }; Body: { rewardId?: string } }>(
        "/public/loyalty/:tenantSlug/claims",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const ctx = await requireCustomerBearer(req, reply, slug);
          if (!ctx) return;
          const rewardId = String(req.body?.rewardId ?? "").trim();
          if (!rewardId) {
            return reply.code(400).send({ error: "validation_error" });
          }
          try {
            return await createRedemptionClaim(
              ctx.tenantId,
              ctx.customerId,
              rewardId,
            );
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
}
