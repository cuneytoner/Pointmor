/**
 * Full demo seed guard.
 * Heavy demo seed must run only in explicit demo environment.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashSync } from "bcryptjs";
import { coreSeed, moduleSeed, scenarioSeed } from "./seed-layers.js";
import { validateSeedConsistency } from "./seed-membership-helper.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: false,
});

if (process.env.APP_ENV !== "demo") {
  console.error("db:seed:full:demo engellendi: APP_ENV=demo zorunlu.");
  process.exit(1);
}

if (process.env.ALLOW_FULL_DEMO_SEED !== "true") {
  console.error(
    "db:seed:full:demo engellendi: ALLOW_FULL_DEMO_SEED=true zorunlu.",
  );
  process.exit(1);
}

if (process.env.CONFIRM_FULL_DEMO_SEED !== "I_UNDERSTAND_FULL_DEMO_SEED") {
  console.error(
    "db:seed:full:demo engellendi: CONFIRM_FULL_DEMO_SEED=I_UNDERSTAND_FULL_DEMO_SEED zorunlu.",
  );
  process.exit(1);
}

if (process.env.SKIP_FULL_DEMO_DB_URL_CHECK !== "1") {
  const needle =
    process.env.FULL_DEMO_SEED_DB_URL_SUBSTR?.trim() || "pointmor_demo";
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes(needle)) {
    console.error(
      `db:seed:full:demo engellendi: DATABASE_URL içinde "${needle}" bekleniyor (yanlış DB koruması). Atlamak için SKIP_FULL_DEMO_DB_URL_CHECK=1.`,
    );
    process.exit(1);
  }
}

process.env.SEED_FULL_DEMO = "1";
process.env.FORCE_RESEED_DEMO = process.env.FORCE_RESEED_DEMO ?? "1";

const apiRoot = path.join(dir, "..");
const distPrisma = path.join(apiRoot, "dist/lib/prisma.js");
const prismaEntry = existsSync(distPrisma)
  ? pathToFileURL(distPrisma).href
  : pathToFileURL(path.join(apiRoot, "src/lib/prisma.ts")).href;
const { prisma } = await import(prismaEntry);

const adminPw = process.env.DEMO_ADMIN_PASSWORD?.trim();
const operatorPw = process.env.DEMO_OPERATOR_PASSWORD?.trim();
if (!adminPw || !operatorPw) {
  console.error(
    "db:seed:full:demo engellendi: DEMO_ADMIN_PASSWORD ve DEMO_OPERATOR_PASSWORD zorunlu.",
  );
  process.exit(1);
}

const core = await coreSeed({
  prisma,
  adminPasswordHash: hashSync(adminPw, 12),
  operatorPasswordHash: hashSync(operatorPw, 12),
});
await moduleSeed({ prisma, demoTenantId: core.demoTenantId });
await scenarioSeed({
  prisma,
  demoTenantId: core.demoTenantId,
  growthPlanId: core.growthPlanId,
  demoOwnerUserId: core.demoOwnerUserId,
  adminEmailForAudit: "admin-demo@pointmor.demo",
  includeDemoScenarios: true,
});
await validateSeedConsistency(prisma);
await prisma.$disconnect();
