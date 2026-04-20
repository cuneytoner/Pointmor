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
import { registerPublicDiscoveryRoutes } from "./routes/public-discovery.js";
import { registerPublicLoyaltyRoutes } from "./routes/public-loyalty.js";
import { registerPublicTenantRoutes } from "./routes/public-tenants.js";
import { registerStoreSettingsRoutes } from "./routes/store-settings.js";
import { registerTenantMenuRoutes } from "./routes/tenant-menu.js";
import { registerPublicVerifyRoutes } from "./routes/public-verify.js";
import { registerTenantMessagingRoutes } from "./routes/tenant-messaging.js";
import { registerComplianceExportRoutes } from "./routes/compliance-exports.js";
import { registerTenantRetentionRoutes } from "./routes/retention.js";
import { registerInternalScheduledJobRoutes } from "./routes/internal-scheduled-jobs.js";
import { registerTenantBranchMetricsRoutes } from "./routes/tenant-branch-metrics.js";
import { registerHqDashboardRoutes } from "./routes/hq-dashboard.js";
import { registerHqInsightRoutes } from "./routes/hq-insights.js";
import { registerTenantAutomationRoutes } from "./routes/tenant-automation.js";
import { registerSecurityHeaders } from "./lib/security-headers.js";
import {
  getSecurityPreflightSnapshot,
  isStrictMemoryFallbackEmergencyWindowExpired,
  isStrictSecurityProfile,
  preflightAllowQuerySecret,
  validateStartupSecurityConfig,
} from "./lib/security-config.js";
import { timingSafeEqualString } from "./lib/internal-job-auth.js";
import {
  bumpRuntimeSecurityMetric,
  snapshotRuntimeSecurityMetrics,
} from "./lib/runtime-security-metrics.js";

export type BuildAppOptions = {
  /** Testlerde konsol gürültüsünü kapatmak için (`false`). */
  logger?: boolean;
};

/**
 * HTTP dinlemeyen Fastify örneği — `app.inject()` ile test veya alt süreçler için.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  validateStartupSecurityConfig();

  const corsOriginsRaw = process.env.CORS_ORIGINS ?? "";
  const originList = corsOriginsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.addHook("onRequest", async (_req, reply) => {
    if (!isStrictMemoryFallbackEmergencyWindowExpired()) return;
    return reply.code(503).send({
      ok: false,
      error: "security_state_memory_fallback_expired",
      message:
        "Strict profile in-process security state emergency window ended (SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT). Set REDIS_URL / adjust SECURITY_STATE_* and restart.",
    });
  });

  app.log.info(
    { securityPreflight: getSecurityPreflightSnapshot() },
    "security_preflight_at_boot",
  );

  registerSecurityHeaders(app);

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
    allowList: (req) => {
      const p = req.url.split("?")[0] ?? "";
      return (
        p === "/health" ||
        p === "/internal/jobs/retention" ||
        p === "/internal/jobs/hq-insights"
      );
    },
  });

  app.get("/health", async (req, reply) => {
    const body: Record<string, unknown> = { ok: true };
    const q = req.query as Record<string, string | undefined>;
    const wantSummary =
      process.env.ALLOW_HEALTH_SECURITY_SUMMARY === "true" &&
      (q.securitySummary === "1" || q.securitySummary === "true");
    if (!wantSummary) return body;

    body.metrics = snapshotRuntimeSecurityMetrics();

    const secret = process.env.POINTMOR_PREFLIGHT_SECRET?.trim();
    const headerRaw = req.headers["x-pointmor-preflight-secret"];
    const header = typeof headerRaw === "string" ? headerRaw.trim() : "";
    const querySecret = (q.preflightSecret ?? "").trim();

    if (secret) {
      const provided = header || (preflightAllowQuerySecret() ? querySecret : "");
      if (!provided || !timingSafeEqualString(secret, provided)) {
        return reply.code(403).send({
          ok: false,
          error: "preflight_secret_required",
          message: preflightAllowQuerySecret()
            ? "X-Pointmor-Preflight-Secret header (preferred) or preflightSecret query must match POINTMOR_PREFLIGHT_SECRET."
            : "X-Pointmor-Preflight-Secret header must match POINTMOR_PREFLIGHT_SECRET.",
        });
      }
      if (!header && querySecret) {
        bumpRuntimeSecurityMetric("preflight_query_secret_used");
        app.log.warn("preflight_query_secret_used");
      }
      body.security = getSecurityPreflightSnapshot();
      return body;
    }

    if (isStrictSecurityProfile()) {
      body.securityRedacted = true;
      body.opsHint =
        "strict_profile: set POINTMOR_PREFLIGHT_SECRET and send X-Pointmor-Preflight-Secret for full policy snapshot; counters still returned.";
      return body;
    }

    body.security = getSecurityPreflightSnapshot();
    return body;
  });

  await registerAuthLogin(app);
  await registerSessionRoutes(app);
  await registerTenantOnboardingRoutes(app);
  await registerTenantRoutes(app);
  await registerPlanRoutes(app);
  await registerSubscriptionRoutes(app);
  await registerUserRoutes(app);
  await registerAuditRoutes(app);
  await registerWebhookRoutes(app);
  await registerPublicDiscoveryRoutes(app);
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
  await registerTenantRetentionRoutes(app);
  await registerInternalScheduledJobRoutes(app);
  await registerTenantBranchMetricsRoutes(app);
  await registerHqDashboardRoutes(app);
  await registerHqInsightRoutes(app);
  await registerTenantAutomationRoutes(app);

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
