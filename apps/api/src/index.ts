import "./load-env.js";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
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
import { registerProductAnalyticsRoutes } from "./routes/product-analytics.js";
import { registerPublicLoyaltyRoutes } from "./routes/public-loyalty.js";
import { registerPublicTenantRoutes } from "./routes/public-tenants.js";

const port = Number(process.env.PORT) || 3000;
const corsOriginsRaw = process.env.CORS_ORIGINS ?? "";
const originList = corsOriginsRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = Fastify({ logger: true });

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
await registerLoyaltyRoutes(app);
await registerProductAnalyticsRoutes(app);

const address = await app.listen({ port, host: "0.0.0.0" });
app.log.info(`API listening at ${address}`);
