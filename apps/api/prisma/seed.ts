import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashSync } from "bcryptjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: true,
});

const { prisma } = await import("../src/lib/prisma.js");
const { MESSAGE_TEMPLATE_SEED } = await import("./seed-message-templates.js");

/** Senaryo başına ayrı şifre — dokümantasyon: docs/41-ref-001-dev-seed-users.md */
const DEV_PASSWORDS = {
  admin: hashSync("PointmorDev!Admin", 10),
  operator: hashSync("PointmorDev!Demo", 10),
} as const;

const demoTenant = await prisma.tenant.upsert({
  where: { slug: "demo-cafe" },
  create: {
    slug: "demo-cafe",
    name: "Pointmor Demo Cafe",
    onboardingStep: 6,
    onboardingCompletedAt: new Date(),
  },
  update: {
    name: "Pointmor Demo Cafe",
    onboardingStep: 6,
    onboardingCompletedAt: new Date(),
  },
});

const starterLimits = {
  maxCustomers: 150,
  maxActiveRewards: 8,
  maxActiveCampaigns: 0,
  maxVisitsPerMonth: 1000,
  maxBranches: 1,
  maxStaffUsers: 2,
  softWarningPercent: 80,
};

const starter = await prisma.plan.upsert({
  where: { slug: "starter" },
  create: {
    slug: "starter",
    name: "Başlangıç",
    description: "Deneme ve küçük işletmeler",
    priceCents: 0,
    currency: "EUR",
    interval: "month",
    planType: "free",
    featureTags: ["loyalty_core"],
    limits: starterLimits,
  },
  update: {
    planType: "free",
    featureTags: ["loyalty_core"],
    limits: starterLimits,
  },
});

const proFeatures = [
  "loyalty_core",
  "customer_pwa",
  "campaigns",
  "manager_closing",
  "compliance_limited",
  "multi_branch",
  "hq_dashboard",
  "hq_ai_insights",
  "hq_automation",
];

await prisma.plan.upsert({
  where: { slug: "pro" },
  create: {
    slug: "pro",
    name: "Pro",
    description: "Orta seviye — uyumluluk özeti ve kısa saklama",
    priceCents: 4900,
    currency: "EUR",
    interval: "month",
    planType: "pro",
    featureTags: proFeatures,
    limits: {},
  },
  update: {
    planType: "pro",
    featureTags: proFeatures,
    limits: {},
  },
});

const growthFeatures = [
  "loyalty_core",
  "customer_pwa",
  "campaigns",
  "growth_automation",
  "manager_closing",
  "multi_branch",
  "webhooks",
  "product_analytics",
  "hq_dashboard",
  "hq_ai_insights",
  "hq_automation",
  "compliance_full",
];

const growth = await prisma.plan.upsert({
  where: { slug: "growth" },
  create: {
    slug: "growth",
    name: "Büyüme",
    description: "Aylık faturalama",
    priceCents: 8900,
    currency: "EUR",
    interval: "month",
    planType: "pro",
    featureTags: growthFeatures,
    limits: {},
  },
  update: {
    planType: "pro",
    featureTags: growthFeatures,
    limits: {},
  },
});

await prisma.user.upsert({
  where: { email: "admin@pointmor.local" },
  create: {
    email: "admin@pointmor.local",
    name: "Platform Yöneticisi",
    passwordHash: DEV_PASSWORDS.admin,
    platformAdmin: true,
    role: "platform_admin",
  },
  update: {
    passwordHash: DEV_PASSWORDS.admin,
    name: "Platform Yöneticisi",
    platformAdmin: true,
    role: "platform_admin",
    tenantId: null,
  },
});

await prisma.user.upsert({
  where: { email: "owner@demo.pointmor.local" },
  create: {
    email: "owner@demo.pointmor.local",
    name: "Demo Cafe — owner",
    passwordHash: DEV_PASSWORDS.operator,
    platformAdmin: false,
    tenantId: demoTenant.id,
    role: "tenant_operator",
  },
  update: {
    passwordHash: DEV_PASSWORDS.operator,
    tenantId: demoTenant.id,
    role: "tenant_operator",
  },
});

await prisma.subscription.upsert({
  where: { id: "seed_sub_demo" },
  create: {
    id: "seed_sub_demo",
    tenantId: demoTenant.id,
    planId: growth.id,
    status: "active",
    renewsAt: new Date("2026-05-01T00:00:00.000Z"),
  },
  update: {},
});

const demoOwnerUser = await prisma.user.findFirst({
  where: { email: "owner@demo.pointmor.local" },
  select: { id: true },
});
if (demoOwnerUser && (await prisma.auditEvent.count({ where: { tenantId: demoTenant.id } })) === 0) {
  await prisma.auditEvent.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        actorUserId: demoOwnerUser.id,
        actorType: "manager",
        eventType: "seed_audit_sample",
        entityType: "other",
        entityId: demoTenant.id,
        payload: { message: "Demo denetim kaydı (seed)" },
      },
      {
        tenantId: demoTenant.id,
        actorUserId: demoOwnerUser.id,
        actorType: "manager",
        eventType: "RETENTION_UPDATED",
        entityType: "other",
        entityId: demoTenant.id,
        payload: { note: "örnek uyumluluk olayı" },
      },
    ],
  });
}

await prisma.auditLog.deleteMany({ where: { action: "seed" } });
await prisma.auditLog.create({
  data: {
    actorEmail: "admin@pointmor.local",
    action: "seed",
    detail: "pointmor_baseline",
  },
});

await prisma.messageTemplate.createMany({
  data: MESSAGE_TEMPLATE_SEED,
  skipDuplicates: true,
});

console.info("Seed OK: Pointmor demo tenant, plans, users, subscription.");
console.info("  Dev kullanıcılar: docs/41-ref-001-dev-seed-users.md");

const { seedDemoScenarios } = await import("./seed-demo-scenarios.js");
await seedDemoScenarios(prisma);

await prisma.$disconnect();
