import type { FastifyInstance } from "fastify";
import { parseBearerToken } from "../lib/http-auth.js";
import {
  assertRecentTimestampHeader,
  timingSafeEqualString,
} from "../lib/internal-job-auth.js";

const WEBHOOK_TS_SKEW_SEC = 300;

/**
 * Faturalama / ödeme sağlayıcı webhook iskeleti.
 * Kimlik doğrulama: paylaşılan sır (header veya Bearer) + isteğe bağlı zaman damgası (replay azaltma).
 * Ham gövde HMAC: ham body için Fastify raw parser gerekir; follow-up olarak eklenebilir.
 */
export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: unknown }>("/webhooks/billing", async (req, reply) => {
    const expected = process.env.WEBHOOK_SIGNING_SECRET?.trim();
    if (!expected) {
      return reply.code(501).send({
        error: "webhook_not_configured",
        message: "WEBHOOK_SIGNING_SECRET tanımlı değil.",
      });
    }

    if (process.env.WEBHOOK_REQUIRE_TIMESTAMP === "true") {
      const ok = assertRecentTimestampHeader(
        req.headers["x-webhook-timestamp"],
        WEBHOOK_TS_SKEW_SEC,
      );
      if (!ok) {
        return reply.code(401).send({ error: "webhook_timestamp_invalid" });
      }
    }

    const headerSecret =
      typeof req.headers["x-webhook-secret"] === "string"
        ? req.headers["x-webhook-secret"].trim()
        : undefined;
    const bearer = parseBearerToken(req);
    const got = headerSecret ?? bearer;
    if (!got || !timingSafeEqualString(got, expected)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    app.log.info("webhook.billing.received");
    return { ok: true, received: true };
  });
}
