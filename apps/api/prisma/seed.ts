import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  coreSeed,
  defaultDevPasswordHashes,
  moduleSeed,
  scenarioSeed,
} from "./seed-layers.js";
import { validateSeedConsistency } from "./seed-membership-helper.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: true,
});

// Docker runtime imajında src yerine dist bulunur; yerelde src üzerinden çalışır.
const apiRoot = path.join(dir, "..");
const distPrisma = path.join(apiRoot, "dist/lib/prisma.js");
const prismaEntry = existsSync(distPrisma)
  ? pathToFileURL(distPrisma).href
  : pathToFileURL(path.join(apiRoot, "src/lib/prisma.ts")).href;
const { prisma } = await import(prismaEntry);
const hashes = defaultDevPasswordHashes();
const core = await coreSeed({
  prisma,
  adminPasswordHash: hashes.admin,
  operatorPasswordHash: hashes.operator,
});
await moduleSeed({
  prisma,
  demoTenantId: core.demoTenantId,
});
await scenarioSeed({
  prisma,
  demoTenantId: core.demoTenantId,
  growthPlanId: core.growthPlanId,
  demoOwnerUserId: core.demoOwnerUserId,
  adminEmailForAudit: "admin@pointmor.local",
  includeDemoScenarios: true,
});
await validateSeedConsistency(prisma);

console.info("Seed OK: membership-first seed flow completed.");
console.info("  Dev kullanicilar: docs/41-ref-001-dev-seed-users.md");

await prisma.$disconnect();
