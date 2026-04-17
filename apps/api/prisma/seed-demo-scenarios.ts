/**
 * Demo senaryoları: 3 tenant (küçük / yoğun / zincir), menü, müşteri, ziyaret, ödül, kampanya.
 * İdempotent: aynı tenant’ta müşteri varsa atlanır (FORCE_RESEED_DEMO=1 ile sıfırlanır).
 */
import { hashSync } from "bcryptjs";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client.js";

const GROWTH_FEATURES = [
  "loyalty_core",
  "customer_pwa",
  "campaigns",
  "growth_automation",
  "manager_closing",
  "multi_branch",
  "webhooks",
  "product_analytics",
  "compliance_full",
] as const;

function pointsFromAmountMinor(amountMinor: number): number {
  if (amountMinor <= 0) return 0;
  return Math.floor(amountMinor / 100);
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MENU_TEMPLATE: {
  name: string;
  description: string;
  sortOrder: number;
  items: { name: string; description: string; price: number; sortOrder: number; imageUrl: string | null }[];
}[] = [
  {
    name: "Coffee",
    description: "Espresso bazlı içecekler",
    sortOrder: 0,
    items: [
      {
        name: "Espresso",
        description: "Tek shot klasik espresso",
        price: 280,
        sortOrder: 0,
        imageUrl: "https://picsum.photos/seed/pointmor-espresso/320/200",
      },
      {
        name: "Latte",
        description: "Espresso ve buharlanmış süt",
        price: 420,
        sortOrder: 1,
        imageUrl: "https://picsum.photos/seed/pointmor-latte/320/200",
      },
      {
        name: "Cappuccino",
        description: "Köpüklü süt ve espresso",
        price: 400,
        sortOrder: 2,
        imageUrl: "https://picsum.photos/seed/pointmor-cap/320/200",
      },
    ],
  },
  {
    name: "Drinks",
    description: "Soğuk içecekler",
    sortOrder: 1,
    items: [
      {
        name: "Iced Latte",
        description: "Buzlu latte",
        price: 450,
        sortOrder: 0,
        imageUrl: "https://picsum.photos/seed/pointmor-iced/320/200",
      },
      {
        name: "Lemonade",
        description: "Ev yapımı limonata",
        price: 320,
        sortOrder: 1,
        imageUrl: "https://picsum.photos/seed/pointmor-lem/320/200",
      },
    ],
  },
  {
    name: "Desserts",
    description: "Tatlılar",
    sortOrder: 2,
    items: [
      {
        name: "Cheesecake",
        description: "New York usulü",
        price: 520,
        sortOrder: 0,
        imageUrl: "https://picsum.photos/seed/pointmor-cake/320/200",
      },
      {
        name: "Brownie",
        description: "Çikolatalı brownie",
        price: 380,
        sortOrder: 1,
        imageUrl: "https://picsum.photos/seed/pointmor-brownie/320/200",
      },
    ],
  },
];

type ScenarioKey = "small" | "busy" | "chain";

type ScenarioSpec = {
  key: ScenarioKey;
  slug: string;
  name: string;
  storeName: string;
  planSlug: "starter" | "growth" | "scale";
  customerTarget: number;
  subscriptionId: string;
  ownerEmail: string;
};

const SCENARIOS: ScenarioSpec[] = [
  {
    key: "small",
    slug: "demo-small-cafe",
    name: "Artisan Small Cafe (FREE)",
    storeName: "Artisan Small Cafe",
    planSlug: "starter",
    customerTarget: 38,
    subscriptionId: "seed_sub_demo_small",
    ownerEmail: "owner@small.pointmor.local",
  },
  {
    key: "busy",
    slug: "demo-busy-cafe",
    name: "Busy Corner Cafe (PRO)",
    storeName: "Busy Corner Cafe",
    planSlug: "growth",
    customerTarget: 400,
    subscriptionId: "seed_sub_demo_busy",
    ownerEmail: "owner@busy.pointmor.local",
  },
  {
    key: "chain",
    slug: "demo-coffee-chain",
    name: "Metro Coffee Chain (TEAM)",
    storeName: "Metro Coffee Chain",
    planSlug: "scale",
    customerTarget: 1200,
    subscriptionId: "seed_sub_demo_chain",
    ownerEmail: "owner@chain.pointmor.local",
  },
];

async function ensureScalePlan(prisma: PrismaClient) {
  await prisma.plan.upsert({
    where: { slug: "scale" },
    create: {
      slug: "scale",
      name: "Chain / Scale",
      description: "Çok şube, yüksek hacim (demo TEAM)",
      priceCents: 19900,
      currency: "EUR",
      interval: "month",
      planType: "team",
      featureTags: [...GROWTH_FEATURES],
      limits: {},
    },
    update: {
      planType: "team",
      featureTags: [...GROWTH_FEATURES],
      limits: {},
    },
  });
}

async function wipeScenarioTenant(prisma: PrismaClient, tenantId: string) {
  await prisma.visitCampaignApplication.deleteMany({ where: { tenantId } });
  await prisma.pointsLedger.deleteMany({ where: { tenantId } });
  await prisma.visit.deleteMany({ where: { tenantId } });
  await prisma.redemption.deleteMany({ where: { tenantId } });
  await prisma.customerAction.deleteMany({ where: { tenantId } });
  await prisma.loyaltyDomainEvent.deleteMany({ where: { tenantId } });
  await prisma.customer.deleteMany({ where: { tenantId } });
  await prisma.menuItem.deleteMany({ where: { tenantId } });
  await prisma.menuCategory.deleteMany({ where: { tenantId } });
  await prisma.reward.deleteMany({ where: { tenantId } });
  await prisma.campaign.deleteMany({ where: { tenantId } });
}

function phoneFor(tenantSalt: number, index: number): string {
  const n = tenantSalt * 1_000_000 + index;
  return `+900${String(n).padStart(9, "0").slice(0, 11)}`;
}

export async function seedDemoScenarios(prisma: PrismaClient): Promise<void> {
  const force = process.env.FORCE_RESEED_DEMO === "1";
  const skipHeavy =
    process.env.NODE_ENV === "production" && process.env.SEED_FULL_DEMO !== "1";

  if (skipHeavy) {
    console.info("seedDemoScenarios: atlandı (production; SEED_FULL_DEMO=1 ile açılır).");
    return;
  }

  await ensureScalePlan(prisma);

  const starter = await prisma.plan.findUniqueOrThrow({ where: { slug: "starter" } });
  const growth = await prisma.plan.findUniqueOrThrow({ where: { slug: "growth" } });
  const scale = await prisma.plan.findUniqueOrThrow({ where: { slug: "scale" } });

  const planBySlug = {
    starter,
    growth,
    scale,
  } as const;

  const devPassword = hashSync(
    process.env.SEED_DEV_OPERATOR_PASSWORD ?? "PointmorDev!Demo",
    10,
  );

  for (const spec of SCENARIOS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: spec.slug },
      create: {
        slug: spec.slug,
        name: spec.name,
        onboardingStep: 6,
        onboardingCompletedAt: new Date(),
      },
      update: {
        name: spec.name,
        onboardingStep: 6,
        onboardingCompletedAt: new Date(),
      },
    });

    const plan = planBySlug[spec.planSlug];
    await prisma.subscription.upsert({
      where: { id: spec.subscriptionId },
      create: {
        id: spec.subscriptionId,
        tenantId: tenant.id,
        planId: plan.id,
        status: "active",
        renewsAt: new Date("2026-12-01T00:00:00.000Z"),
      },
      update: {
        planId: plan.id,
        status: "active",
      },
    });

    await prisma.storeSettings.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        storeName: spec.storeName,
        currency: "EUR",
        timezone: "Europe/Istanbul",
        menuPublicEnabled: true,
      },
      update: {
        storeName: spec.storeName,
        currency: "EUR",
      },
    });

    await prisma.user.upsert({
      where: { email: spec.ownerEmail },
      create: {
        email: spec.ownerEmail,
        name: `${spec.storeName} — owner`,
        passwordHash: devPassword,
        platformAdmin: false,
        tenantId: tenant.id,
        role: "tenant_operator",
      },
      update: {
        tenantId: tenant.id,
        passwordHash: devPassword,
        role: "tenant_operator",
      },
    });

    const existingCustomers = await prisma.customer.count({ where: { tenantId: tenant.id } });
    if (existingCustomers > 0 && !force) {
      console.info(
        `seedDemoScenarios: ${spec.slug} zaten ${existingCustomers} müşteri — atlanıyor (FORCE_RESEED_DEMO=1 ile sıfırlanır).`,
      );
      continue;
    }

    if (force && existingCustomers > 0) {
      await wipeScenarioTenant(prisma, tenant.id);
    }

    const salt = spec.key === "small" ? 1 : spec.key === "busy" ? 2 : 3;
    const rng = mulberry32(salt * 999 + 42);

    await seedMenu(prisma, tenant.id);
    const { rewards, campaignIds } = await seedRewardsAndCampaigns(prisma, tenant.id, spec.key);

    const customers = await seedCustomers(prisma, tenant.id, spec.customerTarget, salt, rng, spec.key);

    await seedVisitsLedgerAndCustomers(
      prisma,
      tenant.id,
      customers,
      spec.key,
      rng,
      campaignIds,
    );

    await seedRedemptions(prisma, tenant.id, rewards, rng, spec.key);

    console.info(
      `seedDemoScenarios: ${spec.slug} — ${customers.length} müşteri, menü / ödül / kampanya / ziyaret yüklendi.`,
    );
  }
}

async function seedMenu(prisma: PrismaClient, tenantId: string) {
  for (const cat of MENU_TEMPLATE) {
    const row = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    await prisma.menuItem.createMany({
      data: cat.items.map((it) => ({
        tenantId,
        categoryId: row.id,
        name: it.name,
        description: it.description,
        price: it.price,
        currency: "EUR",
        imageUrl: it.imageUrl,
        sortOrder: it.sortOrder,
        isActive: true,
      })),
    });
  }
}

async function seedRewardsAndCampaigns(
  prisma: PrismaClient,
  tenantId: string,
  key: ScenarioKey,
): Promise<{
  rewards: { id: string; pointsCost: number }[];
  campaignIds: { morning: string | null; weekend: string | null; weekday: string | null };
}> {
  const rewardsData: Prisma.RewardCreateManyInput[] =
    key === "small"
      ? [
          {
            tenantId,
            name: "Free Coffee",
            description: "Herhangi bir filtre kahve",
            pointsCost: 100,
            rewardType: "FREE_ITEM",
            valueType: "NONE",
            value: 0,
            isActive: true,
          },
          {
            tenantId,
            name: "Pastry discount",
            description: "500 minor birim indirim",
            pointsCost: 200,
            rewardType: "FIXED_DISCOUNT",
            valueType: "MINOR_AMOUNT",
            value: 500,
            isActive: true,
          },
        ]
      : key === "busy"
        ? [
            {
              tenantId,
              name: "Free Coffee",
              description: "Orta boy filtre",
              pointsCost: 120,
              rewardType: "FREE_ITEM",
              valueType: "NONE",
              value: 0,
              isActive: true,
            },
            {
              tenantId,
              name: "10% off bill",
              description: "Sepet üzerinden yüzde indirim",
              pointsCost: 350,
              rewardType: "PERCENT_DISCOUNT",
              valueType: "PERCENT_BP",
              value: 1000,
              isActive: true,
            },
            {
              tenantId,
              name: "Free dessert",
              description: "Tatlı menüsünden bir seçim",
              pointsCost: 280,
              rewardType: "FREE_ITEM",
              valueType: "NONE",
              value: 0,
              isActive: true,
            },
          ]
        : [
            {
              tenantId,
              name: "Free Coffee",
              description: "Herhangi bir kahve",
              pointsCost: 80,
              rewardType: "FREE_ITEM",
              valueType: "NONE",
              value: 0,
              isActive: true,
            },
            {
              tenantId,
              name: "Breakfast combo -2€",
              description: "İndirim",
              pointsCost: 150,
              rewardType: "FIXED_DISCOUNT",
              valueType: "MINOR_AMOUNT",
              value: 200,
              isActive: true,
            },
            {
              tenantId,
              name: "15% weekend",
              description: "Yüzde indirim",
              pointsCost: 400,
              rewardType: "PERCENT_DISCOUNT",
              valueType: "PERCENT_BP",
              value: 1500,
              isActive: true,
            },
            {
              tenantId,
              name: "Merch mug",
              description: "Hediye kupa",
              pointsCost: 600,
              rewardType: "FREE_ITEM",
              valueType: "NONE",
              value: 0,
              isActive: true,
            },
            {
              tenantId,
              name: "Free delivery",
              description: "Teslimat indirimi",
              pointsCost: 900,
              rewardType: "FIXED_DISCOUNT",
              valueType: "MINOR_AMOUNT",
              value: 350,
              isActive: true,
            },
          ];

  await prisma.reward.createMany({ data: rewardsData });
  const rewards = await prisma.reward.findMany({
    where: { tenantId },
    select: { id: true, pointsCost: true },
    orderBy: { pointsCost: "asc" },
  });

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  const end = new Date(now);
  end.setDate(end.getDate() + 90);

  const campaignIds = { morning: null as string | null, weekend: null as string | null, weekday: null as string | null };

  if (key === "busy") {
    const c = await prisma.campaign.create({
      data: {
        tenantId,
        name: "Hafta içi +10 puan",
        description: "Her işlemde ekstra 10 puan (demo)",
        type: "BONUS_POINTS",
        status: "active",
        startAt: start,
        endAt: end,
        config: { points: 10 },
        isActive: true,
      },
    });
    campaignIds.weekday = c.id;
  } else if (key === "chain") {
    const c1 = await prisma.campaign.create({
      data: {
        tenantId,
        name: "Sabah ekstra +5 puan",
        description: "Demo kampanya — örnek bonus",
        type: "BONUS_POINTS",
        status: "active",
        startAt: start,
        endAt: end,
        config: { points: 5 },
        isActive: true,
      },
    });
    const c2 = await prisma.campaign.create({
      data: {
        tenantId,
        name: "Hafta sonu bonus +8 puan",
        description: "Demo kampanya — örnek bonus",
        type: "BONUS_POINTS",
        status: "active",
        startAt: start,
        endAt: end,
        config: { points: 8 },
        isActive: true,
      },
    });
    campaignIds.morning = c1.id;
    campaignIds.weekend = c2.id;
  }

  return { rewards, campaignIds };
}

async function seedCustomers(
  prisma: PrismaClient,
  tenantId: string,
  count: number,
  salt: number,
  rng: () => number,
  key: ScenarioKey,
): Promise<{ id: string }[]> {
  type Row = {
    name: string;
    phone: string;
    createdAt: Date;
    lastVisitAt: Date | null;
    visitCount: number;
  };
  const rows: Row[] = [];
  const base = new Date();
  base.setDate(base.getDate() - 120);

  for (let i = 0; i < count; i++) {
    const created = new Date(base);
    created.setDate(created.getDate() + Math.floor(rng() * 90));
    const segment = rng();
    let lastVisitAt: Date | null;
    let visitCount: number;

    if (segment < 0.07) {
      lastVisitAt = null;
      visitCount = 0;
    } else if (segment < 0.32) {
      const d = new Date();
      d.setDate(d.getDate() - (1 + Math.floor(rng() * 2)));
      lastVisitAt = d;
      visitCount = 2 + Math.floor(rng() * 12);
    } else if (segment < 0.52) {
      const d = new Date();
      d.setDate(d.getDate() - (3 + Math.floor(rng() * 3)));
      lastVisitAt = d;
      visitCount = 3 + Math.floor(rng() * 15);
    } else if (segment < 0.8) {
      const d = new Date();
      d.setDate(d.getDate() - (7 + Math.floor(rng() * 28)));
      lastVisitAt = d;
      visitCount = 4 + Math.floor(rng() * 22);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(rng() * 2));
      lastVisitAt = d;
      visitCount = 1;
    }

    rows.push({
      name: `Müşteri ${String(i + 1).padStart(4, "0")}`,
      phone: phoneFor(salt, i),
      createdAt: created,
      lastVisitAt,
      visitCount,
    });
  }

  if (key === "busy") {
    const atRisk = Math.floor(rows.length * 0.4);
    for (let i = 0; i < atRisk; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (3 + Math.floor(mulberry32(i + 5000)() * 3)));
      rows[i]!.lastVisitAt = d;
      if (rows[i]!.visitCount < 2) rows[i]!.visitCount = 3;
    }
  }

  const created: { id: string }[] = [];
  for (const r of rows) {
    const c = await prisma.customer.create({
      data: {
        tenantId,
        name: r.name,
        phone: r.phone,
        createdAt: r.createdAt,
        lastVisitAt: r.lastVisitAt,
        visitCount: 0,
        lastActiveAt: r.lastVisitAt,
        loyaltyAccount: { create: { tenantId, pointsBalance: 0 } },
      },
      select: { id: true },
    });
    created.push(c);
  }

  return created;
}

async function seedVisitsLedgerAndCustomers(
  prisma: PrismaClient,
  tenantId: string,
  customers: { id: string }[],
  key: ScenarioKey,
  rng: () => number,
  campaignIds: { morning: string | null; weekend: string | null; weekday: string | null },
) {
  const visitBatch: Prisma.VisitCreateManyInput[] = [];
  const maxVisits =
    key === "chain" ? 8 : key === "busy" ? 12 : 6;

  let idx = 0;
  for (const c of customers) {
    const r = mulberry32(idx++ + (key === "chain" ? 33333 : 0));
    const targetVisits = Math.min(maxVisits, Math.floor(r() * (maxVisits + 1)));
    if (targetVisits === 0) continue;

    for (let v = 0; v < targetVisits; v++) {
      const daysAgo = Math.floor(r() * 58);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(9 + Math.floor(r() * 8), Math.floor(r() * 59), 0, 0);

      const amount = 400 + Math.floor(r() * 2200);
      const base = pointsFromAmountMinor(amount);
      let bonus = 0;

      if (key === "busy" && campaignIds.weekday && r() < 0.35) {
        bonus += 10;
      }
      if (key === "chain" && campaignIds.morning && r() < 0.22) {
        bonus += 5;
      }
      if (key === "chain" && campaignIds.weekend && r() < 0.18) {
        bonus += 8;
      }

      const pointsEarned = base + bonus;
      visitBatch.push({
        tenantId,
        customerId: c.id,
        amount,
        pointsEarned,
        basePointsEarned: base,
        bonusPointsEarned: bonus,
        createdAt,
      });
    }
  }

  const CHUNK = 800;
  for (let i = 0; i < visitBatch.length; i += CHUNK) {
    await prisma.visit.createMany({ data: visitBatch.slice(i, i + CHUNK) });
  }

  const visitsDb = await prisma.visit.findMany({
    where: { tenantId },
    select: {
      id: true,
      customerId: true,
      pointsEarned: true,
      bonusPointsEarned: true,
    },
  });

  const ledgerBatch: Prisma.PointsLedgerCreateManyInput[] = [];
  const vcaBatch: Prisma.VisitCampaignApplicationCreateManyInput[] = [];

  for (const v of visitsDb) {
    ledgerBatch.push({
      tenantId,
      customerId: v.customerId,
      type: "earn",
      source: "visit",
      points: v.pointsEarned,
      referenceId: v.id,
      visitId: v.id,
    });

    if (v.bonusPointsEarned <= 0) continue;

    if (key === "busy" && campaignIds.weekday) {
      vcaBatch.push({
        tenantId,
        visitId: v.id,
        campaignId: campaignIds.weekday,
        pointsAwarded: v.bonusPointsEarned,
      });
    } else if (key === "chain") {
      const pick = mulberry32(v.id.length + 17)();
      const cid =
        pick < 0.55 && campaignIds.morning
          ? campaignIds.morning
          : campaignIds.weekend ?? campaignIds.morning;
      if (cid) {
        vcaBatch.push({
          tenantId,
          visitId: v.id,
          campaignId: cid,
          pointsAwarded: v.bonusPointsEarned,
        });
      }
    }
  }

  for (let i = 0; i < ledgerBatch.length; i += CHUNK) {
    await prisma.pointsLedger.createMany({ data: ledgerBatch.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < vcaBatch.length; i += CHUNK) {
    await prisma.visitCampaignApplication.createMany({
      data: vcaBatch.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }

  const sums = new Map<string, number>();
  for (const v of visitsDb) {
    sums.set(v.customerId, (sums.get(v.customerId) ?? 0) + v.pointsEarned);
  }

  for (const [customerId, bal] of sums) {
    await prisma.loyaltyAccount.updateMany({
      where: { customerId },
      data: { pointsBalance: bal },
    });
    const vc = await prisma.visit.count({ where: { customerId } });
    const last = await prisma.visit.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        visitCount: vc,
        lastVisitAt: last?.createdAt ?? null,
        lastActiveAt: last?.createdAt ?? null,
      },
    });
  }
}

async function seedRedemptions(
  prisma: PrismaClient,
  tenantId: string,
  rewards: { id: string; pointsCost: number }[],
  rng: () => number,
  key: ScenarioKey,
) {
  const low = rewards[0];
  if (!low) return;
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const n =
    key === "chain"
      ? Math.min(200, customers.length)
      : key === "busy"
        ? Math.min(48, customers.length)
        : Math.min(4, customers.length);
  const pool = customers.slice().sort(() => rng() - 0.5);

  for (let i = 0; i < n; i++) {
    const customerId = pool[i]!.id;
    const acct = await prisma.loyaltyAccount.findUnique({ where: { customerId } });
    const cost = low.pointsCost;
    if (!acct || acct.pointsBalance < cost) continue;

    await prisma.$transaction([
      prisma.redemption.create({
        data: {
          tenantId,
          customerId,
          rewardId: low.id,
          pointsSpent: cost,
          status: "completed",
        },
      }),
      prisma.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          type: "redeem",
          source: "redemption",
          points: -cost,
          referenceId: low.id,
        },
      }),
      prisma.loyaltyAccount.update({
        where: { customerId },
        data: { pointsBalance: { decrement: cost } },
      }),
    ]);
  }
}
