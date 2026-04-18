import type { FastifyInstance } from "fastify";
import { runRetentionCleanup } from "../lib/retention-cleanup-service.js";
import {
  assertRecentTimestampHeader,
  timingSafeEqualString,
} from "../lib/internal-job-auth.js";

const JOB_TS_SKEW_SEC = 300;

/**
 * Harici scheduler (K8s CronJob / cron) için: POST + gizli başlık.
 * `RETENTION_JOB_SECRET` tanımlı değilse route kaydedilmez.
 */
export async function registerInternalRetentionJobRoutes(app: FastifyInstance): Promise<void> {
  const secret = process.env.RETENTION_JOB_SECRET?.trim();
  if (!secret) return;

  app.post<{
    Querystring: { dryRun?: string; tenantId?: string };
  }>("/internal/jobs/retention", async (req, reply) => {
    if (process.env.INTERNAL_JOB_REQUIRE_TIMESTAMP === "true") {
      const ok = assertRecentTimestampHeader(
        req.headers["x-retention-job-timestamp"],
        JOB_TS_SKEW_SEC,
      );
      if (!ok) {
        return reply.code(401).send({ error: "job_timestamp_invalid" });
      }
    }

    const auth = req.headers["x-retention-job-secret"] ?? req.headers["authorization"];
    const token =
      typeof auth === "string" && auth.startsWith("Bearer ")
        ? auth.slice(7).trim()
        : typeof auth === "string"
          ? auth.trim()
          : "";
    if (!token || !timingSafeEqualString(token, secret)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
    const tenantId =
      typeof req.query.tenantId === "string" && req.query.tenantId.trim()
        ? req.query.tenantId.trim()
        : undefined;

    const result = await runRetentionCleanup({ dryRun, tenantId });
    return reply.send(result);
  });
}
