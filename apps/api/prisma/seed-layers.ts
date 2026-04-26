import { hashSync } from "bcryptjs";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client.js";
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

  await seedAiActMvpScenarios(prisma, {
    tenantId: demoTenantId,
    createdByUserId: demoOwnerUserId,
    scopePrefix: "demo_cafe",
  });
  await assertAiSeedConsistency(prisma, demoTenantId);
}

export function defaultDevPasswordHashes(): { admin: string; operator: string } {
  return {
    admin: hashSync("PointmorDev!Admin", 10),
    operator: hashSync("PointmorDev!Demo", 10),
  };
}

export async function seedAiActMvpScenarios(
  prisma: PrismaClient,
  input: { tenantId: string; createdByUserId: string; scopePrefix: string },
): Promise<void> {
  const { tenantId, createdByUserId, scopePrefix } = input;

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

  const assessmentAQuestionnaire: Prisma.InputJsonValue = {
    q01_customer_chat: true,
    q02_public_users: true,
    q03_decision_automation: false,
    q04_human_override: true,
    q05_sensitive_data: false,
    q06_model_monitoring: true,
    q07_explainability: true,
    q08_vendor_controls: true,
    q09_logging: true,
    q10_incident_process: true,
  };
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
    values: {
      q01_customer_chat: true,
      q02_public_users: true,
      q03_decision_automation: false,
      q04_human_override: true,
      q05_sensitive_data: false,
      q06_model_monitoring: true,
      q07_explainability: true,
      q08_vendor_controls: true,
      q09_logging: true,
      q10_incident_process: true,
    },
  });

  const systemB = await prisma.aiSystem.upsert({
    where: { id: `seed_${scopePrefix}_ai_system_performance_scoring` },
    create: {
      id: `seed_${scopePrefix}_ai_system_performance_scoring`,
      tenantId,
      name: "Employee Performance Scoring",
      description: "Sentetik review odakli yuksek risk senaryosu.",
      purpose: "employee performance analysis",
      providerType: "HYBRID",
      status: "DRAFT",
      createdByUserId,
    },
    update: {
      tenantId,
      description: "Sentetik review odakli yuksek risk senaryosu.",
      purpose: "employee performance analysis",
      providerType: "HYBRID",
      status: "DRAFT",
      createdByUserId,
    },
  });

  const assessmentBQuestionnaire: Prisma.InputJsonValue = {
    q01_employee_profiling: true,
    q02_automated_scoring: true,
    q03_hiring_or_firing_impact: "review_required",
    q04_sensitive_attributes: "unknown",
    q05_human_oversight: false,
    q06_data_quality_controls: "partial",
    q07_bias_testing: false,
    q08_vendor_documentation: "missing",
    q09_logging: "partial",
    q10_appeal_process: "review_required",
  };
  const assessmentB = await prisma.aiAssessment.upsert({
    where: { id: `seed_${scopePrefix}_ai_assessment_performance_v1` },
    create: {
      id: `seed_${scopePrefix}_ai_assessment_performance_v1`,
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
    values: {
      q01_employee_profiling: true,
      q02_automated_scoring: true,
      q03_hiring_or_firing_impact: "review_required",
      q04_sensitive_attributes: "unknown",
      q05_human_oversight: false,
      q06_data_quality_controls: "partial",
      q07_bias_testing: false,
      q08_vendor_documentation: "missing",
      q09_logging: "partial",
      q10_appeal_process: "review_required",
    },
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
  const oblRiskManagement = await prisma.aiObligation.upsert({
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
  await prisma.aiObligation.upsert({
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

  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_chatbot_notice` },
    create: {
      id: `seed_${scopePrefix}_task_chatbot_notice`,
      tenantId,
      aiSystemId: systemA.id,
      title: "Add chatbot transparency notice",
      description: "Musteri arayuzunde sentetik chatbot bildirimi ekle.",
      priority: "MEDIUM",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_vendor_terms` },
    create: {
      id: `seed_${scopePrefix}_task_vendor_terms`,
      tenantId,
      aiSystemId: systemA.id,
      title: "Review vendor terms",
      description: "Vendor AI sartlarini legal checklist ile incele.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      assignedToUserId: createdByUserId,
    },
    update: { status: "IN_PROGRESS", assignedToUserId: createdByUserId },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_human_oversight` },
    create: {
      id: `seed_${scopePrefix}_task_human_oversight`,
      tenantId,
      aiSystemId: systemB.id,
      obligationId: oblRiskManagement.id,
      title: "Define human oversight process",
      description: "Dunya verisi kullanmadan synthetic review adimlarini tanimla.",
      priority: "HIGH",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_data_governance` },
    create: {
      id: `seed_${scopePrefix}_task_data_governance`,
      tenantId,
      aiSystemId: systemB.id,
      title: "Review data governance controls",
      description: "Feature icin data governance kontrollerini dogrula.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      assignedToUserId: createdByUserId,
    },
    update: { status: "IN_PROGRESS", assignedToUserId: createdByUserId },
  });
  await prisma.aiTask.upsert({
    where: { id: `seed_${scopePrefix}_task_provider_docs` },
    create: {
      id: `seed_${scopePrefix}_task_provider_docs`,
      tenantId,
      aiSystemId: systemB.id,
      title: "Collect provider documentation",
      description: "Provider kaynakli synthetic sozlesme/policy dokumanlarini ekle.",
      priority: "MEDIUM",
      status: "OPEN",
      assignedToUserId: createdByUserId,
    },
    update: { status: "OPEN", assignedToUserId: createdByUserId },
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
    values: Record<string, Prisma.InputJsonValue>;
    answerSource: "USER" | "AI";
    confidence: number;
  },
): Promise<void> {
  const { tenantId, assessmentId, values, answerSource, confidence } = input;
  for (const [questionKey, answerValue] of Object.entries(values)) {
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
}
