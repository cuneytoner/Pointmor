import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashSync } from "bcryptjs";
import {
  coreSeed,
  type CoreSeedContext,
  moduleSeed,
  seedAiActMvpScenarios,
  scenarioSeed,
} from "./seed-layers.js";
import { validateSeedConsistency } from "./seed-membership-helper.js";
import { createMembership } from "./seed-membership-helper.js";

const LEGACY_TENANT_SLUGS = [
  "demo-small-cafe",
  "demo-busy-cafe",
  "demo-coffee-chain",
  "pointmor-demo-cafe",
  "demo-cafe",
  "acme",
  "starterco",
  "starter-co",
] as const;

const LEGACY_SUBSCRIPTION_IDS = [
  "seed_sub_demo_small",
  "seed_sub_demo_busy",
  "seed_sub_demo_chain",
] as const;

const LEGACY_IDENTITY_MIGRATIONS = [
  { from: "owner@acme.pointmor.local", to: "david@acme-ai.eu" },
  { from: "owner@urban.pointmor.local", to: "sofia@urbancoffee.eu" },
  { from: "owner@retailcorp.pointmor.local", to: "michael@retailcorp.eu" },
  { from: "advisor@pointmor.local", to: "anna@kanzlei-mueller.eu" },
  { from: "member@pointmor.local", to: "emma@pointmor.io" },
  { from: "admin@pointmor.local", to: "admin@pointmor.io" },
] as const;
const LEGACY_DEMO_ONLY_EMAILS = [
  "admin-demo@pointmor.demo",
  "owner-demo@pointmor.demo",
  "advisor-admin@pointmor.demo",
  "advisor-staff@pointmor.demo",
  "client-owner@pointmor.demo",
] as const;

const PRIMARY_TENANT_SLUGS = [
  "acme-ai-solutions",
  "urban-coffee-group",
  "retailcorp-eu",
  "kanzlei-mueller-advisory",
] as const;

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: false,
});

// Docker runtime imajında src yerine dist bulunur; yerelde src üzerinden çalışır.
const apiRoot = path.join(dir, "..");
const distPrisma = path.join(apiRoot, "dist/lib/prisma.js");
const prismaEntry = existsSync(distPrisma)
  ? pathToFileURL(distPrisma).href
  : pathToFileURL(path.join(apiRoot, "src/lib/prisma.ts")).href;
const { prisma } = await import(prismaEntry);

export type SeedMode = "dev" | "demo" | "prod";

function resolveSeedMode(raw: string | undefined): SeedMode {
  if (raw === "demo" || raw === "prod") return raw;
  return "dev";
}

function resolvePassword(key: string, fallback: string, opts: { mode: SeedMode; required: boolean }): string {
  const value = process.env[key]?.trim();
  if (value) return value;
  if (opts.required) {
    throw new Error(`missing_required_password:${key}`);
  }
  if (opts.mode === "dev") return fallback;
  throw new Error(`missing_required_password:${key}`);
}

function resolvePasswordWithAliases(
  keys: string[],
  fallback: string,
  opts: { mode: SeedMode; required: boolean },
): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  if (opts.required) {
    throw new Error(`missing_required_password:${keys.join("|")}`);
  }
  if (opts.mode === "dev") return fallback;
  throw new Error(`missing_required_password:${keys.join("|")}`);
}

async function ensureAiActActiveForTenant(tenantId: string) {
  const aiActModule = await prisma.module.upsert({
    where: { name: "ai_act" },
    create: { name: "ai_act", description: "AI Act compliance module" },
    update: {},
  });
  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId, moduleId: aiActModule.id } },
    create: { tenantId, moduleId: aiActModule.id, isActive: true },
    update: { isActive: true },
  });
}

async function pruneLegacyDemoData(options: { keepLegacyScenarios: boolean }) {
  if (options.keepLegacyScenarios) return;

  await prisma.subscription.deleteMany({
    where: { id: { in: [...LEGACY_SUBSCRIPTION_IDS] } },
  });

  const legacyTenants = await prisma.tenant.findMany({
    where: { slug: { in: [...LEGACY_TENANT_SLUGS] } },
    select: { id: true },
  });
  const legacyTenantIds = legacyTenants.map((t) => t.id);

  if (legacyTenantIds.length > 0) {
    await prisma.tenantMembership.deleteMany({
      where: { tenantId: { in: legacyTenantIds } },
    });
    await prisma.tenantModule.deleteMany({
      where: { tenantId: { in: legacyTenantIds } },
    });
    await prisma.storeSettings.deleteMany({
      where: { tenantId: { in: legacyTenantIds } },
    });
    await prisma.subscription.deleteMany({
      where: { tenantId: { in: legacyTenantIds } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: legacyTenantIds } },
    });
  }

  for (const migration of LEGACY_IDENTITY_MIGRATIONS) {
    const [legacyUser, canonicalUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: migration.from }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: migration.to }, select: { id: true } }),
    ]);
    if (!legacyUser || !canonicalUser) continue;
    await prisma.aiReview.updateMany({
      where: { reviewedByUserId: legacyUser.id },
      data: { reviewedByUserId: canonicalUser.id },
    });
    await prisma.aiTask.updateMany({
      where: { assignedToUserId: legacyUser.id },
      data: { assignedToUserId: canonicalUser.id },
    });
    await prisma.aiAssessment.updateMany({
      where: { createdByUserId: legacyUser.id },
      data: { createdByUserId: canonicalUser.id },
    });
    await prisma.aiSystem.updateMany({
      where: { createdByUserId: legacyUser.id },
      data: { createdByUserId: canonicalUser.id },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: { in: LEGACY_IDENTITY_MIGRATIONS.map((m) => m.from) },
      memberships: { none: {} },
    },
  });

  const legacyDemoUsers = await prisma.user.findMany({
    where: { email: { in: [...LEGACY_DEMO_ONLY_EMAILS] } },
    select: { id: true },
  });
  const legacyDemoUserIds = legacyDemoUsers.map((u) => u.id);
  if (legacyDemoUserIds.length > 0) {
    await prisma.tenantMembership.deleteMany({
      where: { userId: { in: legacyDemoUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: legacyDemoUserIds } },
    });
  }

  const nonPrimaryTenantsWithoutMembers = await prisma.tenant.findMany({
    where: {
      slug: { notIn: [...PRIMARY_TENANT_SLUGS] },
      memberships: { none: {} },
    },
    select: { id: true },
  });
  const danglingTenantIds = nonPrimaryTenantsWithoutMembers.map((t) => t.id);
  if (danglingTenantIds.length > 0) {
    await prisma.subscription.deleteMany({ where: { tenantId: { in: danglingTenantIds } } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: { in: danglingTenantIds } } });
    await prisma.storeSettings.deleteMany({ where: { tenantId: { in: danglingTenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: danglingTenantIds } } });
  }
}

async function seedCore(input: {
  adminPasswordHash: string;
  operatorPasswordHash: string;
  includeDemoScenarios: boolean;
  adminEmailForAudit: string;
}): Promise<CoreSeedContext> {
  const core = await coreSeed({
    prisma,
    adminPasswordHash: input.adminPasswordHash,
    operatorPasswordHash: input.operatorPasswordHash,
  });
  await moduleSeed({
    prisma,
    loyaltyTenantId: core.loyaltyTenantId,
    aiActTenantId: core.aiActTenantId,
    mixedTenantId: core.mixedTenantId,
    advisorTenantId: core.advisorTenantId,
  });
  await scenarioSeed({
    prisma,
    loyaltyTenantId: core.loyaltyTenantId,
    aiActTenantId: core.aiActTenantId,
    mixedTenantId: core.mixedTenantId,
    advisorTenantId: core.advisorTenantId,
    starterPlanId: core.starterPlanId,
    compliancePlanId: core.compliancePlanId,
    growthPlanId: core.growthPlanId,
    advisorPlanId: core.advisorPlanId,
    ownerUserId: core.ownerUserId,
    advisorUserId: core.advisorUserId,
    adminEmailForAudit: input.adminEmailForAudit,
    includeDemoScenarios: input.includeDemoScenarios,
  });
  return core;
}

async function seedDemoExtensions(input: {
  growthPlanId: string;
  operatorPasswordHash: string;
}) {
  const operatorEmail = process.env.DEMO_OPERATOR_EMAIL?.trim() || "owner-demo@pointmor.demo";
  const advisorAdminEmail =
    process.env.DEMO_ADVISOR_ADMIN_EMAIL?.trim() || "advisor-admin@pointmor.demo";
  const advisorStaffEmail =
    process.env.DEMO_ADVISOR_STAFF_EMAIL?.trim() || "advisor-staff@pointmor.demo";
  const clientOwnerEmail =
    process.env.DEMO_CLIENT_OWNER_EMAIL?.trim() || "client-owner@pointmor.demo";

  const demoTenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "urban-coffee-group" } });
  const demoBusinessUser = await prisma.user.upsert({
    where: { email: operatorEmail },
    create: {
      email: operatorEmail,
      name: "Demo isletme kullanicisi",
      passwordHash: input.operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: input.operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });
  await createMembership({
    prisma,
    userId: demoBusinessUser.id,
    tenantId: demoTenant.id,
    role: "ADMIN",
    isExternal: false,
  });

  const advisorTenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "kanzlei-mueller-advisory" },
  });
  const clientTenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "retailcorp-eu" },
  });
  await ensureAiActActiveForTenant(advisorTenant.id);
  await ensureAiActActiveForTenant(clientTenant.id);

  const advisorAdminUser = await prisma.user.upsert({
    where: { email: advisorAdminEmail },
    create: {
      email: advisorAdminEmail,
      name: "Demo advisor admin",
      passwordHash: input.operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "advisor_admin",
    },
    update: {
      passwordHash: input.operatorPasswordHash,
      tenantId: null,
      role: "advisor_admin",
    },
  });
  const advisorStaffUser = await prisma.user.upsert({
    where: { email: advisorStaffEmail },
    create: {
      email: advisorStaffEmail,
      name: "Demo advisor staff",
      passwordHash: input.operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "advisor_staff",
    },
    update: {
      passwordHash: input.operatorPasswordHash,
      tenantId: null,
      role: "advisor_staff",
    },
  });
  const clientOwnerUser = await prisma.user.upsert({
    where: { email: clientOwnerEmail },
    create: {
      email: clientOwnerEmail,
      name: "Demo client owner",
      passwordHash: input.operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "client_owner",
    },
    update: {
      passwordHash: input.operatorPasswordHash,
      tenantId: null,
      role: "client_owner",
    },
  });

  await createMembership({
    prisma,
    userId: advisorAdminUser.id,
    tenantId: advisorTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: advisorStaffUser.id,
    tenantId: advisorTenant.id,
    role: "MEMBER",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: advisorAdminUser.id,
    tenantId: clientTenant.id,
    role: "ADVISOR",
    isExternal: true,
  });
  await createMembership({
    prisma,
    userId: clientOwnerUser.id,
    tenantId: clientTenant.id,
    role: "ADMIN",
    isExternal: false,
  });

  await prisma.subscription.upsert({
    where: { id: "seed_sub_demo_client" },
    create: {
      id: "seed_sub_demo_client",
      tenantId: clientTenant.id,
      planId: input.growthPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {},
  });

  await seedAiActMvpScenarios(prisma, {
    tenantId: clientTenant.id,
    createdByUserId: clientOwnerUser.id,
    scopePrefix: "demo_client",
    profile: "minimal",
  });
}

export async function runSeed(input?: { mode?: SeedMode; includeFullDemoScenarios?: boolean }) {
  const mode = input?.mode ?? resolveSeedMode(process.env.SEED_MODE);
  const includeFullDemoScenarios = Boolean(input?.includeFullDemoScenarios);

  if (mode === "prod") {
    const bootstrapEmail = process.env.PROD_BOOTSTRAP_ADMIN_EMAIL?.trim() || "admin@pointmor.io";
    const bootstrapPassword = process.env.PROD_BOOTSTRAP_ADMIN_PASSWORD?.trim();
    if (!bootstrapPassword) {
      console.info("Seed(prod): skipped demo users. PROD_BOOTSTRAP_ADMIN_PASSWORD not provided.");
      await prisma.$disconnect();
      return;
    }
    await prisma.user.upsert({
      where: { email: bootstrapEmail },
      create: {
        email: bootstrapEmail,
        name: "Platform Bootstrap Admin",
        passwordHash: hashSync(bootstrapPassword, 12),
        platformAdmin: true,
        role: "platform_admin",
      },
      update: {
        passwordHash: hashSync(bootstrapPassword, 12),
        platformAdmin: true,
        role: "platform_admin",
        tenantId: null,
      },
    });
    await prisma.$disconnect();
    console.info("Seed(prod) OK: bootstrap admin only.");
    return;
  }

  const adminPassword = resolvePassword("SEED_DEV_ADMIN_PASSWORD", "PointmorDev!Admin", {
    mode,
    required: false,
  });
  const operatorPassword = resolvePassword("SEED_DEV_OPERATOR_PASSWORD", "PointmorDev!Demo", {
    mode,
    required: false,
  });
  const demoAdminPassword = resolvePasswordWithAliases(
    ["SEED_DEMO_ADMIN_PASSWORD", "DEMO_ADMIN_PASSWORD"],
    adminPassword,
    {
      mode,
      required: mode === "demo",
    },
  );
  const demoOperatorPassword = resolvePasswordWithAliases(
    ["SEED_DEMO_OPERATOR_PASSWORD", "DEMO_OPERATOR_PASSWORD"],
    operatorPassword,
    {
      mode,
      required: mode === "demo",
    },
  );

  if (mode === "demo" && (demoAdminPassword.length < 12 || demoOperatorPassword.length < 12)) {
    throw new Error("seed_demo_password_too_short");
  }

  await pruneLegacyDemoData({ keepLegacyScenarios: includeFullDemoScenarios });

  const hashRounds = mode === "demo" ? 12 : 10;
  const core = await seedCore({
    adminPasswordHash: hashSync(mode === "demo" ? demoAdminPassword : adminPassword, hashRounds),
    operatorPasswordHash: hashSync(mode === "demo" ? demoOperatorPassword : operatorPassword, hashRounds),
    includeDemoScenarios: includeFullDemoScenarios,
    adminEmailForAudit: "admin@pointmor.io",
  });
  if (mode === "demo" && includeFullDemoScenarios) {
    await seedDemoExtensions({
      growthPlanId: core.growthPlanId,
      operatorPasswordHash: hashSync(demoOperatorPassword, hashRounds),
    });
  }
  await validateSeedConsistency(prisma);
  await prisma.$disconnect();

  console.info(`Seed(${mode}) OK: unified membership-first seed flow completed.`);
  console.info(
    "  Kullanicilar: admin@pointmor.io, david@acme-ai.eu, sofia@urbancoffee.eu, michael@retailcorp.eu, anna@kanzlei-mueller.eu, emma@pointmor.io",
  );
  console.info(
    "  Tenant tipleri: acme-ai-solutions (ai_act), urban-coffee-group (cafe), retailcorp-eu (ai_act+cafe), kanzlei-mueller-advisory (advisor)",
  );
}

await runSeed();
