import { prisma } from "./prisma.js";
import type { LoyaltyDomainEventType } from "../generated/prisma/client.js";
import { sendRetentionMessage } from "./messaging/send-retention-message.js";

/** MVP sabitleri — ileride tenant config veya Campaign ile değiştirilebilir */
export const INACTIVITY_DAYS = 7;
export const REWARD_PROXIMITY_POINTS = 20;
const PROXIMITY_COOLDOWN_HOURS = 24;
const INACTIVITY_ACTION_COOLDOWN_DAYS = 7;

export const ACTION_TYPES = {
  INACTIVITY: "inactivity_nudge",
  FIRST_VISIT_FOLLOWUP: "first_visit_followup",
  REWARD_PROXIMITY: "reward_proximity",
} as const;

async function appendDomainEvent(
  tenantId: string,
  customerId: string,
  type: LoyaltyDomainEventType,
  payload: Record<string, unknown>,
) {
  return prisma.loyaltyDomainEvent.create({
    data: {
      tenantId,
      customerId,
      type,
      payload: payload as object,
    },
  });
}

async function tenantDisplayName(tenantId: string): Promise<string> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return t?.name ?? "İşletme";
}

export async function listTenantCustomerActions(
  tenantId: string,
  take = 100,
) {
  return prisma.customerAction.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 500),
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}

export async function listCustomerActionsForCustomer(
  tenantId: string,
  customerId: string,
  take = 50,
) {
  return prisma.customerAction.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 200),
  });
}

async function hasRecentAction(
  tenantId: string,
  customerId: string,
  type: string,
  since: Date,
): Promise<boolean> {
  const n = await prisma.customerAction.count({
    where: {
      tenantId,
      customerId,
      type,
      createdAt: { gte: since },
    },
  });
  return n > 0;
}

/** Ziyaret kaydı sonrası — transaction dışından çağrılır */
export async function processVisitCreatedAutomation(input: {
  tenantId: string;
  customerId: string;
  visitId: string;
  priorVisitCount: number;
  pointsEarned: number;
}): Promise<void> {
  const { tenantId, customerId, visitId, priorVisitCount, pointsEarned } = input;
  await appendDomainEvent(tenantId, customerId, "visit_created", {
    visitId,
    priorVisitCount,
    pointsEarned,
  });

  const storeName = await tenantDisplayName(tenantId);

  if (priorVisitCount === 0) {
    const existing = await prisma.customerAction.findFirst({
      where: { tenantId, customerId, type: ACTION_TYPES.FIRST_VISIT_FOLLOWUP },
    });
    if (!existing) {
      await sendRetentionMessage({
        tenantId,
        customerId,
        actionType: ACTION_TYPES.FIRST_VISIT_FOLLOWUP,
        templateKey: "DAY_1_REMINDER",
        templateData: { storeName },
        fallbackMessage:
          "İlk ziyaretiniz için teşekkürler — bir sonraki gelişinizi dört gözle bekliyoruz.",
      });
    }
  }

  const account = await prisma.loyaltyAccount.findFirst({
    where: { customerId, tenantId },
  });
  const balance = account?.pointsBalance ?? 0;
  const rewards = await prisma.reward.findMany({
    where: { tenantId, isActive: true },
    orderBy: { pointsCost: "asc" },
  });

  const near = rewards.find(
    (r) => balance < r.pointsCost && r.pointsCost - balance <= REWARD_PROXIMITY_POINTS,
  );
  if (near) {
    const since = new Date(
      Date.now() - PROXIMITY_COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    const dup = await hasRecentAction(
      tenantId,
      customerId,
      ACTION_TYPES.REWARD_PROXIMITY,
      since,
    );
    if (!dup) {
      const gap = near.pointsCost - balance;
      await sendRetentionMessage({
        tenantId,
        customerId,
        actionType: ACTION_TYPES.REWARD_PROXIMITY,
        templateKey: "REWARD_UNLOCKED",
        templateData: {
          storeName,
          rewardName: near.name,
          remaining: gap,
        },
        fallbackMessage: `"${near.name}" ödülüne ${gap} puan kaldı.`,
      });
    }
  }
}

/** Ödül talebi / kasa anında kullanım sonrası */
export async function processRewardClaimedAutomation(input: {
  tenantId: string;
  customerId: string;
  rewardId: string;
  rewardName: string;
  source: "customer_claim" | "staff_redeem";
  redemptionId: string;
}): Promise<void> {
  const { tenantId, customerId, rewardId, rewardName, source, redemptionId } = input;
  await appendDomainEvent(tenantId, customerId, "reward_claimed", {
    rewardId,
    rewardName,
    source,
    redemptionId,
  });

  const storeName = await tenantDisplayName(tenantId);
  const account = await prisma.loyaltyAccount.findFirst({
    where: { customerId, tenantId },
  });
  const balance = account?.pointsBalance ?? 0;
  const rewards = await prisma.reward.findMany({
    where: { tenantId, isActive: true },
    orderBy: { pointsCost: "asc" },
  });
  const near = rewards.find(
    (r) => balance < r.pointsCost && r.pointsCost - balance <= REWARD_PROXIMITY_POINTS,
  );
  if (near) {
    const since = new Date(
      Date.now() - PROXIMITY_COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    const dup = await hasRecentAction(
      tenantId,
      customerId,
      ACTION_TYPES.REWARD_PROXIMITY,
      since,
    );
    if (!dup) {
      const gap = near.pointsCost - balance;
      await sendRetentionMessage({
        tenantId,
        customerId,
        actionType: ACTION_TYPES.REWARD_PROXIMITY,
        templateKey: "REWARD_UNLOCKED",
        templateData: {
          storeName,
          rewardName: near.name,
          remaining: gap,
        },
        fallbackMessage: `"${near.name}" ödülüne ${gap} puan kaldı.`,
      });
    }
  }
}

/** Cron veya manuel — son ziyareti 7+ gün önce olan müşteriler */
export async function scanInactivityAndAct(tenantId: string): Promise<{
  scanned: number;
  actionsCreated: number;
}> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - INACTIVITY_DAYS);

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      visitCount: { gt: 0 },
      lastVisitAt: { lte: cutoff },
    },
    select: { id: true, lastVisitAt: true },
  });

  let actionsCreated = 0;
  const cooldownSince = new Date();
  cooldownSince.setUTCDate(
    cooldownSince.getUTCDate() - INACTIVITY_ACTION_COOLDOWN_DAYS,
  );

  const storeName = await tenantDisplayName(tenantId);

  for (const c of customers) {
    if (c.lastVisitAt && c.lastVisitAt > cutoff) continue;

    const recent = await hasRecentAction(
      tenantId,
      c.id,
      ACTION_TYPES.INACTIVITY,
      cooldownSince,
    );
    if (recent) continue;

    await appendDomainEvent(tenantId, c.id, "inactivity_detected", {
      lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
      cutoff: cutoff.toISOString(),
    });
    await sendRetentionMessage({
      tenantId,
      customerId: c.id,
      actionType: ACTION_TYPES.INACTIVITY,
      templateKey: "DAY_7_WINBACK",
      templateData: { storeName, days: INACTIVITY_DAYS },
      fallbackMessage: `${INACTIVITY_DAYS} gündür görüşemedik — uğramayı unutmayın, puanlar sizi bekliyor.`,
    });
    actionsCreated += 1;
  }

  return { scanned: customers.length, actionsCreated };
}
