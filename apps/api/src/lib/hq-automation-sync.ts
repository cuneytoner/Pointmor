import { prisma } from "./prisma.js";
import { FEATURE, getTenantEntitlementContext } from "./entitlement-service.js";
import {
  AUTOMATION_MODE,
  AUTOMATION_STATUS,
  countAutomationActionsToday,
  createAutomationAction,
  executeAutomationActionById,
  getOrCreateAutomationSettings,
  lastAutomationForCooldown,
} from "./hq-automation-service.js";
import { mapHqInsightToAutomationCandidate } from "./hq-automation-rules.js";

/**
 * Üretilmiş HQ insight’larından otomasyon satırları türetir (idempotent + güvenlik).
 * `suggest_only` modunda kayıt oluşturulmaz.
 */
export async function syncHqAutomationFromInsights(tenantId: string): Promise<{
  created: number;
  skipped: number;
}> {
  let created = 0;
  let skipped = 0;

  const ent = await getTenantEntitlementContext(tenantId);
  if (!ent.features.has(FEATURE.HQ_AUTOMATION)) {
    return { created: 0, skipped: 0 };
  }
  if (!ent.features.has(FEATURE.HQ_AI_INSIGHTS)) {
    return { created: 0, skipped: 0 };
  }

  const settings = await getOrCreateAutomationSettings(tenantId);
  if (settings.mode === AUTOMATION_MODE.SUGGEST_ONLY) {
    return { created: 0, skipped: 0 };
  }

  const todayCount = await countAutomationActionsToday(tenantId);
  const maxDay = settings.maxActionsPerDay;

  const insights = await prisma.hqInsight.findMany({
    where: { tenantId, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      branchId: true,
      message: true,
      dedupeKey: true,
    },
  });

  for (const ins of insights) {
    if (todayCount + created >= maxDay) break;

    const candidate = mapHqInsightToAutomationCandidate({
      id: ins.id,
      type: ins.type,
      branchId: ins.branchId,
      message: ins.message,
    });
    if (!candidate) {
      skipped += 1;
      continue;
    }

    const exists = await prisma.hqAutomationAction.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey: candidate.idempotencyKey,
        },
      },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const last = await lastAutomationForCooldown(tenantId, candidate.ruleKey, ins.branchId);
    if (last) {
      const elapsedMin = (Date.now() - last.createdAt.getTime()) / 60000;
      if (elapsedMin < settings.cooldownMinutes) {
        skipped += 1;
        continue;
      }
    }

    const row = await createAutomationAction({
      tenantId,
      branchId: ins.branchId,
      triggerType: candidate.triggerType,
      ruleKey: candidate.ruleKey,
      actionType: candidate.actionType,
      idempotencyKey: candidate.idempotencyKey,
      payload: candidate.payload,
      hqInsightId: ins.id,
      initialStatus: AUTOMATION_STATUS.PENDING,
    });
    created += 1;

    if (settings.mode === AUTOMATION_MODE.AUTO_APPLY) {
      const exec = await executeAutomationActionById(row.id);
      if (!exec.ok) {
        skipped += 1;
      }
    }
  }

  return { created, skipped };
}
