import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "../lib/prisma.js";
import { normalizeToE164 } from "../lib/phone-e164.js";
import { normalizeCustomerPhone } from "../lib/loyalty-config.js";
import {
  getCustomerPortalData,
  getPublicCampaignsCatalog,
  toPublicCampaignDto,
  toPublicRewardDto,
} from "../lib/loyalty-service.js";
import { signCustomerAccessToken } from "../lib/customer-portal-jwt.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";
import { loadTenantPublicMeta } from "../lib/store-settings-service.js";
import { sendVerificationSms, checkVerificationCode } from "../lib/twilio/verify-service.js";
import { getOrCreateStoreMessagingSettings } from "../lib/messaging/store-messaging-settings.js";

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

export async function registerPublicVerifyRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async function verifyStartScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_VERIFY_START_RATE_MAX ?? 5),
        timeWindow: "15 minutes",
        errorResponseBuilder: () => ({
          error: "verify_rate_limited",
          message: "Çok sık doğrulama kodu istediniz; bir süre sonra tekrar deneyin.",
        }),
      });

      f.post<{ Params: { tenantSlug: string }; Body: { phone?: string } }>(
        "/public/tenants/:tenantSlug/verify/start",
        async (req, reply) => {
          const slug = req.params.tenantSlug.trim();
          const raw = String(req.body?.phone ?? "");
          const e164 = normalizeToE164(raw);
          if (!e164.ok) {
            return reply.code(400).send({
              error: "invalid_phone",
              message: "Telefon E.164 formatında olmalı (ör. +905551234567).",
            });
          }
          const tenant = await prisma.tenant.findUnique({ where: { slug } });
          if (!tenant) {
            return reply.code(404).send({ error: "not_found", message: "İşletme bulunamadı." });
          }
          if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;

          const store = await getOrCreateStoreMessagingSettings(tenant.id);
          const started = await sendVerificationSms(store, e164.e164);
          if (!started.ok) {
            if (started.code === "invalid_phone") {
              return reply.code(400).send({
                error: "invalid_phone",
                message: "Telefon numarası doğrulanamadı.",
              });
            }
            return reply.code(503).send({
              error: "provider_failed",
              message: "Doğrulama servisi şu an kullanılamıyor.",
            });
          }
          return { ok: true, status: started.status };
        },
      );
    },
    { prefix: "" },
  );

  await app.register(
    async function verifyCheckScope(f) {
      await f.register(rateLimit, {
        max: Number(process.env.PUBLIC_VERIFY_CHECK_RATE_MAX ?? 30),
        timeWindow: "15 minutes",
        errorResponseBuilder: () => ({
          error: "verify_rate_limited",
          message: "Çok sık kod denediniz; kısa süre sonra tekrar deneyin.",
        }),
      });

      f.post<{
        Params: { tenantSlug: string };
        Body: { phone?: string; code?: string };
      }>("/public/tenants/:tenantSlug/verify/check", async (req, reply) => {
        const slug = req.params.tenantSlug.trim();
        const raw = String(req.body?.phone ?? "");
        const code = String(req.body?.code ?? "").trim();
        const e164 = normalizeToE164(raw);
        if (!e164.ok || !code) {
          return reply.code(400).send({
            error: "validation_error",
            message: "Telefon ve kod gerekli.",
          });
        }
        const tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenant) {
          return reply.code(404).send({ error: "not_found", message: "İşletme bulunamadı." });
        }
        if (!(await ensureCustomerPwaEnabled(tenant.id, reply))) return;

        const store = await getOrCreateStoreMessagingSettings(tenant.id);
        const checked = await checkVerificationCode(store, e164.e164, code);
        if (!checked.ok) {
          if (checked.code === "verify_code_expired") {
            return reply.code(400).send({
              error: "verify_code_expired",
              message: "Kodun süresi doldu; yeni kod isteyin.",
            });
          }
          if (checked.code === "verify_code_invalid") {
            return reply.code(400).send({
              error: "verify_code_invalid",
              message: "Kod geçersiz.",
            });
          }
          return reply.code(503).send({
            error: "provider_failed",
            message: "Doğrulama servisi şu an kullanılamıyor.",
          });
        }

        const loose = normalizeCustomerPhone(raw);
        const customer = await prisma.customer.findFirst({
          where: {
            tenantId: tenant.id,
            OR: [{ phone: loose }, { phone: e164.e164 }],
          },
        });
        if (!customer) {
          return reply.code(404).send({
            error: "customer_not_found",
            message: "Bu numara için kayıt bulunamadı.",
          });
        }

        await prisma.customerContactPreference.upsert({
          where: { customerId: customer.id },
          create: {
            tenantId: tenant.id,
            customerId: customer.id,
            phone: customer.phone,
            smsOptIn: true,
            whatsappOptIn: false,
            preferredChannel: "sms",
            verifiedAt: new Date(),
          },
          update: {
            phone: customer.phone,
            verifiedAt: new Date(),
            smsOptIn: true,
            preferredChannel: "sms",
          },
        });

        const token = signCustomerAccessToken(customer.id, tenant.id);
        const dashboard = await getCustomerPortalData(tenant.id, customer.id);
        const meta = await loadTenantPublicMeta(tenant);
        const campaigns = await getPublicCampaignsCatalog(tenant.id);
        return {
          token,
          ...dashboard,
          rewards: dashboard.rewards.map(toPublicRewardDto),
          campaigns: campaigns.map(toPublicCampaignDto),
          tenant: meta.tenant,
          storeSettings: meta.storeSettings,
        };
      });
    },
    { prefix: "" },
  );
}
