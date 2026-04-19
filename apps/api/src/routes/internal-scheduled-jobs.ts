import type { FastifyInstance } from "fastify";
import { runRetentionCleanup } from "../lib/retention-cleanup-service.js";
import { runHqInsightJob } from "../lib/hq-insight-generator.js";
import {
  assertRecentTimestampHeader,
  timingSafeEqualString,
  verifyTimestampedHmacRequestAsync,
} from "../lib/internal-job-auth.js";

const JOB_TS_SKEW_SEC = 300;
const INTERNAL_JOB_TS_HEADER = "x-internal-job-timestamp";
const INTERNAL_JOB_SIG_HEADER = "x-internal-job-signature";
const INTERNAL_JOB_ID_HEADER = "x-internal-job-id";

function internalJobRequireHmac(): boolean {
  const v = process.env.INTERNAL_JOB_REQUIRE_HMAC?.trim().toLowerCase();
  return v === "true" || v === "1";
}

function jobTimestampSkewSec(): number {
  const n = Number.parseInt(process.env.INTERNAL_JOB_TIMESTAMP_SKEW_SEC ?? "", 10);
  if (Number.isFinite(n) && n > 0) return n;
  return JOB_TS_SKEW_SEC;
}

/**
 * Zamanlayıcı uçları: retention + HQ insights. JSON gövde string olarak okunur (HMAC ile uyum).
 * `INTERNAL_JOB_REQUIRE_HMAC=true` iken webhook ile aynı imza modeli: `HMAC(secret, "<ts>.<rawBody>")`.
 */
export async function registerInternalScheduledJobRoutes(app: FastifyInstance): Promise<void> {
  const retentionSecret = process.env.RETENTION_JOB_SECRET?.trim();
  const hqSecret = process.env.HQ_INSIGHT_JOB_SECRET?.trim();
  if (!retentionSecret && !hqSecret) return;

  await app.register(async function internalJobsScope(f) {
    f.removeContentTypeParser("application/json");
    f.addContentTypeParser(
      ["application/json", "application/*+json"],
      { parseAs: "string" },
      (_req, body, done) => done(null, body),
    );

    if (retentionSecret) {
      f.post<{ Body: string; Querystring: { dryRun?: string; tenantId?: string } }>(
        "/internal/jobs/retention",
        async (req, reply) => {
          const rawBody = typeof req.body === "string" ? req.body : "";
          const hmacMode = internalJobRequireHmac();

          if (hmacMode) {
            const verification = await verifyTimestampedHmacRequestAsync({
              secret: retentionSecret,
              timestampHeader: req.headers[INTERNAL_JOB_TS_HEADER],
              signatureHeader:
                typeof req.headers[INTERNAL_JOB_SIG_HEADER] === "string"
                  ? req.headers[INTERNAL_JOB_SIG_HEADER]
                  : undefined,
              rawBody,
              skewSec: jobTimestampSkewSec(),
              replayKey:
                typeof req.headers[INTERNAL_JOB_ID_HEADER] === "string"
                  ? req.headers[INTERNAL_JOB_ID_HEADER]
                  : undefined,
              replayScope: "internal-retention",
            });
            if (!verification.ok) {
              const err =
                verification.error === "timestamp_invalid"
                  ? "job_timestamp_invalid"
                  : verification.error === "replay_detected"
                    ? "job_replay_detected"
                    : verification.error === "replay_store_unavailable"
                      ? "job_replay_store_unavailable"
                      : "job_signature_invalid";
              const sc = verification.error === "replay_store_unavailable" ? 503 : 401;
              return reply.code(sc).send({ error: err });
            }
            let dryRun = false;
            let tenantId: string | undefined;
            try {
              const o = rawBody.trim() ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
              dryRun = o.dryRun === true || o.dryRun === "true" || o.dryRun === 1;
              tenantId =
                typeof o.tenantId === "string" && o.tenantId.trim() ? o.tenantId.trim() : undefined;
            } catch {
              return reply.code(400).send({ error: "invalid_json" });
            }
            const result = await runRetentionCleanup({ dryRun, tenantId });
            return reply.send(result);
          }

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
          if (!token || !timingSafeEqualString(token, retentionSecret)) {
            return reply.code(401).send({ error: "unauthorized" });
          }

          const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
          const tenantId =
            typeof req.query.tenantId === "string" && req.query.tenantId.trim()
              ? req.query.tenantId.trim()
              : undefined;

          const result = await runRetentionCleanup({ dryRun, tenantId });
          return reply.send(result);
        },
      );
    }

    if (hqSecret) {
      f.post<{ Body: string; Querystring: { tenantId?: string } }>(
        "/internal/jobs/hq-insights",
        async (req, reply) => {
          const rawBody = typeof req.body === "string" ? req.body : "";
          const hmacMode = internalJobRequireHmac();

          if (hmacMode) {
            const verification = await verifyTimestampedHmacRequestAsync({
              secret: hqSecret,
              timestampHeader: req.headers[INTERNAL_JOB_TS_HEADER],
              signatureHeader:
                typeof req.headers[INTERNAL_JOB_SIG_HEADER] === "string"
                  ? req.headers[INTERNAL_JOB_SIG_HEADER]
                  : undefined,
              rawBody,
              skewSec: jobTimestampSkewSec(),
              replayKey:
                typeof req.headers[INTERNAL_JOB_ID_HEADER] === "string"
                  ? req.headers[INTERNAL_JOB_ID_HEADER]
                  : undefined,
              replayScope: "internal-hq-insights",
            });
            if (!verification.ok) {
              const err =
                verification.error === "timestamp_invalid"
                  ? "job_timestamp_invalid"
                  : verification.error === "replay_detected"
                    ? "job_replay_detected"
                    : verification.error === "replay_store_unavailable"
                      ? "job_replay_store_unavailable"
                      : "job_signature_invalid";
              const sc = verification.error === "replay_store_unavailable" ? 503 : 401;
              return reply.code(sc).send({ error: err });
            }
            let tenantId: string | undefined;
            try {
              const o = rawBody.trim() ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
              tenantId =
                typeof o.tenantId === "string" && o.tenantId.trim() ? o.tenantId.trim() : undefined;
            } catch {
              return reply.code(400).send({ error: "invalid_json" });
            }
            const result = await runHqInsightJob({ tenantId });
            return reply.send(result);
          }

          if (process.env.INTERNAL_JOB_REQUIRE_TIMESTAMP === "true") {
            const ok = assertRecentTimestampHeader(
              req.headers["x-hq-insight-job-timestamp"],
              JOB_TS_SKEW_SEC,
            );
            if (!ok) {
              return reply.code(401).send({ error: "job_timestamp_invalid" });
            }
          }

          const auth = req.headers["x-hq-insight-job-secret"] ?? req.headers["authorization"];
          const token =
            typeof auth === "string" && auth.startsWith("Bearer ")
              ? auth.slice(7).trim()
              : typeof auth === "string"
                ? auth.trim()
                : "";
          if (!token || !timingSafeEqualString(token, hqSecret)) {
            return reply.code(401).send({ error: "unauthorized" });
          }

          const tenantId =
            typeof req.query.tenantId === "string" && req.query.tenantId.trim()
              ? req.query.tenantId.trim()
              : undefined;

          const result = await runHqInsightJob({ tenantId });
          return reply.send(result);
        },
      );
    }
  });
}
