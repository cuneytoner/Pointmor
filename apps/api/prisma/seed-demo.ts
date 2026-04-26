import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashSync } from "bcryptjs";
import { coreSeed, moduleSeed, scenarioSeed } from "./seed-layers.js";
import { createMembership, validateSeedConsistency } from "./seed-membership-helper.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: false,
});

const adminPw = process.env.DEMO_ADMIN_PASSWORD?.trim();
const operatorPw = process.env.DEMO_OPERATOR_PASSWORD?.trim();
if (!adminPw || !operatorPw) {
  console.error(
    "seed-demo: DEMO_ADMIN_PASSWORD ve DEMO_OPERATOR_PASSWORD ortam degiskenleri zorunludur.",
  );
  process.exit(1);
}
if (adminPw.length < 12 || operatorPw.length < 12) {
  console.error("seed-demo: Sifreler en az 12 karakter olmali.");
  process.exit(1);
}

const apiRoot = path.join(dir, "..");
const distPrisma = path.join(apiRoot, "dist/lib/prisma.js");
const prismaEntry = existsSync(distPrisma)
  ? pathToFileURL(distPrisma).href
  : pathToFileURL(path.join(apiRoot, "src/lib/prisma.ts")).href;
const { prisma } = await import(prismaEntry);

const adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim() || "admin-demo@pointmor.demo";
const operatorEmail = process.env.DEMO_OPERATOR_EMAIL?.trim() || "owner-demo@pointmor.demo";
const advisorAdminEmail =
  process.env.DEMO_ADVISOR_ADMIN_EMAIL?.trim() || "advisor-admin@pointmor.demo";
const advisorStaffEmail =
  process.env.DEMO_ADVISOR_STAFF_EMAIL?.trim() || "advisor-staff@pointmor.demo";
const clientOwnerEmail =
  process.env.DEMO_CLIENT_OWNER_EMAIL?.trim() || "client-owner@pointmor.demo";

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
  adminEmailForAudit: adminEmail,
  includeDemoScenarios: false,
});

// Demo-specific identities.
const demoBusinessUser = await prisma.user.upsert({
  where: { email: operatorEmail },
  create: {
    email: operatorEmail,
    name: "Demo isletme kullanicisi",
    passwordHash: hashSync(operatorPw, 12),
    platformAdmin: false,
    tenantId: core.demoTenantId,
    role: "tenant_operator",
  },
  update: {
    passwordHash: hashSync(operatorPw, 12),
    tenantId: core.demoTenantId,
    role: "tenant_operator",
  },
});
await createMembership({
  prisma,
  userId: demoBusinessUser.id,
  tenantId: core.demoTenantId,
  role: "ADMIN",
  isExternal: false,
});

const advisorTenant = await prisma.tenant.upsert({
  where: { slug: "demo-advisor" },
  create: {
    slug: "demo-advisor",
    name: "Pointmor Demo Advisor",
    type: "ADVISOR",
    onboardingStep: 6,
    onboardingCompletedAt: new Date(),
  },
  update: { name: "Pointmor Demo Advisor", type: "ADVISOR" },
});
const clientTenant = await prisma.tenant.upsert({
  where: { slug: "demo-client" },
  create: {
    slug: "demo-client",
    name: "Pointmor Demo Client",
    type: "BUSINESS",
    onboardingStep: 6,
    onboardingCompletedAt: new Date(),
  },
  update: { name: "Pointmor Demo Client", type: "BUSINESS" },
});

const advisorAdminUser = await prisma.user.upsert({
  where: { email: advisorAdminEmail },
  create: {
    email: advisorAdminEmail,
    name: "Demo advisor admin",
    passwordHash: hashSync(operatorPw, 12),
    platformAdmin: false,
    tenantId: null,
    role: "advisor_admin",
  },
  update: {
    passwordHash: hashSync(operatorPw, 12),
    tenantId: null,
    role: "advisor_admin",
  },
});
const advisorStaffUser = await prisma.user.upsert({
  where: { email: advisorStaffEmail },
  create: {
    email: advisorStaffEmail,
    name: "Demo advisor staff",
    passwordHash: hashSync(operatorPw, 12),
    platformAdmin: false,
    tenantId: null,
    role: "advisor_staff",
  },
  update: {
    passwordHash: hashSync(operatorPw, 12),
    tenantId: null,
    role: "advisor_staff",
  },
});
const clientOwnerUser = await prisma.user.upsert({
  where: { email: clientOwnerEmail },
  create: {
    email: clientOwnerEmail,
    name: "Demo client owner",
    passwordHash: hashSync(operatorPw, 12),
    platformAdmin: false,
    tenantId: clientTenant.id,
    role: "client_owner",
  },
  update: {
    passwordHash: hashSync(operatorPw, 12),
    tenantId: clientTenant.id,
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
    planId: core.growthPlanId,
    status: "active",
    renewsAt: new Date("2026-05-01T00:00:00.000Z"),
  },
  update: {},
});

await validateSeedConsistency(prisma);
console.info("seed-demo OK. Membership-first model uygulandi.");
await prisma.$disconnect();
