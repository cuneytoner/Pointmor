import type { FastifyInstance } from "fastify";

/**
 * API için başlangıç seviyesi güvenlik başlıkları. Admin SPA başlıkları nginx üzerinden.
 */
export function registerSecurityHeaders(app: FastifyInstance): void {
  const enableHsts = process.env.ENABLE_HSTS === "true";

  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("X-Frame-Options", "DENY");
    if (enableHsts) {
      reply.header(
        "Strict-Transport-Security",
        "max-age=15552000; includeSubDomains",
      );
    }
  });
}
