/**
 * Günlük cron: `npm run job:retention` veya `npx tsx src/jobs/run-retention-cleanup.ts`
 * Ortam: `DATABASE_URL` ve apps/api `.env` (load-env kökten)
 */
import "../load-env.js";
import { runRetentionCleanup } from "../lib/retention-cleanup-service.js";

const dryRun = process.argv.includes("--dry-run");

runRetentionCleanup({ dryRun })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error("retention_job_failed", e);
    process.exit(1);
  });
