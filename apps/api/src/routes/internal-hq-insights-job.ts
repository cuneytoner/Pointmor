import type { FastifyInstance } from "fastify";
import { runHqInsightJob } from "../lib/hq-insight-generator.js";

/**
 * Zamanlayıcı (cron / K8s Job) — POST + gizli başlık.
 * `HQ_INSIGHT_JOB_SECRET` tanımlı değilse route kaydedilmez.
 */
export async function registerInternalHqInsightsJobRoutes(app: FastifyInstance): Promise<void> {
  const secret = process.env.HQ_INSIGHT_JOB_SECRET?.trim();
  if (!secret) return;

  app.post<{
    Querystring: { tenantId?: string };
  }>("/internal/jobs/hq-insights", async (req, reply) => {
    const auth = req.headers["x-hq-insight-job-secret"] ?? req.headers["authorization"];
    const token =
      typeof auth === "string" && auth.startsWith("Bearer ")
        ? auth.slice(7).trim()
        : typeof auth === "string"
          ? auth.trim()
          : "";
    if (token !== secret) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const tenantId =
      typeof req.query.tenantId === "string" && req.query.tenantId.trim()
        ? req.query.tenantId.trim()
        : undefined;

    const result = await runHqInsightJob({ tenantId });
    return reply.send(result);
  });
}
