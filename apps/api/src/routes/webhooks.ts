import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { parseBearerToken } from "../lib/http-auth.js";

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Faturalama / ödeme sağlayıcı webhook iskeleti.
 * Üretimde imza doğrulaması (HMAC ham gövde) tercih edilir; ortak sır ile ilk entegrasyon için yeterli.
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
    const headerSecret =
      typeof req.headers["x-webhook-secret"] === "string"
        ? req.headers["x-webhook-secret"].trim()
        : undefined;
    const bearer = parseBearerToken(req);
    const got = headerSecret ?? bearer;
    if (!got || !timingSafeEqualString(got, expected)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    app.log.info({ body: req.body }, "webhook.billing.received");
    return { ok: true, received: true };
  });
}
