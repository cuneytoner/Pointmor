import "./load-env.js";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAuthLogin } from "./routes/auth-login.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerPlanRoutes } from "./routes/plans.js";
import { registerSessionRoutes } from "./routes/session.js";
import { registerTenantOnboardingRoutes } from "./routes/tenant-onboarding.js";
import { registerSubscriptionRoutes } from "./routes/subscriptions.js";
import { registerTenantRoutes } from "./routes/tenants.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { registerLoyaltyRoutes } from "./routes/loyalty.js";
import { registerCashierRoutes } from "./routes/cashier.js";
import { registerManagerRoutes } from "./routes/manager.js";
import { registerEntitlementsRoutes } from "./routes/entitlements.js";
import { registerProductAnalyticsRoutes } from "./routes/product-analytics.js";
import { registerPublicLoyaltyRoutes } from "./routes/public-loyalty.js";
import { registerPublicTenantRoutes } from "./routes/public-tenants.js";
import { registerStoreSettingsRoutes } from "./routes/store-settings.js";
import { registerTenantMenuRoutes } from "./routes/tenant-menu.js";
import { registerPublicVerifyRoutes } from "./routes/public-verify.js";
import { registerTenantMessagingRoutes } from "./routes/tenant-messaging.js";
import { registerComplianceExportRoutes } from "./routes/compliance-exports.js";

export type BuildAppOptions = {
  /** Testlerde konsol gürültüsünü kapatmak için (`false`). */
  logger?: boolean;
};

/**
 * HTTP dinlemeyen Fastify örneği — `app.inject()` ile test veya alt süreçler için.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const corsOriginsRaw = process.env.CORS_ORIGINS ?? "";
  const originList = corsOriginsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const app = Fastify({
    logger: options.logger ?? true,
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? "dev-cookie-secret-not-for-production",
  });

  await app.register(cors, {
    origin: originList.length > 0 ? originList : false,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: Number(process.env.API_RATE_LIMIT_MAX ?? 400),
    timeWindow: "1 minute",
    allowList: (req) => (req.url.split("?")[0] ?? "") === "/health",
  });

  app.get("/health", async () => ({ ok: true }));

  await registerAuthLogin(app);
  await registerSessionRoutes(app);
  await registerTenantOnboardingRoutes(app);
  await registerTenantRoutes(app);
  await registerPlanRoutes(app);
  await registerSubscriptionRoutes(app);
  await registerUserRoutes(app);
  await registerAuditRoutes(app);
  await registerWebhookRoutes(app);
  await registerPublicLoyaltyRoutes(app);
  await registerPublicTenantRoutes(app);
  await registerPublicVerifyRoutes(app);
  await registerLoyaltyRoutes(app);
  await registerCashierRoutes(app);
  await registerManagerRoutes(app);
  await registerEntitlementsRoutes(app);
  await registerProductAnalyticsRoutes(app);
  await registerStoreSettingsRoutes(app);
  await registerTenantMenuRoutes(app);
  await registerTenantMessagingRoutes(app);
  await registerComplianceExportRoutes(app);

  const isProd = process.env.NODE_ENV === "production";
  app.setErrorHandler((error: unknown, request, reply) => {
    const errObj = error as Error & { statusCode?: number; code?: string };
    const prismaCode =
      typeof errObj.code === "string" && errObj.code.startsWith("P")
        ? errObj.code
        : undefined;
    request.log.error(
      { err: error, prismaCode },
      `${request.method} ${request.url}`,
    );
    if (reply.sent) return;
    const sc =
      typeof errObj.statusCode === "number" ? errObj.statusCode : 500;
    const label =
      sc === 404 ? "not_found" : sc < 500 ? "client_error" : "internal_error";
    void reply.code(sc).send({
      error: label,
      message: isProd ? undefined : errObj.message,
      prismaCode: isProd ? undefined : prismaCode,
    });
  });

  return app;
}
