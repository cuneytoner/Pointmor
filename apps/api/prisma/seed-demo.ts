/**
 * Demo / pre-alpha ortamı için isteğe bağlı seed.
 * Şifreler ortam değişkeninden gelir; kod içinde sabit yok.
 * Üretim ortamında kullanmayın — yalnızca izole demo DB.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashSync } from "bcryptjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({
  path: path.join(dir, "../.env"),
  override: false,
});

const adminPw = process.env.DEMO_ADMIN_PASSWORD?.trim();
const operatorPw = process.env.DEMO_OPERATOR_PASSWORD?.trim();

if (!adminPw || !operatorPw) {
  console.error(
    "seed-demo: DEMO_ADMIN_PASSWORD ve DEMO_OPERATOR_PASSWORD ortam değişkenleri zorunludur.",
  );
  process.exit(1);
}

if (adminPw.length < 12 || operatorPw.length < 12) {
  console.error("seed-demo: Şifreler en az 12 karakter olmalı.");
  process.exit(1);
}

// Docker imajında yalnızca dist/ vardır; yerel geliştirmede dist yoksa src kullanılır.
const apiRoot = path.join(dir, "..");
const distPrisma = path.join(apiRoot, "dist/lib/prisma.js");
const prismaEntry = existsSync(distPrisma)
  ? pathToFileURL(distPrisma).href
  : pathToFileURL(path.join(apiRoot, "src/lib/prisma.ts")).href;
const { prisma } = await import(prismaEntry);

const rounds = 12;
const hashAdmin = hashSync(adminPw, rounds);
const hashOperator = hashSync(operatorPw, rounds);

const adminEmail =
  process.env.DEMO_ADMIN_EMAIL?.trim() || "admin-demo@pointmor.demo";
const operatorEmail =
  process.env.DEMO_OPERATOR_EMAIL?.trim() || "owner-demo@pointmor.demo";

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
  },
});

const starterLimitsDemo = {
  maxCustomers: 150,
  maxActiveRewards: 8,
  maxActiveCampaigns: 0,
  maxVisitsPerMonth: 1000,
  maxBranches: 1,
  maxStaffUsers: 2,
  softWarningPercent: 80,
};

const growthFeaturesDemo = [
  "loyalty_core",
  "customer_pwa",
  "campaigns",
  "growth_automation",
  "manager_closing",
  "multi_branch",
  "webhooks",
  "product_analytics",
];

await prisma.plan.upsert({
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
    limits: starterLimitsDemo,
  },
  update: {
    planType: "free",
    featureTags: ["loyalty_core"],
    limits: starterLimitsDemo,
  },
});

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
    featureTags: growthFeaturesDemo,
    limits: {},
  },
  update: { planType: "pro", featureTags: growthFeaturesDemo, limits: {} },
});

await prisma.user.upsert({
  where: { email: adminEmail },
  create: {
    email: adminEmail,
    name: "Demo platform yöneticisi",
    passwordHash: hashAdmin,
    platformAdmin: true,
    role: "platform_admin",
  },
  update: {
    passwordHash: hashAdmin,
    name: "Demo platform yöneticisi",
    platformAdmin: true,
    role: "platform_admin",
    tenantId: null,
  },
});

await prisma.user.upsert({
  where: { email: operatorEmail },
  create: {
    email: operatorEmail,
    name: "Demo işletme kullanıcısı",
    passwordHash: hashOperator,
    platformAdmin: false,
    tenantId: demoTenant.id,
    role: "tenant_operator",
  },
  update: {
    passwordHash: hashOperator,
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

console.info("seed-demo OK. Bu hesaplar yalnızca demo içindir; üretimde kullanmayın.");

await prisma.$disconnect();
