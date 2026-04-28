import { hashSync } from "bcryptjs";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client.js";
import { createMembership } from "./seed-membership-helper.js";
import { MESSAGE_TEMPLATE_SEED } from "./seed-message-templates.js";
import { seedDemoScenarios } from "./seed-demo-scenarios.js";
import { AI_ACT_QUESTION_KEYS, type AiActQuestionKey } from "../src/lib/ai-act-assessment.ts";

export type CoreSeedContext = {
  loyaltyTenantId: string;
  aiActTenantId: string;
  mixedTenantId: string;
  advisorTenantId: string;
  starterPlanId: string;
  compliancePlanId: string;
  growthPlanId: string;
  advisorPlanId: string;
  adminUserId: string;
  ownerUserId: string;
  memberUserId: string;
  advisorUserId: string;
};

export async function coreSeed(input: {
  prisma: PrismaClient;
  adminPasswordHash: string;
  operatorPasswordHash: string;
}): Promise<CoreSeedContext> {
  const { prisma, adminPasswordHash, operatorPasswordHash } = input;
  const loyaltyTenant = await prisma.tenant.upsert({
    where: { slug: "urban-coffee-group" },
    create: {
      slug: "urban-coffee-group",
      name: "Urban Coffee Group",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
    update: {
      name: "Urban Coffee Group",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
  });
  const aiActTenant = await prisma.tenant.upsert({
    where: { slug: "acme-ai-solutions" },
    create: {
      slug: "acme-ai-solutions",
      name: "Acme AI Solutions",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
    update: {
      name: "Acme AI Solutions",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
  });
  const mixedTenant = await prisma.tenant.upsert({
    where: { slug: "retailcorp-eu" },
    create: {
      slug: "retailcorp-eu",
      name: "RetailCorp EU",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
    update: {
      name: "RetailCorp EU",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
  });
  const advisorTenant = await prisma.tenant.upsert({
    where: { slug: "kanzlei-mueller-advisory" },
    create: {
      slug: "kanzlei-mueller-advisory",
      name: "Kanzlei Muller Advisory",
      type: "ADVISOR",
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
    },
    update: {
      name: "Kanzlei Muller Advisory",
      type: "ADVISOR",
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
      name: "Starter Platform",
      description: "Core platform baseline for single-product usage",
      priceCents: 0,
      currency: "EUR",
      interval: "month",
      planType: "free",
      featureTags: ["loyalty", "expense_capture", "e_invoice"],
      limits: starterLimits,
    },
    update: {
      planType: "free",
      name: "Starter Platform",
      description: "Core platform baseline for single-product usage",
      featureTags: ["loyalty", "expense_capture", "e_invoice"],
      limits: starterLimits,
    },
  });

  const complianceFeatures = ["ai_act", "ai_document_intelligence", "advisor_dashboard"];

  await prisma.plan.upsert({
    where: { slug: "pro" },
    create: {
      slug: "pro",
      name: "Compliance Pro",
      description: "AI/compliance focused module package",
      priceCents: 4900,
      currency: "EUR",
      interval: "month",
      planType: "pro",
      featureTags: complianceFeatures,
      limits: {},
    },
    update: {
      planType: "pro",
      name: "Compliance Pro",
      description: "AI/compliance focused module package",
      featureTags: complianceFeatures,
      limits: {},
    },
  });

  const multiProductFeatures = [
    "ai_act",
    "ai_document_intelligence",
    "loyalty",
    "expense_capture",
    "e_invoice",
    "advisor_dashboard",
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
  ];

  const growth = await prisma.plan.upsert({
    where: { slug: "growth" },
    create: {
      slug: "growth",
      name: "Multi-Product Business",
      description: "Combined loyalty and AI/compliance package",
      priceCents: 8900,
      currency: "EUR",
      interval: "month",
      planType: "pro",
      featureTags: multiProductFeatures,
      limits: {},
    },
    update: {
      planType: "pro",
      name: "Multi-Product Business",
      description: "Combined loyalty and AI/compliance package",
      featureTags: multiProductFeatures,
      limits: {},
    },
  });
  const advisorPlan = await prisma.plan.upsert({
    where: { slug: "advisor-firm" },
    create: {
      slug: "advisor-firm",
      name: "Advisor Firm",
      description: "Advisory tenant package with client workspace access",
      priceCents: 6900,
      currency: "EUR",
      interval: "month",
      planType: "pro",
      featureTags: ["advisor_dashboard", "ai_act", "ai_document_intelligence", "expense_capture", "e_invoice"],
      limits: {},
    },
    update: {
      name: "Advisor Firm",
      description: "Advisory tenant package with client workspace access",
      featureTags: ["advisor_dashboard", "ai_act", "ai_document_intelligence", "expense_capture", "e_invoice"],
      limits: {},
    },
  });

  const platformAdmin = await prisma.user.upsert({
    where: { email: "admin@pointmor.io" },
    create: {
      email: "admin@pointmor.io",
      name: "Cüneyt Öner",
      passwordHash: adminPasswordHash,
      platformAdmin: true,
      role: "platform_admin",
    },
    update: {
      passwordHash: adminPasswordHash,
      name: "Cüneyt Öner",
      platformAdmin: true,
      role: "platform_admin",
      tenantId: null,
    },
  });

  const aiOwnerUser = await prisma.user.upsert({
    where: { email: "david@acme-ai.eu" },
    create: {
      email: "david@acme-ai.eu",
      name: "David Chen",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });
  const loyaltyOwnerUser = await prisma.user.upsert({
    where: { email: "sofia@urbancoffee.eu" },
    create: {
      email: "sofia@urbancoffee.eu",
      name: "Sofia Rossi",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });
  const mixedOwnerUser = await prisma.user.upsert({
    where: { email: "michael@retailcorp.eu" },
    create: {
      email: "michael@retailcorp.eu",
      name: "Michael Weber",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });
  const memberUser = await prisma.user.upsert({
    where: { email: "emma@pointmor.io" },
    create: {
      email: "emma@pointmor.io",
      name: "Emma Clarke",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });
  const advisorUser = await prisma.user.upsert({
    where: { email: "anna@kanzlei-mueller.eu" },
    create: {
      email: "anna@kanzlei-mueller.eu",
      name: "Anna Müller",
      passwordHash: operatorPasswordHash,
      platformAdmin: false,
      tenantId: null,
      role: "tenant_operator",
    },
    update: {
      passwordHash: operatorPasswordHash,
      tenantId: null,
      role: "tenant_operator",
    },
  });

  // Membership-first doctrine: tenant-scoped access always comes from TenantMembership.
  await createMembership({
    prisma,
    userId: platformAdmin.id,
    tenantId: loyaltyTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: platformAdmin.id,
    tenantId: aiActTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: platformAdmin.id,
    tenantId: mixedTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: loyaltyOwnerUser.id,
    tenantId: loyaltyTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: aiOwnerUser.id,
    tenantId: aiActTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: mixedOwnerUser.id,
    tenantId: mixedTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: memberUser.id,
    tenantId: loyaltyTenant.id,
    role: "MEMBER",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: memberUser.id,
    tenantId: mixedTenant.id,
    role: "MEMBER",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: advisorUser.id,
    tenantId: advisorTenant.id,
    role: "ADMIN",
    isExternal: false,
  });
  await createMembership({
    prisma,
    userId: advisorUser.id,
    tenantId: aiActTenant.id,
    role: "ADVISOR",
    isExternal: true,
  });
  await createMembership({
    prisma,
    userId: advisorUser.id,
    tenantId: mixedTenant.id,
    role: "ADVISOR",
    isExternal: true,
  });

  return {
    loyaltyTenantId: loyaltyTenant.id,
    aiActTenantId: aiActTenant.id,
    mixedTenantId: mixedTenant.id,
    advisorTenantId: advisorTenant.id,
    starterPlanId: (await prisma.plan.findUniqueOrThrow({ where: { slug: "starter" }, select: { id: true } })).id,
    compliancePlanId: (await prisma.plan.findUniqueOrThrow({ where: { slug: "pro" }, select: { id: true } })).id,
    growthPlanId: growth.id,
    advisorPlanId: advisorPlan.id,
    adminUserId: platformAdmin.id,
    ownerUserId: aiOwnerUser.id,
    memberUserId: memberUser.id,
    advisorUserId: advisorUser.id,
  };
}

export async function moduleSeed(input: {
  prisma: PrismaClient;
  loyaltyTenantId: string;
  aiActTenantId: string;
  mixedTenantId: string;
  advisorTenantId: string;
}): Promise<void> {
  const { prisma, loyaltyTenantId, aiActTenantId, mixedTenantId, advisorTenantId } = input;
  const setModuleState = async (tenantId: string, moduleId: string, isActive: boolean) => {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      create: { tenantId, moduleId, isActive },
      update: { isActive },
    });
  };
  const cafeModule = await prisma.module.upsert({
    where: { name: "cafe" },
    create: { name: "cafe", description: "Cafe module" },
    update: {},
  });

  const aiActModule = await prisma.module.upsert({
    where: { name: "ai_act" },
    create: { name: "ai_act", description: "AI Act compliance module" },
    update: {},
  });
  const aiDocumentModule = await prisma.module.findUnique({
    where: { name: "ai_document_intelligence" },
    select: { id: true },
  });
  await setModuleState(loyaltyTenantId, cafeModule.id, true);
  await setModuleState(loyaltyTenantId, aiActModule.id, false);
  await setModuleState(aiActTenantId, cafeModule.id, false);
  await setModuleState(aiActTenantId, aiActModule.id, true);
  await setModuleState(mixedTenantId, cafeModule.id, true);
  await setModuleState(mixedTenantId, aiActModule.id, true);
  await setModuleState(advisorTenantId, cafeModule.id, false);
  await setModuleState(advisorTenantId, aiActModule.id, true);
  if (aiDocumentModule) {
    await setModuleState(loyaltyTenantId, aiDocumentModule.id, false);
    await setModuleState(aiActTenantId, aiDocumentModule.id, true);
    await setModuleState(mixedTenantId, aiDocumentModule.id, true);
    await setModuleState(advisorTenantId, aiDocumentModule.id, true);
  }
}

export async function scenarioSeed(input: {
  prisma: PrismaClient;
  loyaltyTenantId: string;
  aiActTenantId: string;
  mixedTenantId: string;
  advisorTenantId: string;
  starterPlanId: string;
  compliancePlanId: string;
  growthPlanId: string;
  advisorPlanId: string;
  ownerUserId: string;
  advisorUserId: string;
  adminEmailForAudit: string;
  includeDemoScenarios: boolean;
}): Promise<void> {
  const {
    prisma,
    loyaltyTenantId,
    aiActTenantId,
    mixedTenantId,
    advisorTenantId,
    starterPlanId,
    compliancePlanId,
    growthPlanId,
    advisorPlanId,
    ownerUserId,
    advisorUserId,
    adminEmailForAudit,
    includeDemoScenarios,
  } = input;

  await prisma.subscription.upsert({
    where: { id: "seed_sub_demo" },
    create: {
      id: "seed_sub_demo",
      tenantId: loyaltyTenantId,
      planId: starterPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {
      tenantId: loyaltyTenantId,
      planId: starterPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  await prisma.subscription.upsert({
    where: { id: "seed_sub_advisor" },
    create: {
      id: "seed_sub_advisor",
      tenantId: advisorTenantId,
      planId: advisorPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {
      tenantId: advisorTenantId,
      planId: advisorPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  await prisma.subscription.upsert({
    where: { id: "seed_sub_ai_act" },
    create: {
      id: "seed_sub_ai_act",
      tenantId: aiActTenantId,
      planId: compliancePlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {
      tenantId: aiActTenantId,
      planId: compliancePlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  await prisma.subscription.upsert({
    where: { id: "seed_sub_mixed" },
    create: {
      id: "seed_sub_mixed",
      tenantId: mixedTenantId,
      planId: growthPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    update: {
      tenantId: mixedTenantId,
      planId: growthPlanId,
      status: "active",
      renewsAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });

  if ((await prisma.auditEvent.count({ where: { tenantId: loyaltyTenantId } })) === 0) {
    await prisma.auditEvent.createMany({
      data: [
        {
          tenantId: loyaltyTenantId,
          actorUserId: ownerUserId,
          actorType: "manager",
          eventType: "seed_audit_sample",
          entityType: "other",
          entityId: loyaltyTenantId,
          payload: { message: "Demo denetim kaydi (seed)" },
        },
        {
          tenantId: loyaltyTenantId,
          actorUserId: ownerUserId,
          actorType: "manager",
          eventType: "RETENTION_UPDATED",
          entityType: "other",
          entityId: loyaltyTenantId,
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

  await seedMinimalLoyaltyData(prisma, {
    tenantId: mixedTenantId,
    ownerUserId,
    scopePrefix: "mixed",
  });

  await seedAiActMvpScenarios(prisma, {
    tenantId: aiActTenantId,
    createdByUserId: ownerUserId,
    scopePrefix: "ai_tenant",
    profile: "full",
  });
  await seedAiActMvpScenarios(prisma, {
    tenantId: mixedTenantId,
    createdByUserId: ownerUserId,
    scopePrefix: "mixed",
    profile: "minimal",
  });
  await seedAiActMvpScenarios(prisma, {
    tenantId: advisorTenantId,
    createdByUserId: advisorUserId,
    scopePrefix: "advisor",
    profile: "minimal",
  });
  await assertAiSeedConsistency(prisma, aiActTenantId);
  await assertAiSeedConsistency(prisma, mixedTenantId);
  await assertAiSeedConsistency(prisma, advisorTenantId);
}

async function seedMinimalLoyaltyData(
  prisma: PrismaClient,
  input: { tenantId: string; ownerUserId: string; scopePrefix: string },
) {
  const { tenantId, ownerUserId, scopePrefix } = input;
  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: `+9000000${scopePrefix.slice(0, 4)}` } },
    create: {
      tenantId,
      name: "Mixed Tenant Customer",
      phone: `+9000000${scopePrefix.slice(0, 4)}`,
      loyaltyAccount: { create: { tenantId, pointsBalance: 120 } },
      visitCount: 1,
      lastVisitAt: new Date("2026-04-10T10:00:00.000Z"),
      lastActiveAt: new Date("2026-04-10T10:00:00.000Z"),
    },
    update: {
      name: "Mixed Tenant Customer",
      visitCount: 1,
      lastVisitAt: new Date("2026-04-10T10:00:00.000Z"),
      lastActiveAt: new Date("2026-04-10T10:00:00.000Z"),
    },
    select: { id: true },
  });
  await prisma.reward.upsert({
    where: { id: `seed_${scopePrefix}_reward_free_coffee` },
    create: {
      id: `seed_${scopePrefix}_reward_free_coffee`,
      tenantId,
      name: "Free Coffee",
      description: "Mixed tenant minimal loyalty reward",
      pointsCost: 100,
      rewardType: "FREE_ITEM",
      valueType: "NONE",
      value: 0,
      isActive: true,
    },
    update: { tenantId, pointsCost: 100, isActive: true },
  });
  await prisma.visit.upsert({
    where: { id: `seed_${scopePrefix}_visit_001` },
    create: {
      id: `seed_${scopePrefix}_visit_001`,
      tenantId,
      customerId: customer.id,
      amount: 1200,
      pointsEarned: 12,
      basePointsEarned: 12,
      bonusPointsEarned: 0,
      createdAt: new Date("2026-04-10T10:00:00.000Z"),
    },
    update: {
      tenantId,
      customerId: customer.id,
      amount: 1200,
      pointsEarned: 12,
      basePointsEarned: 12,
      bonusPointsEarned: 0,
    },
  });
  await prisma.pointsLedger.upsert({
    where: { id: `seed_${scopePrefix}_ledger_visit_001` },
    create: {
      id: `seed_${scopePrefix}_ledger_visit_001`,
      tenantId,
      customerId: customer.id,
      type: "earn",
      source: "visit",
      points: 12,
      referenceId: `seed_${scopePrefix}_visit_001`,
      visitId: `seed_${scopePrefix}_visit_001`,
    },
    update: { tenantId, customerId: customer.id, points: 12 },
  });
  await prisma.auditEvent.upsert({
    where: { id: `seed_${scopePrefix}_audit_001` },
    create: {
      id: `seed_${scopePrefix}_audit_001`,
      tenantId,
      actorUserId: ownerUserId,
      actorType: "manager",
      eventType: "seed_minimal_loyalty",
      entityType: "customer",
      entityId: customer.id,
      payload: { scope: scopePrefix },
    },
    update: { tenantId, actorUserId: ownerUserId, entityId: customer.id },
  });
}

export function defaultDevPasswordHashes(): { admin: string; operator: string } {
  return {
    admin: hashSync("PointmorDev!Admin", 10),
    operator: hashSync("PointmorDev!Demo", 10),
  };
}

export async function seedAiActMvpScenarios(
  prisma: PrismaClient,
  input: { tenantId: string; createdByUserId: string; scopePrefix: string; profile?: "full" | "minimal" },
): Promise<void> {
  const { tenantId, createdByUserId, scopePrefix, profile = "full" } = input;
  if (profile === "minimal") {
    const minimalSystem = await prisma.aiSystem.upsert({
      where: { id: `seed_${scopePrefix}_ai_system_invoice_processing` },
      create: {
        id: `seed_${scopePrefix}_ai_system_invoice_processing`,
        tenantId,
        name: "Invoice Processing AI",
        description: "Mixed tenant icin minimal AI Act senaryosu.",
        purpose: "invoice processing",
        providerType: "INTERNAL",
        status: "ACTIVE",
        createdByUserId,
      },
      update: {
        tenantId,
        description: "Mixed tenant icin minimal AI Act senaryosu.",
        purpose: "invoice processing",
        providerType: "INTERNAL",
        status: "ACTIVE",
        createdByUserId,
      },
    });
    const minimalValues = {
      q_ai_used: false,
      q_ai_purpose: "other",
      q_personal_data: false,
      q_sensitive_data: false,
      q_automated_decision: false,
      q_human_oversight: true,
      q_employment_context: false,
      q_biometric_identification: false,
      q_safety_critical: false,
      q_provider_documentation: true,
    } satisfies Record<(typeof AI_ACT_QUESTION_KEYS)[number], Prisma.InputJsonValue>;
    const minimalAssessment = await prisma.aiAssessment.upsert({
      where: { id: `seed_${scopePrefix}_ai_assessment_invoice_processing_v1` },
      create: {
        id: `seed_${scopePrefix}_ai_assessment_invoice_processing_v1`,
        tenantId,
        aiSystemId: minimalSystem.id,
        version: 1,
        status: "COMPLETED",
        riskLevel: "MINIMAL",
        classificationSource: "HYBRID",
        confidence: 0.9,
        createdByUserId,
        questionnaire: minimalValues,
      },
      update: {
        tenantId,
        aiSystemId: minimalSystem.id,
        version: 1,
        status: "COMPLETED",
        riskLevel: "MINIMAL",
        classificationSource: "HYBRID",
        confidence: 0.9,
        createdByUserId,
        questionnaire: minimalValues,
      },
    });
    await seedAssessmentAnswers(prisma, {
      tenantId,
      assessmentId: minimalAssessment.id,
      answerSource: "AI",
      confidence: 0.9,
      values: minimalValues,
    });
    return;
  }

  const systemA = await prisma.aiSystem.upsert({
    where: { id: `seed_${scopePrefix}_ai_system_chatbot` },
    create: {
      id: `seed_${scopePrefix}_ai_system_chatbot`,
      tenantId,
      name: "Customer Support Chatbot",
      description: "Sentetik demo chatbot sistemi.",
      purpose: "customer support automation",
      providerType: "EXTERNAL",
      status: "ACTIVE",
      createdByUserId,
    },
    update: {
      tenantId,
      description: "Sentetik demo chatbot sistemi.",
      purpose: "customer support automation",
      providerType: "EXTERNAL",
      status: "ACTIVE",
      createdByUserId,
    },
  });

  const assessmentAValues = {
    q_ai_used: true,
    q_ai_purpose: "customer_support",
    q_personal_data: true,
    q_sensitive_data: false,
    q_automated_decision: false,
    q_human_oversight: true,
    q_employment_context: false,
    q_biometric_identification: false,
    q_safety_critical: false,
    q_provider_documentation: true,
  } satisfies Record<(typeof AI_ACT_QUESTION_KEYS)[number], Prisma.InputJsonValue>;
  const assessmentAQuestionnaire: Prisma.InputJsonValue = assessmentAValues;
  const assessmentA = await prisma.aiAssessment.upsert({
    where: { id: `seed_${scopePrefix}_ai_assessment_chatbot_v1` },
    create: {
      id: `seed_${scopePrefix}_ai_assessment_chatbot_v1`,
      tenantId,
      aiSystemId: systemA.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "LIMITED",
      classificationSource: "HYBRID",
      confidence: 0.75,
      createdByUserId,
      questionnaire: assessmentAQuestionnaire,
    },
    update: {
      tenantId,
      aiSystemId: systemA.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "LIMITED",
      classificationSource: "HYBRID",
      confidence: 0.75,
      createdByUserId,
      questionnaire: assessmentAQuestionnaire,
    },
  });
  await seedAssessmentAnswers(prisma, {
    tenantId,
    assessmentId: assessmentA.id,
    answerSource: "AI",
    confidence: 0.75,
    values: assessmentAValues,
  });

  const systemB = await prisma.aiSystem.upsert({
    where: { id: `seed_${scopePrefix}_ai_system_cv_screening_tool` },
    create: {
      id: `seed_${scopePrefix}_ai_system_cv_screening_tool`,
      tenantId,
      name: "CV Screening Tool",
      description: "Sentetik yuksek riskli ise alim degerlendirme senaryosu.",
      purpose: "cv screening",
      providerType: "HYBRID",
      status: "DRAFT",
      createdByUserId,
    },
    update: {
      tenantId,
      description: "Sentetik yuksek riskli ise alim degerlendirme senaryosu.",
      purpose: "cv screening",
      providerType: "HYBRID",
      status: "DRAFT",
      createdByUserId,
    },
  });

  const assessmentBValues = {
    q_ai_used: true,
    q_ai_purpose: "employee_performance",
    q_personal_data: true,
    q_sensitive_data: true,
    q_automated_decision: true,
    q_human_oversight: false,
    q_employment_context: true,
    q_biometric_identification: false,
    q_safety_critical: false,
    q_provider_documentation: false,
  } satisfies Record<(typeof AI_ACT_QUESTION_KEYS)[number], Prisma.InputJsonValue>;
  const assessmentBQuestionnaire: Prisma.InputJsonValue = assessmentBValues;
  const assessmentB = await prisma.aiAssessment.upsert({
    where: { id: `seed_${scopePrefix}_ai_assessment_cv_screening_v1` },
    create: {
      id: `seed_${scopePrefix}_ai_assessment_cv_screening_v1`,
      tenantId,
      aiSystemId: systemB.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.62,
      createdByUserId,
      questionnaire: assessmentBQuestionnaire,
    },
    update: {
      tenantId,
      aiSystemId: systemB.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.62,
      createdByUserId,
      questionnaire: assessmentBQuestionnaire,
    },
  });
  await seedAssessmentAnswers(prisma, {
    tenantId,
    assessmentId: assessmentB.id,
    answerSource: "AI",
    confidence: 0.62,
    values: assessmentBValues,
  });

  const systemC = await prisma.aiSystem.upsert({
    where: { id: `seed_${scopePrefix}_ai_system_fraud_detection` },
    create: {
      id: `seed_${scopePrefix}_ai_system_fraud_detection`,
      tenantId,
      name: "Fraud Detection AI",
      description: "Sentetik fraud tespit senaryosu.",
      purpose: "fraud detection",
      providerType: "INTERNAL",
      status: "ACTIVE",
      createdByUserId,
    },
    update: {
      tenantId,
      description: "Sentetik fraud tespit senaryosu.",
      purpose: "fraud detection",
      providerType: "INTERNAL",
      status: "ACTIVE",
      createdByUserId,
    },
  });
  const assessmentCValues = {
    q_ai_used: false,
    q_ai_purpose: "other",
    q_personal_data: false,
    q_sensitive_data: false,
    q_automated_decision: false,
    q_human_oversight: true,
    q_employment_context: false,
    q_biometric_identification: false,
    q_safety_critical: false,
    q_provider_documentation: true,
  } satisfies Record<(typeof AI_ACT_QUESTION_KEYS)[number], Prisma.InputJsonValue>;
  const assessmentC = await prisma.aiAssessment.upsert({
    where: { id: `seed_${scopePrefix}_ai_assessment_fraud_detection_v1` },
    create: {
      id: `seed_${scopePrefix}_ai_assessment_fraud_detection_v1`,
      tenantId,
      aiSystemId: systemC.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "MINIMAL",
      classificationSource: "HYBRID",
      confidence: 0.9,
      createdByUserId,
      questionnaire: assessmentCValues,
    },
    update: {
      tenantId,
      aiSystemId: systemC.id,
      version: 1,
      status: "COMPLETED",
      riskLevel: "MINIMAL",
      classificationSource: "HYBRID",
      confidence: 0.9,
      createdByUserId,
      questionnaire: assessmentCValues,
    },
  });
  await seedAssessmentAnswers(prisma, {
    tenantId,
    assessmentId: assessmentC.id,
    answerSource: "AI",
    confidence: 0.9,
    values: assessmentCValues,
  });

  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_transparency_notice` },
    create: {
      id: `seed_${scopePrefix}_obl_transparency_notice`,
      tenantId,
      aiSystemId: systemA.id,
      obligationType: "transparency_notice",
      status: "PENDING",
      source: "RULE_ENGINE",
    },
    update: { tenantId, aiSystemId: systemA.id, status: "PENDING" },
  });
  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_user_information` },
    create: {
      id: `seed_${scopePrefix}_obl_user_information`,
      tenantId,
      aiSystemId: systemA.id,
      obligationType: "user_information",
      status: "IN_PROGRESS",
      source: "MANUAL",
    },
    update: { tenantId, aiSystemId: systemA.id, status: "IN_PROGRESS" },
  });
  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_risk_management` },
    create: {
      id: `seed_${scopePrefix}_obl_risk_management`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "risk_management",
      status: "PENDING",
      source: "RULE_ENGINE",
    },
    update: { tenantId, aiSystemId: systemB.id, status: "PENDING" },
  });
  const oblHumanOversight = await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_human_oversight` },
    create: {
      id: `seed_${scopePrefix}_obl_human_oversight`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "human_oversight",
      status: "PENDING",
      source: "RULE_ENGINE",
    },
    update: { tenantId, aiSystemId: systemB.id, status: "PENDING" },
  });
  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_logging` },
    create: {
      id: `seed_${scopePrefix}_obl_logging`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "logging",
      status: "IN_PROGRESS",
      source: "AI",
    },
    update: { tenantId, aiSystemId: systemB.id, status: "IN_PROGRESS" },
  });
  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_data_governance` },
    create: {
      id: `seed_${scopePrefix}_obl_data_governance`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "data_governance",
      status: "PENDING",
      source: "MANUAL",
    },
    update: { tenantId, aiSystemId: systemB.id, status: "PENDING" },
  });
  await prisma.aiObligation.upsert({
    where: { id: `seed_${scopePrefix}_obl_provider_documentation_fraud` },
    create: {
      id: `seed_${scopePrefix}_obl_provider_documentation_fraud`,
      tenantId,
      aiSystemId: systemC.id,
      obligationType: "provider_documentation",
      status: "PENDING",
      source: "MANUAL",
    },
    update: { tenantId, aiSystemId: systemC.id, status: "PENDING" },
  });

  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_chatbot_notice` },
    create: {
      id: `seed_${scopePrefix}_task_chatbot_notice`,
      tenantId,
      aiSystemId: systemA.id,
      obligationType: "transparency_notice",
      title: "Add chatbot transparency notice",
      description: "Musteri arayuzunde sentetik chatbot bildirimi ekle.",
      priority: "MEDIUM",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId, obligationType: "transparency_notice" },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_vendor_terms` },
    create: {
      id: `seed_${scopePrefix}_task_vendor_terms`,
      tenantId,
      aiSystemId: systemA.id,
      obligationType: "user_information",
      title: "Review vendor terms",
      description: "Vendor AI sartlarini legal checklist ile incele.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assignedToUserId: createdByUserId,
    },
    update: { status: "IN_PROGRESS", assignedToUserId: createdByUserId, obligationType: "user_information" },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_human_oversight` },
    create: {
      id: `seed_${scopePrefix}_task_human_oversight`,
      tenantId,
      aiSystemId: systemB.id,
      obligationId: oblHumanOversight.id,
      obligationType: "human_oversight",
      title: "Define human oversight process",
      description: "Dunya verisi kullanmadan synthetic review adimlarini tanimla.",
      priority: "HIGH",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId, obligationType: "human_oversight" },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_data_governance` },
    create: {
      id: `seed_${scopePrefix}_task_data_governance`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "data_governance",
      title: "Review data governance controls",
      description: "Feature icin data governance kontrollerini dogrula.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      assignedToUserId: createdByUserId,
    },
    update: { status: "IN_PROGRESS", assignedToUserId: createdByUserId, obligationType: "data_governance" },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_provider_docs` },
    create: {
      id: `seed_${scopePrefix}_task_provider_docs`,
      tenantId,
      aiSystemId: systemB.id,
      obligationType: "provider_documentation",
      title: "Collect provider documentation",
      description: "Provider kaynakli synthetic sozlesme/policy dokumanlarini ekle.",
      priority: "MEDIUM",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId, obligationType: "provider_documentation" },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_fraud_provider_docs` },
    create: {
      id: `seed_${scopePrefix}_task_fraud_provider_docs`,
      tenantId,
      aiSystemId: systemC.id,
      obligationType: "provider_documentation",
      title: "Validate fraud model documentation",
      description: "Fraud Detection AI icin model card ve governance notlarini guncelle.",
      priority: "MEDIUM",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId, obligationType: "provider_documentation" },
  });

  const docs = [
    {
      id: `seed_${scopePrefix}_doc_receipt_001`,
      aiSystemId: systemA.id,
      title: "Synthetic receipt example",
      sourceType: "ocr",
      extractedText: "Synthetic receipt total 42.50 EUR; date 2026-04-10.",
      embeddingRef: `qdrant:${scopePrefix}:receipt:001`,
      relationType: "OTHER" as const,
    },
    {
      id: `seed_${scopePrefix}_doc_invoice_001`,
      aiSystemId: systemA.id,
      title: "Synthetic invoice example",
      sourceType: "ocr",
      extractedText: "Synthetic invoice amount 1,250.00 EUR; vendor DemoVendor GmbH.",
      embeddingRef: `qdrant:${scopePrefix}:invoice:001`,
      relationType: "VENDOR_DOC" as const,
    },
    {
      id: `seed_${scopePrefix}_doc_contract_001`,
      aiSystemId: systemB.id,
      title: "Synthetic contract example",
      sourceType: "upload",
      extractedText: "Synthetic contract clauses for employee scoring pilot.",
      embeddingRef: `qdrant:${scopePrefix}:contract:001`,
      relationType: "CONTRACT" as const,
    },
    {
      id: `seed_${scopePrefix}_doc_policy_001`,
      aiSystemId: systemB.id,
      title: "Synthetic policy example",
      sourceType: "upload",
      extractedText: "Synthetic policy for human oversight and incident handling.",
      embeddingRef: `qdrant:${scopePrefix}:policy:001`,
      relationType: "POLICY" as const,
    },
  ];

  for (const row of docs) {
    const aiDocument = await prisma.aiDocument.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        tenantId,
        aiSystemId: row.aiSystemId,
        title: row.title,
        sourceType: row.sourceType,
        extractedText: row.extractedText,
        embeddingRef: row.embeddingRef,
      },
      update: {
        tenantId,
        aiSystemId: row.aiSystemId,
        title: row.title,
        sourceType: row.sourceType,
        extractedText: row.extractedText,
        embeddingRef: row.embeddingRef,
      },
    });

    await prisma.aiDocumentLink.upsert({
      where: {
        aiSystemId_documentId_relationType: {
          aiSystemId: row.aiSystemId,
          documentId: aiDocument.id,
          relationType: row.relationType,
        },
      },
      create: {
        id: `seed_${scopePrefix}_doc_link_${aiDocument.id}`,
        tenantId,
        aiSystemId: row.aiSystemId,
        documentId: aiDocument.id,
        relationType: row.relationType,
      },
      update: { tenantId },
    });

    await prisma.aiDocumentJob.upsert({
      where: { id: `seed_${scopePrefix}_job_${aiDocument.id}` },
      create: {
        id: `seed_${scopePrefix}_job_${aiDocument.id}`,
        tenantId,
        documentId: aiDocument.id,
        jobType: "document_extraction",
        status: "completed",
        modelName: "synthetic-ocr-llm",
        modelVersion: "seed-v1",
        promptVersion: "seed-prompt-v1",
        startedAt: new Date("2026-04-10T09:00:00.000Z"),
        completedAt: new Date("2026-04-10T09:00:30.000Z"),
      },
      update: {
        tenantId,
        documentId: aiDocument.id,
        status: "completed",
      },
    });
    const extraction = await prisma.aiExtraction.upsert({
      where: { id: `seed_${scopePrefix}_extraction_${aiDocument.id}` },
      create: {
        id: `seed_${scopePrefix}_extraction_${aiDocument.id}`,
        tenantId,
        documentId: aiDocument.id,
        aiSystemId: row.aiSystemId,
        extractionSchema: "v1.ai_document",
        extractedJson: {
          documentType: row.title,
          status: aiDocument.id.includes("contract") ? "needs_review" : "ok",
        },
        confidence: aiDocument.id.includes("contract") ? 0.41 : 0.88,
        requiresReview: aiDocument.id.includes("contract") || aiDocument.id.includes("policy"),
      },
      update: {
        tenantId,
        documentId: aiDocument.id,
        aiSystemId: row.aiSystemId,
        confidence: aiDocument.id.includes("contract") ? 0.41 : 0.88,
        requiresReview: aiDocument.id.includes("contract") || aiDocument.id.includes("policy"),
      },
    });
    if (extraction.requiresReview) {
      await prisma.aiReview.upsert({
        where: { id: `seed_${scopePrefix}_review_${aiDocument.id}` },
        create: {
          id: `seed_${scopePrefix}_review_${aiDocument.id}`,
          tenantId,
          extractionId: extraction.id,
          reviewedByUserId: createdByUserId,
          correctedJson: { correction: "manual synthetic correction applied" },
          reviewStatus: "APPROVED",
        },
        update: {
          correctedJson: { correction: "manual synthetic correction applied" },
          reviewStatus: "APPROVED",
        },
      });
    }
    await prisma.aiEmbedding.upsert({
      where: { id: `seed_${scopePrefix}_embedding_${aiDocument.id}` },
      create: {
        id: `seed_${scopePrefix}_embedding_${aiDocument.id}`,
        tenantId,
        documentId: aiDocument.id,
        aiSystemId: row.aiSystemId,
        chunkIndex: 0,
        vectorRef: row.embeddingRef ?? `qdrant:${scopePrefix}:doc:${aiDocument.id}`,
        metadata: { tenantId, documentId: aiDocument.id, synthetic: true },
      },
      update: {
        vectorRef: row.embeddingRef ?? `qdrant:${scopePrefix}:doc:${aiDocument.id}`,
        metadata: { tenantId, documentId: aiDocument.id, synthetic: true },
      },
    });
  }

  await prisma.aiEvidence.upsert({
    where: { id: `seed_${scopePrefix}_evidence_note_001` },
    create: {
      id: `seed_${scopePrefix}_evidence_note_001`,
      tenantId,
      aiSystemId: systemA.id,
      type: "NOTE",
      metadata: { note: "Synthetic evidence note for transparency_notice." },
    },
    update: { metadata: { note: "Synthetic evidence note for transparency_notice." } },
  });
  await prisma.aiEvidence.upsert({
    where: { id: `seed_${scopePrefix}_evidence_link_001` },
    create: {
      id: `seed_${scopePrefix}_evidence_link_001`,
      tenantId,
      aiSystemId: systemB.id,
      type: "LINK",
      metadata: { url: "https://example.invalid/synthetic-provider-docs" },
    },
    update: { metadata: { url: "https://example.invalid/synthetic-provider-docs" } },
  });
}

async function seedAssessmentAnswers(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    assessmentId: string;
    values: Record<AiActQuestionKey, Prisma.InputJsonValue>;
    answerSource: "USER" | "AI";
    confidence: number;
  },
): Promise<void> {
  const { tenantId, assessmentId, values, answerSource, confidence } = input;
  for (const questionKey of AI_ACT_QUESTION_KEYS) {
    const answerValue = values[questionKey];
    await prisma.aiAssessmentAnswer.upsert({
      where: {
        assessmentId_questionKey: {
          assessmentId,
          questionKey,
        },
      },
      create: {
        id: `seed_${assessmentId}_${questionKey}`,
        tenantId,
        assessmentId,
        questionKey,
        answerValue,
        answerSource,
        confidence,
      },
      update: {
        answerValue,
        answerSource,
        confidence,
      },
    });
  }
}

async function assertAiSeedConsistency(prisma: PrismaClient, tenantId: string): Promise<void> {
  const systemsWithoutTenant = await prisma.aiSystem.count({
    where: { tenantId: "" },
  });
  if (systemsWithoutTenant > 0) {
    throw new Error("seed_ai_system_without_tenant");
  }
  const assessmentsCrossTenant = await prisma.aiAssessment.count({
    where: {
      tenantId,
      aiSystem: {
        tenantId: { not: tenantId },
      },
    },
  });
  if (assessmentsCrossTenant > 0) {
    throw new Error("seed_ai_assessment_cross_tenant");
  }
  const tasksCrossTenant = await prisma.aiTask.count({
    where: {
      tenantId,
      aiSystem: {
        tenantId: { not: tenantId },
      },
    },
  });
  if (tasksCrossTenant > 0) {
    throw new Error("seed_ai_task_cross_tenant");
  }
  const obligationsCrossTenant = await prisma.aiObligation.count({
    where: {
      tenantId,
      aiSystem: {
        tenantId: { not: tenantId },
      },
    },
  });
  if (obligationsCrossTenant > 0) {
    throw new Error("seed_ai_obligation_cross_tenant");
  }
  const answersCrossTenant = await prisma.aiAssessmentAnswer.count({
    where: {
      tenantId,
      assessment: {
        tenantId: { not: tenantId },
      },
    },
  });
  if (answersCrossTenant > 0) {
    throw new Error("seed_ai_answer_cross_tenant");
  }
}
