import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import type { SessionPayload } from "./auth-memory.js";
import { branchScopeFromSession } from "./branch-scope.js";
import { resolveTenantAppRole } from "./tenant-app-role.js";
import { createCampaign } from "./loyalty-service.js";
import { recordAuditEvent } from "./operational-audit-service.js";
import { assertFeature, FEATURE, getTenantEntitlementContext } from "./entitlement-service.js";

export const AUTOMATION_MODE = {
  SUGGEST_ONLY: "suggest_only",
  APPROVAL_REQUIRED: "approval_required",
  AUTO_APPLY: "auto_apply",
} as const;

export const AUTOMATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export function automationActionWhereForSession(
  tenantId: string,
  session: SessionPayload,
): Prisma.HqAutomationActionWhereInput {
  const base: Prisma.HqAutomationActionWhereInput = { tenantId };
  const scope = branchScopeFromSession(session);
  if (scope === "all") return base;
  if (scope.restrictedTo.length === 0) {
    return { ...base, id: { in: [] } };
  }
  return {
    ...base,
    OR: [{ branchId: null }, { branchId: { in: scope.restrictedTo } }],
  };
}

export async function getOrCreateAutomationSettings(tenantId: string) {
  const existing = await prisma.tenantAutomationSettings.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;
  return prisma.tenantAutomationSettings.create({
    data: {
      tenantId,
      mode: AUTOMATION_MODE.APPROVAL_REQUIRED,
      maxActionsPerDay: 5,
      cooldownMinutes: 360,
    },
  });
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function countAutomationActionsToday(tenantId: string): Promise<number> {
  const start = utcDayStart(new Date());
  return prisma.hqAutomationAction.count({
    where: {
      tenantId,
      createdAt: { gte: start },
      status: { in: [AUTOMATION_STATUS.PENDING, AUTOMATION_STATUS.APPROVED, AUTOMATION_STATUS.COMPLETED] },
    },
  });
}

export async function lastAutomationForCooldown(
  tenantId: string,
  ruleKey: string,
  branchId: string | null,
): Promise<{ createdAt: Date } | null> {
  return prisma.hqAutomationAction.findFirst({
    where: {
      tenantId,
      ruleKey,
      branchId: branchId ?? null,
      status: {
        in: [
          AUTOMATION_STATUS.PENDING,
          AUTOMATION_STATUS.APPROVED,
          AUTOMATION_STATUS.COMPLETED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
}

export async function createAutomationAction(input: {
  tenantId: string;
  branchId: string | null;
  triggerType: string;
  ruleKey: string;
  actionType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  hqInsightId?: string | null;
  initialStatus: string;
}): Promise<{ id: string }> {
  const row = await prisma.hqAutomationAction.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      triggerType: input.triggerType,
      ruleKey: input.ruleKey,
      actionType: input.actionType,
      status: input.initialStatus,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload as object,
      hqInsightId: input.hqInsightId ?? null,
      source: "rule_engine",
    },
  });
  return { id: row.id };
}

export async function executeAutomationActionById(actionId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const action = await prisma.hqAutomationAction.findFirst({
    where: { id: actionId },
  });
  if (!action) return { ok: false, error: "not_found" };
  if (action.status !== AUTOMATION_STATUS.APPROVED && action.status !== AUTOMATION_STATUS.PENDING) {
    return { ok: false, error: "invalid_status" };
  }

  const tenantId = action.tenantId;

  try {
    if (action.actionType === "create_campaign") {
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.CAMPAIGNS);
      } catch {
        await prisma.hqAutomationAction.update({
          where: { id: actionId },
          data: {
            status: AUTOMATION_STATUS.FAILED,
            errorMessage: "plan_feature_campaigns",
            executedAt: new Date(),
          },
        });
        return { ok: false, error: "plan_feature_campaigns" };
      }
      const nameBase =
        typeof action.payload === "object" && action.payload !== null && "message" in action.payload
          ? String((action.payload as { message?: string }).message ?? "").slice(0, 48)
          : action.ruleKey;
      const campaign = await createCampaign(tenantId, {
        name: `Auto: ${nameBase || action.ruleKey}`,
        type: "BONUS_POINTS",
        status: "draft",
        config: { points: 50 },
        isActive: false,
        branchId: action.branchId ?? undefined,
      });
      await prisma.hqAutomationAction.update({
        where: { id: actionId },
        data: {
          status: AUTOMATION_STATUS.COMPLETED,
          executedAt: new Date(),
          result: { campaignId: campaign.id, automation: true } as object,
        },
      });
      await recordAuditEvent({
        tenantId,
        actorType: "system",
        eventType: "hq_automation.campaign_created",
        entityType: "campaign",
        entityId: campaign.id,
        payload: { automationActionId: action.id, aiTriggered: true },
      });
      return { ok: true };
    }

    if (action.actionType === "messaging_send") {
      await recordAuditEvent({
        tenantId,
        actorType: "system",
        eventType: "hq_automation.messaging_recommendation",
        entityType: "other",
        entityId: action.id,
        payload: {
          automation: true,
          aiTriggered: true,
          ruleKey: action.ruleKey,
          note: "Mesaj içeriği ayrıca kampanya/mesajlaşma ekranından tamamlanmalı.",
          payload: action.payload,
        },
      });
      await prisma.hqAutomationAction.update({
        where: { id: actionId },
        data: {
          status: AUTOMATION_STATUS.COMPLETED,
          executedAt: new Date(),
          result: { auditLogged: true, automation: true } as object,
        },
      });
      return { ok: true };
    }

    if (action.actionType === "config_update") {
      await recordAuditEvent({
        tenantId,
        actorType: "system",
        eventType: "hq_automation.config_review_suggestion",
        entityType: "other",
        entityId: action.id,
        payload: {
          automation: true,
          aiTriggered: true,
          ruleKey: action.ruleKey,
          payload: action.payload,
        },
      });
      await prisma.hqAutomationAction.update({
        where: { id: actionId },
        data: {
          status: AUTOMATION_STATUS.COMPLETED,
          executedAt: new Date(),
          result: { auditLogged: true, automation: true } as object,
        },
      });
      return { ok: true };
    }

    await prisma.hqAutomationAction.update({
      where: { id: actionId },
      data: {
        status: AUTOMATION_STATUS.FAILED,
        errorMessage: "unknown_action_type",
        executedAt: new Date(),
      },
    });
    return { ok: false, error: "unknown_action_type" };
  } catch (e) {
    await prisma.hqAutomationAction.update({
      where: { id: actionId },
      data: {
        status: AUTOMATION_STATUS.FAILED,
        errorMessage: (e as Error).message ?? "execute_error",
        executedAt: new Date(),
      },
    });
    return { ok: false, error: (e as Error).message };
  }
}

export async function approveAutomationAction(
  tenantId: string,
  session: SessionPayload,
  actionId: string,
): Promise<{ ok: true } | { error: string }> {
  const role = resolveTenantAppRole(session);
  if (role === "staff" || role === "viewer") return { error: "forbidden" };

  const action = await prisma.hqAutomationAction.findFirst({
    where: {
      id: actionId,
      tenantId,
      ...automationActionWhereForSession(tenantId, session),
      status: AUTOMATION_STATUS.PENDING,
    },
  });
  if (!action) return { error: "not_found" };

  const uid = session.user.id;
  await prisma.hqAutomationAction.update({
    where: { id: actionId },
    data: {
      status: AUTOMATION_STATUS.APPROVED,
      reviewedAt: new Date(),
      reviewedByUserId: uid,
    },
  });

  const exec = await executeAutomationActionById(actionId);
  if (!exec.ok) {
    return { error: exec.error ?? "execute_failed" };
  }
  return { ok: true };
}

export async function rejectAutomationAction(
  tenantId: string,
  session: SessionPayload,
  actionId: string,
): Promise<{ ok: true } | { error: string }> {
  const role = resolveTenantAppRole(session);
  if (role === "staff" || role === "viewer") return { error: "forbidden" };

  const action = await prisma.hqAutomationAction.findFirst({
    where: {
      id: actionId,
      tenantId,
      ...automationActionWhereForSession(tenantId, session),
      status: AUTOMATION_STATUS.PENDING,
    },
  });
  if (!action) return { error: "not_found" };

  await prisma.hqAutomationAction.update({
    where: { id: actionId },
    data: {
      status: AUTOMATION_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
    },
  });
  return { ok: true };
}

export async function patchAutomationSettings(
  tenantId: string,
  session: SessionPayload,
  patch: Partial<{ mode: string; maxActionsPerDay: number; cooldownMinutes: number }>,
): Promise<{ ok: true } | { error: string }> {
  if (resolveTenantAppRole(session) !== "owner") return { error: "forbidden" };

  const allowedModes = new Set<string>(Object.values(AUTOMATION_MODE));
  if (patch.mode !== undefined && !allowedModes.has(patch.mode)) {
    return { error: "invalid_mode" };
  }

  await getOrCreateAutomationSettings(tenantId);
  await prisma.tenantAutomationSettings.update({
    where: { tenantId },
    data: {
      ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
      ...(patch.maxActionsPerDay !== undefined
        ? { maxActionsPerDay: Math.min(50, Math.max(1, Math.floor(patch.maxActionsPerDay))) }
        : {}),
      ...(patch.cooldownMinutes !== undefined
        ? { cooldownMinutes: Math.min(1440, Math.max(30, Math.floor(patch.cooldownMinutes))) }
        : {}),
    },
  });
  return { ok: true };
}
