import type { FastifyInstance } from "fastify";
import { parseBearerToken } from "../lib/http-auth.js";
import {
  timingSafeEqualString,
  verifyTimestampedHmacRequestAsync,
} from "../lib/internal-job-auth.js";

const WEBHOOK_TS_SKEW_SEC = 300;
const WEBHOOK_SIG_HEADER = "x-webhook-signature";
const WEBHOOK_TS_HEADER = "x-webhook-timestamp";
const WEBHOOK_EVENT_ID_HEADER = "x-webhook-event-id";

function requireSignedWebhookByDefault(): boolean {
  const mode = process.env.WEBHOOK_AUTH_MODE?.trim().toLowerCase();
  if (mode === "legacy-secret") return false;
  if (mode === "hmac") return true;
  if (process.env.APP_ENV === "demo") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * Faturalama / ödeme sağlayıcı webhook iskeleti.
 * Kimlik doğrulama:
 * - Varsayılan: timestamp + raw-body HMAC (`x-webhook-signature`).
 * - Geçiş modu: `WEBHOOK_ALLOW_LEGACY_SECRET=true` ile eski paylaşılan sır kabulü.
 */
export async function registerWebhookRoutes(app: FastifyInstance): Promise<void> {
  await app.register(async function billingWebhookScope(f) {
    // Bu scope'ta raw JSON body yakalayıp HMAC doğrulaması yapıyoruz.
    f.removeContentTypeParser("application/json");
    f.addContentTypeParser(
      ["application/json", "application/*+json"],
      { parseAs: "string" },
      (_req, body, done) => done(null, body),
    );

    f.post<{ Body: string }>("/webhooks/billing", async (req, reply) => {
      const expected = process.env.WEBHOOK_SIGNING_SECRET?.trim();
      if (!expected) {
        return reply.code(501).send({
          error: "webhook_not_configured",
          message: "WEBHOOK_SIGNING_SECRET tanımlı değil.",
        });
      }

      const rawBody = typeof req.body === "string" ? req.body : "";
      let parsedBody: unknown = {};
      if (rawBody.trim()) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          return reply.code(400).send({ error: "invalid_json" });
        }
      }

      const strictSigned = requireSignedWebhookByDefault();
      const verification = await verifyTimestampedHmacRequestAsync({
        secret: expected,
        timestampHeader: req.headers[WEBHOOK_TS_HEADER],
        signatureHeader:
          typeof req.headers[WEBHOOK_SIG_HEADER] === "string"
            ? req.headers[WEBHOOK_SIG_HEADER]
            : undefined,
        rawBody,
        skewSec: Number(process.env.WEBHOOK_TIMESTAMP_SKEW_SEC ?? WEBHOOK_TS_SKEW_SEC),
        replayKey:
          typeof req.headers[WEBHOOK_EVENT_ID_HEADER] === "string"
            ? req.headers[WEBHOOK_EVENT_ID_HEADER]
            : undefined,
        replayScope: "webhook-billing",
      });
      const allowLegacy = process.env.WEBHOOK_ALLOW_LEGACY_SECRET === "true";
      if (!verification.ok) {
        if (!strictSigned && allowLegacy) {
          const headerSecret =
            typeof req.headers["x-webhook-secret"] === "string"
              ? req.headers["x-webhook-secret"].trim()
              : undefined;
          const bearer = parseBearerToken(req);
          const got = headerSecret ?? bearer;
          if (!got || !timingSafeEqualString(got, expected)) {
            return reply.code(401).send({ error: "unauthorized" });
          }
        } else {
          const errorCode =
            verification.error === "timestamp_invalid"
              ? "webhook_timestamp_invalid"
              : verification.error === "replay_detected"
                ? "webhook_replay_detected"
                : verification.error === "replay_store_unavailable"
                  ? "webhook_replay_store_unavailable"
                  : "webhook_signature_invalid";
          const status = verification.error === "replay_store_unavailable" ? 503 : 401;
          return reply.code(status).send({ error: errorCode });
        }
      }

      app.log.info(
        {
          eventId:
            typeof req.headers[WEBHOOK_EVENT_ID_HEADER] === "string"
              ? req.headers[WEBHOOK_EVENT_ID_HEADER]
              : undefined,
        },
        "webhook.billing.received",
      );
      void parsedBody;
      return { ok: true, received: true };
    });
  });
}
