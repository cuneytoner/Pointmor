import { hashSync } from "bcryptjs";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { createMembership } from "./seed-membership-helper.js";
import { MESSAGE_TEMPLATE_SEED } from "./seed-message-templates.js";
import { seedDemoScenarios } from "./seed-demo-scenarios.js";

export type CoreSeedContext = {
  demoTenantId: string;
  growthPlanId: string;
  adminUserId: string;
  demoOwnerUserId: string;
};

export async function coreSeed(input: {
  prisma: PrismaClient;
  adminPasswordHash: string;
  operatorPasswordHash: string;
}): Promise<CoreSeedContext> {
  const { prisma, adminPasswordHash, operatorPasswordHash } = input;
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

  await prisma.plan.upsert({
    where: { slug: "starter" },
    create: {
      slug: "starter",
      name: "Baslangic",
      description: "Deneme ve kucuk isletmeler",
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
      description: "Orta seviye - uyumluluk ozeti ve kisa saklama",
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
      name: "Buyume",
      description: "Aylik faturalama",
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

  const platformAdmin = await prisma.user.upsert({
    where: { email: "admin@pointmor.local" },
    create: {
      email: "admin@pointmor.local",
      name: "Platform Yoneticisi",
      passwordHash: adminPasswordHash,
      platformAdmin: true,
      role: "platform_admin",
    },
    update: {
      passwordHash: adminPasswordHash,
      name: "Platform Yoneticisi",
      platformAdmin: true,
      role: "platform_admin",
      tenantId: null,
    },
  });

  const demoOwner = await prisma.user.upsert({
    where: { email: "owner@demo.pointmor.local" },
    create: {
      email: "owner@demo.pointmor.local",
      name: "Demo Cafe - owner",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: demoTenant.id,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: demoTenant.id,
      role: "tenant_operator",
    },
  });

  // Membership-first doctrine: tenant-scoped access always comes from TenantMembership.
  await createMembership({
    prisma,
    userId: platformAdmin.id,
    tenantId: demoTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: demoOwner.id,
    tenantId: demoTenant.id,
    role: "ADMIN",
    isExternal: false,
  });

  return {
    demoTenantId: demoTenant.id,
    growthPlanId: growth.id,
    adminUserId: platformAdmin.id,
    demoOwnerUserId: demoOwner.id,
  };
}

export async function moduleSeed(input: {
  prisma: PrismaClient;
  demoTenantId: string;
}): Promise<void> {
  const { prisma, demoTenantId } = input;
  const cafeModule = await prisma.module.upsert({
    where: { name: "cafe" },
    create: { name: "cafe", description: "Cafe module" },
    update: {},
  });
  await prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId: demoTenantId,
        moduleId: cafeModule.id,
      },
    },
    create: {
      tenantId: demoTenantId,
      moduleId: cafeModule.id,
      isActive: true,
    },
    update: { isActive: true },
  });

  const aiActModule = await prisma.module.upsert({
    where: { name: "ai_act" },
    create: { name: "ai_act", description: "AI Act compliance module" },
    update: {},
  });
  await prisma.tenantModule.upsert({
    where: {
      tenantId_moduleId: {
        tenantId: demoTenantId,
        moduleId: aiActModule.id,
      },
    },
    create: {
      tenantId: demoTenantId,
      moduleId: aiActModule.id,
      isActive: true,
    },
    update: { isActive: true },
  });
}

export async function scenarioSeed(input: {
  prisma: PrismaClient;
  demoTenantId: string;
  growthPlanId: string;
  demoOwnerUserId: string;
  adminEmailForAudit: string;
  includeDemoScenarios: boolean;
}): Promise<void> {
  const {
    prisma,
    demoTenantId,
    growthPlanId,
    demoOwnerUserId,
    adminEmailForAudit,
    includeDemoScenarios,
  } = input;

  await prisma.subscription.upsert({
    where: { id: "seed_sub_demo" },
    create: {
      id: "seed_sub_demo",
      tenantId: demoTenantId,
      planId: growthPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {},
  });

  if ((await prisma.auditEvent.count({ where: { tenantId: demoTenantId } })) === 0) {
    await prisma.auditEvent.createMany({
      data: [
        {
          tenantId: demoTenantId,
          actorUserId: demoOwnerUserId,
          actorType: "manager",
          eventType: "seed_audit_sample",
          entityType: "other",
          entityId: demoTenantId,
          payload: { message: "Demo denetim kaydi (seed)" },
        },
        {
          tenantId: demoTenantId,
          actorUserId: demoOwnerUserId,
          actorType: "manager",
          eventType: "RETENTION_UPDATED",
          entityType: "other",
          entityId: demoTenantId,
          payload: { note: "ornek uyumluluk olayi" },
        },
      ],
    });
  }

  await prisma.auditLog.deleteMany({ where: { action: "seed" } });
  await prisma.auditLog.create({
    data: {
      actorEmail: adminEmailForAudit,
      action: "seed",
      detail: "pointmor_baseline",
    },
  });

  await prisma.messageTemplate.createMany({
    data: MESSAGE_TEMPLATE_SEED,
    skipDuplicates: true,
  });

  if (includeDemoScenarios) {
    await seedDemoScenarios(prisma);
  }

  const aiSystem = await prisma.aiSystem.upsert({
    where: {
      id_tenantId: {
        id: "seed_ai_system_pos_assistant",
        tenantId: demoTenantId,
      },
    },
    create: {
      id: "seed_ai_system_pos_assistant",
      tenantId: demoTenantId,
      name: "Smart POS Assistant",
      purpose: "Siparis ve menu onerileri",
      description: "Demo AI Act MVP sistemi",
    },
    update: {
      name: "Smart POS Assistant",
      purpose: "Siparis ve menu onerileri",
      description: "Demo AI Act MVP sistemi",
    },
  });

  const assessment = await prisma.aiAssessment.upsert({
    where: {
      id_tenantId: {
        id: "seed_ai_assessment_pos_assistant",
        tenantId: demoTenantId,
      },
    },
    create: {
      id: "seed_ai_assessment_pos_assistant",
      tenantId: demoTenantId,
      aiSystemId: aiSystem.id,
      status: "completed",
      questionnaire: {
        intendedUse: "customer_support",
        impactsCriticalRights: false,
        biometricUse: false,
      },
    },
    update: {
      status: "completed",
      questionnaire: {
        intendedUse: "customer_support",
        impactsCriticalRights: false,
        biometricUse: false,
      },
    },
  });

  await prisma.aiDocument.upsert({
    where: {
      id_tenantId: {
        id: "seed_ai_document_policy_v1",
        tenantId: demoTenantId,
      },
    },
    create: {
      id: "seed_ai_document_policy_v1",
      tenantId: demoTenantId,
      aiSystemId: aiSystem.id,
      aiAssessmentId: assessment.id,
      title: "AI policy v1",
      sourceType: "ocr",
      extractedText: "Demo AI policy extracted text.",
      embeddingRef: "qdrant:demo-cafe:ai-policy-v1",
    },
    update: {
      title: "AI policy v1",
      sourceType: "ocr",
      extractedText: "Demo AI policy extracted text.",
      embeddingRef: "qdrant:demo-cafe:ai-policy-v1",
    },
  });

  await prisma.aiRiskResult.upsert({
    where: {
      id_tenantId: {
        id: "seed_ai_risk_pos_assistant",
        tenantId: demoTenantId,
      },
    },
    create: {
      id: "seed_ai_risk_pos_assistant",
      tenantId: demoTenantId,
      aiAssessmentId: assessment.id,
      riskLevel: "MEDIUM",
      score: 58,
      rationale: "Demo risk scoring output",
    },
    update: {
      riskLevel: "MEDIUM",
      score: 58,
      rationale: "Demo risk scoring output",
    },
  });
}

export function defaultDevPasswordHashes(): { admin: string; operator: string } {
  return {
    admin: hashSync("PointmorDev!Admin", 10),
    operator: hashSync("PointmorDev!Demo", 10),
  };
}
