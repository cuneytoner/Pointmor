import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import type { SessionPayload } from "./auth-memory.js";
import { branchScopeFromSession } from "./branch-scope.js";
import { createCampaign } from "./loyalty-service.js";
import { hasPermissionForSession } from "./tenant-permissions.js";
import { HQ_INSIGHT_ACTION } from "./hq-insight-types.js";

export function hqInsightWhereForSession(
  tenantId: string,
  session: SessionPayload,
): Prisma.HqInsightWhereInput {
  const base: Prisma.HqInsightWhereInput = {
    tenantId,
    dismissedAt: null,
  };
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

export async function upsertHqInsight(input: {
  tenantId: string;
  branchId: string | null;
  dedupeKey: string;
  type: string;
  severity: string;
  message: string;
  suggestedAction: string;
  actionKind: string;
  payload: Record<string, unknown>;
}): Promise<{ id: string; skipped?: boolean; updated?: boolean }> {
  const existing = await prisma.hqInsight.findUnique({
    where: {
      tenantId_dedupeKey: { tenantId: input.tenantId, dedupeKey: input.dedupeKey },
    },
  });
  if (existing?.dismissedAt) {
    return { id: existing.id, skipped: true };
  }
  const data = {
    type: input.type,
    severity: input.severity,
    message: input.message,
    suggestedAction: input.suggestedAction,
    actionKind: input.actionKind,
    payload: input.payload as object,
    branchId: input.branchId,
  };
  if (existing) {
    const u = await prisma.hqInsight.update({
      where: { id: existing.id },
      data,
    });
    return { id: u.id, updated: true };
  }
  const c = await prisma.hqInsight.create({
    data: {
      tenantId: input.tenantId,
      dedupeKey: input.dedupeKey,
      ...data,
    },
  });
  return { id: c.id };
}

export async function listHqInsightsForSession(tenantId: string, session: SessionPayload, take = 30) {
  return prisma.hqInsight.findMany({
    where: hqInsightWhereForSession(tenantId, session),
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      branchId: true,
      type: true,
      severity: true,
      message: true,
      suggestedAction: true,
      actionKind: true,
      payload: true,
      createdAt: true,
    },
  });
}

function canSeeInsightBranch(session: SessionPayload, branchId: string | null): boolean {
  const scope = branchScopeFromSession(session);
  if (scope === "all") return true;
  if (!branchId) return true;
  return scope.restrictedTo.includes(branchId);
}

export async function dismissHqInsight(
  tenantId: string,
  session: SessionPayload,
  insightId: string,
): Promise<{ ok: true } | { error: string }> {
  const row = await prisma.hqInsight.findFirst({
    where: { id: insightId, tenantId, dismissedAt: null },
  });
  if (!row) return { error: "not_found" };
  if (!canSeeInsightBranch(session, row.branchId)) return { error: "forbidden" };
  await prisma.hqInsight.update({
    where: { id: insightId },
    data: { dismissedAt: new Date() },
  });
  return { ok: true };
}

const NAV_PATHS: Record<string, string> = {
  [HQ_INSIGHT_ACTION.OPEN_MESSAGING]: "/app/admin/messaging",
  [HQ_INSIGHT_ACTION.OPEN_ANOMALIES]: "/app/audit",
  [HQ_INSIGHT_ACTION.OPEN_CAMPAIGNS]: "/app/campaigns",
  [HQ_INSIGHT_ACTION.OPEN_GROWTH]: "/app/growth",
  [HQ_INSIGHT_ACTION.OPEN_AUDIT]: "/app/audit",
};

export async function executeHqInsightOneClick(input: {
  tenantId: string;
  session: SessionPayload;
  insightId: string;
}): Promise<
  | { result: "campaign_created"; campaignId: string }
  | { result: "navigate"; path: string }
  | { error: string }
> {
  const row = await prisma.hqInsight.findFirst({
    where: { id: input.insightId, tenantId: input.tenantId, dismissedAt: null },
  });
  if (!row) return { error: "not_found" };
  if (!canSeeInsightBranch(input.session, row.branchId)) return { error: "forbidden" };

  const kind = row.actionKind;

  if (kind === HQ_INSIGHT_ACTION.CREATE_CAMPAIGN) {
    if (!hasPermissionForSession(input.session, "campaigns.manage")) {
      return { error: "permission_denied" };
    }
    const name =
      row.message.length > 60 ? `${row.message.slice(0, 57)}…` : row.message;
    const campaign = await createCampaign(input.tenantId, {
      name: `HQ: ${name}`,
      type: "BONUS_POINTS",
      status: "draft",
      config: { points: 50 },
      isActive: false,
      branchId: row.branchId ?? undefined,
    });
    return { result: "campaign_created", campaignId: campaign.id };
  }

  const path = NAV_PATHS[kind];
  if (!path) {
    if (kind === HQ_INSIGHT_ACTION.NONE) return { error: "no_action" };
    return { error: "invalid_action" };
  }
  return { result: "navigate", path };
}
