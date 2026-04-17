import { AuditEntityType } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { resolvePlanForTenant } from "./entitlement-service.js";
import {
  clampRetentionDays,
  defaultRetentionDaysForTier,
  getRetentionFieldLimitsForTier,
  retentionTierFromPlan,
  validateRetentionDaysForTier,
  type RetentionCommercialTier,
} from "./retention-plan-tier.js";
import { recordAuditEvent } from "./operational-audit-service.js";
import type { TenantRetentionUpdateInput } from "./tenant-retention-input.js";

export type { TenantRetentionUpdateInput };

export type TenantRetentionResolved = {
  tier: RetentionCommercialTier;
  /** free katmanında UI düzenlenemez */
  canCustomize: boolean;
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
  limits: ReturnType<typeof getRetentionFieldLimitsForTier>;
};

async function loadTier(tenantId: string): Promise<RetentionCommercialTier> {
  const plan = await resolvePlanForTenant(tenantId);
  if (!plan) return "free";
  return retentionTierFromPlan(plan);
}

/**
 * Plan + DB satırı ile efektif günler (plan düşürmede clamp).
 */
export async function resolveTenantRetention(tenantId: string): Promise<TenantRetentionResolved> {
  const tier = await loadTier(tenantId);
  const canCustomize = tier !== "free";
  const limits = getRetentionFieldLimitsForTier(tier);
  const defaults = defaultRetentionDaysForTier(tier);

  const row = await prisma.tenantRetentionSettings.findUnique({
    where: { tenantId },
  });

  const base = row
    ? {
        operationalAuditDays: row.operationalAuditDays,
        exportAuditDays: row.exportAuditDays,
        messagingDays: row.messagingDays,
        anomalyDays: row.anomalyDays,
      }
    : defaults;

  return {
    tier,
    canCustomize,
    limits,
    operationalAuditDays: clampRetentionDays("operationalAudit", tier, base.operationalAuditDays),
    exportAuditDays: clampRetentionDays("exportAudit", tier, base.exportAuditDays),
    messagingDays: clampRetentionDays("messaging", tier, base.messagingDays),
    anomalyDays: clampRetentionDays("anomaly", tier, base.anomalyDays),
  };
}

/** Cleanup job — kiracı başına tek kaynak. */
export async function getEffectiveDaysForTenantCleanup(tenantId: string): Promise<{
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
}> {
  const r = await resolveTenantRetention(tenantId);
  return {
    operationalAuditDays: r.operationalAuditDays,
    exportAuditDays: r.exportAuditDays,
    messagingDays: r.messagingDays,
    anomalyDays: r.anomalyDays,
  };
}

export async function updateTenantRetentionSettings(params: {
  tenantId: string;
  actorUserId: string;
  input: TenantRetentionUpdateInput;
}): Promise<TenantRetentionResolved | { error: string; field?: string }> {
  const tier = await loadTier(params.tenantId);
  if (tier === "free") {
    return { error: "retention_read_only_plan" };
  }

  const v = validateRetentionDaysForTier(tier, params.input);
  if (!v.ok) {
    return { error: v.error, field: v.field };
  }

  const before = await resolveTenantRetention(params.tenantId);

  await prisma.tenantRetentionSettings.upsert({
    where: { tenantId: params.tenantId },
    create: {
      tenantId: params.tenantId,
      operationalAuditDays: params.input.operationalAuditDays,
      exportAuditDays: params.input.exportAuditDays,
      messagingDays: params.input.messagingDays,
      anomalyDays: params.input.anomalyDays,
    },
    update: {
      operationalAuditDays: params.input.operationalAuditDays,
      exportAuditDays: params.input.exportAuditDays,
      messagingDays: params.input.messagingDays,
      anomalyDays: params.input.anomalyDays,
    },
  });

  const after = await resolveTenantRetention(params.tenantId);

  await recordAuditEvent({
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    actorType: "manager",
    branchId: null,
    deviceSessionId: null,
    cashierShiftId: null,
    eventType: "RETENTION_UPDATED",
    entityType: AuditEntityType.other,
    entityId: params.tenantId,
    payload: {
      before: {
        operationalAuditDays: before.operationalAuditDays,
        exportAuditDays: before.exportAuditDays,
        messagingDays: before.messagingDays,
        anomalyDays: before.anomalyDays,
      },
      after: {
        operationalAuditDays: after.operationalAuditDays,
        exportAuditDays: after.exportAuditDays,
        messagingDays: after.messagingDays,
        anomalyDays: after.anomalyDays,
      },
    },
  });

  return after;
}
