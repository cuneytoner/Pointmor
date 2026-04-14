import type {
  Campaign,
  Customer,
  PointsLedgerSource,
  PointsLedgerType,
  Reward,
  RewardType,
  RewardValueType,
  RedemptionMethod,
} from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import {
  normalizeCustomerPhone,
  visitAmountToPointsEarned,
} from "./loyalty-config.js";
import { assertCampaignConfigMatchesType } from "./loyalty-campaign-config.js";
import {
  evaluateCampaignBonus,
  isCampaignRunnable,
} from "./loyalty-campaign-eval.js";

function utcDayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export type CreateCustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
};

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  const phone = normalizeCustomerPhone(input.phone);
  const name = input.name.trim();
  if (!name || !phone) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({
      data: {
        tenantId,
        name,
        phone,
        email: input.email?.trim() || null,
      },
    });
    await tx.loyaltyAccount.create({
      data: { tenantId, customerId: c.id, pointsBalance: 0 },
    });
    return c;
  });
}

export async function listCustomers(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      loyaltyAccount: { select: { pointsBalance: true } },
    },
  });
}

export type AppliedCampaignDto = {
  campaignId: string;
  name: string;
  type: Campaign["type"];
  pointsAwarded: number;
};

export type RecordVisitResult = {
  visitId: string;
  basePoints: number;
  bonusPoints: number;
  totalPointsAwarded: number;
  /** Faz 1 uyumu: toplam kazanılan puan (totalPointsAwarded ile aynı). */
  pointsEarned: number;
  appliedCampaigns: AppliedCampaignDto[];
};

export async function recordVisit(
  tenantId: string,
  customerId: string,
  amount: number,
): Promise<RecordVisitResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const amountMinor = Math.floor(amount);
  const basePoints = visitAmountToPointsEarned(amountMinor);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }

    const priorVisitCount = await tx.visit.count({
      where: { tenantId, customerId },
    });

    const campaigns = await tx.campaign.findMany({
      where: { tenantId },
      orderBy: { id: "asc" },
    });

    const runnable = campaigns.filter((c) => isCampaignRunnable(c, now));

    const evalCtx = {
      amountMinor,
      priorVisitCount,
      basePoints,
      now,
    };

    const pending: Array<{ campaign: Campaign; bonus: number }> = [];
    for (const c of runnable) {
      let bonus: number;
      try {
        bonus = evaluateCampaignBonus(c, evalCtx);
      } catch {
        const err = Object.assign(new Error("campaign_config_corrupt"), {
          statusCode: 500,
        });
        throw err;
      }
      if (bonus > 0) pending.push({ campaign: c, bonus });
    }

    const bonusTotal = pending.reduce((s, p) => s + p.bonus, 0);

    const visit = await tx.visit.create({
      data: {
        tenantId,
        customerId,
        amount: amountMinor,
        basePointsEarned: basePoints,
        bonusPointsEarned: bonusTotal,
        pointsEarned: basePoints + bonusTotal,
      },
    });

    const appliedCampaigns: AppliedCampaignDto[] = [];

    if (basePoints !== 0) {
      await tx.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          type: "earn",
          points: basePoints,
          source: "visit",
          referenceId: visit.id,
        },
      });
    }

    for (const { campaign, bonus } of pending) {
      await tx.visitCampaignApplication.create({
        data: {
          tenantId,
          visitId: visit.id,
          campaignId: campaign.id,
          pointsAwarded: bonus,
        },
      });
      appliedCampaigns.push({
        campaignId: campaign.id,
        name: campaign.name,
        type: campaign.type,
        pointsAwarded: bonus,
      });

      await tx.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          type: "earn",
          points: bonus,
          source: "campaign",
          referenceId: campaign.id,
          visitId: visit.id,
        },
      });
    }

    const total = basePoints + bonusTotal;
    if (total !== 0) {
      await tx.loyaltyAccount.update({
        where: { customerId },
        data: { pointsBalance: { increment: total } },
      });
    }

    return {
      visitId: visit.id,
      basePoints,
      bonusPoints: bonusTotal,
      totalPointsAwarded: total,
      pointsEarned: total,
      appliedCampaigns,
    };
  });
}

function validateRewardShape(input: {
  rewardType: RewardType;
  valueType: RewardValueType;
  value: number;
  redemptionMethod: RedemptionMethod;
}): void {
  const { rewardType, valueType, value } = input;
  switch (rewardType) {
    case "FREE_ITEM":
      if (valueType !== "NONE" || value !== 0) {
        const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
        throw err;
      }
      break;
    case "FIXED_DISCOUNT":
      if (valueType !== "MINOR_AMOUNT" || value <= 0) {
        const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
        throw err;
      }
      break;
    case "PERCENT_DISCOUNT":
      if (valueType !== "PERCENT_BP" || value < 1 || value > 10000) {
        const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
        throw err;
      }
      break;
    default: {
      const _e: never = rewardType;
      void _e;
    }
  }
}

export async function createReward(
  tenantId: string,
  data: {
    name: string;
    description?: string | null;
    pointsCost: number;
    isActive?: boolean;
    rewardType?: RewardType;
    valueType?: RewardValueType;
    value?: number;
    redemptionMethod?: RedemptionMethod;
  },
) {
  const name = data.name.trim();
  const cost = Math.floor(data.pointsCost);
  const rewardType = data.rewardType ?? "FREE_ITEM";
  const valueType = data.valueType ?? "NONE";
  const value = Math.floor(data.value ?? 0);
  const redemptionMethod = data.redemptionMethod ?? "POINTS_ONLY";
  if (!name || cost <= 0) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  validateRewardShape({ rewardType, valueType, value, redemptionMethod });
  return prisma.reward.create({
    data: {
      tenantId,
      name,
      description: data.description?.trim() || null,
      pointsCost: cost,
      isActive: data.isActive ?? true,
      rewardType,
      valueType,
      value,
      redemptionMethod,
    },
  });
}

export async function updateReward(
  tenantId: string,
  rewardId: string,
  patch: Partial<{
    name: string;
    description: string | null;
    pointsCost: number;
    isActive: boolean;
    rewardType: RewardType;
    valueType: RewardValueType;
    value: number;
    redemptionMethod: RedemptionMethod;
  }>,
): Promise<Reward> {
  const existing = await prisma.reward.findFirst({
    where: { id: rewardId, tenantId },
  });
  if (!existing) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }

  const next = {
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
    description:
      patch.description !== undefined
        ? patch.description?.trim() ?? null
        : existing.description,
    pointsCost:
      patch.pointsCost !== undefined ? Math.floor(patch.pointsCost) : existing.pointsCost,
    isActive: patch.isActive !== undefined ? patch.isActive : existing.isActive,
    rewardType: patch.rewardType ?? existing.rewardType,
    valueType: patch.valueType ?? existing.valueType,
    value: patch.value !== undefined ? Math.floor(patch.value) : existing.value,
    redemptionMethod: patch.redemptionMethod ?? existing.redemptionMethod,
  };

  if (!next.name || next.pointsCost <= 0) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  validateRewardShape({
    rewardType: next.rewardType,
    valueType: next.valueType,
    value: next.value,
    redemptionMethod: next.redemptionMethod,
  });

  return prisma.reward.update({
    where: { id: rewardId },
    data: {
      name: next.name,
      description: next.description,
      pointsCost: next.pointsCost,
      isActive: next.isActive,
      rewardType: next.rewardType,
      valueType: next.valueType,
      value: next.value,
      redemptionMethod: next.redemptionMethod,
    },
  });
}

export async function listRewards(tenantId: string, activeOnly: boolean) {
  return prisma.reward.findMany({
    where: {
      tenantId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCampaign(
  tenantId: string,
  data: {
    name: string;
    description?: string | null;
    type: Campaign["type"];
    status?: Campaign["status"];
    startAt?: Date | null;
    endAt?: Date | null;
    config: unknown;
    isActive?: boolean;
  },
) {
  const name = data.name.trim();
  if (!name) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const cfg = assertCampaignConfigMatchesType(data.type, data.config);
  return prisma.campaign.create({
    data: {
      tenantId,
      name,
      description: data.description?.trim() || null,
      type: data.type,
      status: data.status ?? "draft",
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
      config: cfg as object,
      isActive: data.isActive ?? true,
    },
  });
}

export async function listCampaigns(tenantId: string) {
  return prisma.campaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateCampaign(
  tenantId: string,
  campaignId: string,
  patch: Partial<{
    name: string;
    description: string | null;
    type: Campaign["type"];
    status: Campaign["status"];
    startAt: Date | null;
    endAt: Date | null;
    config: unknown;
    isActive: boolean;
  }>,
): Promise<Campaign> {
  const existing = await prisma.campaign.findFirst({
    where: { id: campaignId, tenantId },
  });
  if (!existing) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }

  const nextType = patch.type ?? existing.type;
  const nextConfig = patch.config !== undefined ? patch.config : existing.config;

  const cfg = assertCampaignConfigMatchesType(nextType, nextConfig);

  if (patch.name !== undefined && !patch.name.trim()) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() ?? null }
        : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
      ...(patch.endAt !== undefined ? { endAt: patch.endAt } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      ...(patch.type !== undefined || patch.config !== undefined
        ? { config: cfg as object }
        : {}),
    },
  });
}

export async function redeemReward(
  tenantId: string,
  customerId: string,
  rewardId: string,
) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({
      where: { id: rewardId, tenantId, isActive: true },
    });
    if (!reward) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }

    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }

    const cost = reward.pointsCost;

    const dec = await tx.loyaltyAccount.updateMany({
      where: {
        customerId,
        tenantId,
        pointsBalance: { gte: cost },
      },
      data: { pointsBalance: { decrement: cost } },
    });
    if (dec.count !== 1) {
      const err = Object.assign(new Error("insufficient_points"), {
        statusCode: 409,
      });
      throw err;
    }

    const redemption = await tx.redemption.create({
      data: {
        tenantId,
        customerId,
        rewardId,
        pointsSpent: cost,
        status: "completed",
      },
    });

    await tx.pointsLedger.create({
      data: {
        tenantId,
        customerId,
        type: "redeem",
        points: -cost,
        source: "redemption",
        referenceId: redemption.id,
      },
    });

    return redemption;
  });
}

export async function getPublicCampaignsCatalog(tenantId: string) {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId, isActive: true, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return campaigns.filter((c) => isCampaignRunnable(c, now));
}

export async function getCustomerPortalData(tenantId: string, customerId: string) {
  const base = await getCustomerAccount(tenantId, customerId);
  const [recentVisits, rewards, campaigns, pendingClaims, recentRedemptions, recentLedger] =
    await Promise.all([
      prisma.visit.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          amount: true,
          pointsEarned: true,
          basePointsEarned: true,
          bonusPointsEarned: true,
          createdAt: true,
        },
      }),
      listRewards(tenantId, true),
      getPublicCampaignsCatalog(tenantId),
      prisma.redemption.findMany({
        where: { tenantId, customerId, status: "pending" },
        orderBy: { createdAt: "desc" },
        include: { reward: { select: { id: true, name: true, pointsCost: true } } },
      }),
      prisma.redemption.findMany({
        where: { tenantId, customerId, status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reward: { select: { id: true, name: true } } },
      }),
      prisma.pointsLedger.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          type: true,
          points: true,
          source: true,
          referenceId: true,
          createdAt: true,
        },
      }),
    ]);
  return {
    ...base,
    recentVisits,
    rewards,
    campaigns,
    pendingClaims,
    recentRedemptions,
    recentLedger,
  };
}

/** Müşteri public API — gereksiz alanları düşürür. */
export function toPublicRewardDto(r: Reward) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    pointsCost: r.pointsCost,
    isActive: r.isActive,
    rewardType: r.rewardType,
  };
}

/** Kampanya config (Json) müşteriye gönderilmez. */
export function toPublicCampaignDto(c: Campaign) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    type: c.type,
    status: c.status,
    startAt: c.startAt?.toISOString() ?? null,
    endAt: c.endAt?.toISOString() ?? null,
  };
}

export type ActivityLedgerRowDto = {
  id: string;
  type: "earn" | "redeem" | "adjust";
  points: number;
  source: PointsLedgerSource;
  createdAt: string;
};

export function toActivityLedgerRowDto(row: {
  id: string;
  type: PointsLedgerType;
  points: number;
  source: PointsLedgerSource;
  createdAt: Date;
}): ActivityLedgerRowDto {
  const type: ActivityLedgerRowDto["type"] =
    row.type === "redeem"
      ? "redeem"
      : row.type === "earn"
        ? "earn"
        : "adjust";
  return {
    id: row.id,
    type,
    points: row.points,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET .../customers/me/account — özet hesap + son hareket özeti. */
export async function getPublicCustomerAccountSummary(
  tenantId: string,
  customerId: string,
) {
  const base = await getCustomerAccount(tenantId, customerId);
  const [rewards, campaigns, recentLedger] = await Promise.all([
    listRewards(tenantId, true),
    getPublicCampaignsCatalog(tenantId),
    prisma.pointsLedger.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        points: true,
        source: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    customer: {
      id: base.customer.id,
      name: base.customer.name,
    },
    pointsBalance: base.pointsBalance,
    availableRewards: rewards.map(toPublicRewardDto),
    activeCampaigns: campaigns.map(toPublicCampaignDto),
    activityPreview: recentLedger.map(toActivityLedgerRowDto),
  };
}

export async function getPublicCustomerActivityLedger(
  tenantId: string,
  customerId: string,
  take = 40,
) {
  const rows = await prisma.pointsLedger.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 80),
    select: {
      id: true,
      type: true,
      points: true,
      source: true,
      createdAt: true,
    },
  });
  return rows.map(toActivityLedgerRowDto);
}

export async function createRedemptionClaim(
  tenantId: string,
  customerId: string,
  rewardId: string,
) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({
      where: { id: rewardId, tenantId, isActive: true },
    });
    if (!reward) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { loyaltyAccount: true },
    });
    if (!customer?.loyaltyAccount) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }
    const pendingSame = await tx.redemption.findFirst({
      where: { tenantId, customerId, rewardId, status: "pending" },
    });
    if (pendingSame) {
      const err = Object.assign(new Error("duplicate_pending_claim"), {
        statusCode: 409,
      });
      throw err;
    }
    const cost = reward.pointsCost;
    if (customer.loyaltyAccount.pointsBalance < cost) {
      const err = Object.assign(new Error("insufficient_points"), {
        statusCode: 409,
      });
      throw err;
    }
    return tx.redemption.create({
      data: {
        tenantId,
        customerId,
        rewardId,
        pointsSpent: cost,
        status: "pending",
      },
      include: {
        reward: { select: { id: true, name: true, pointsCost: true } },
      },
    });
  });
}

export async function finalizePendingRedemption(tenantId: string, redemptionId: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.redemption.findFirst({
      where: { id: redemptionId, tenantId, status: "pending" },
    });
    if (!row) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }
    const cost = row.pointsSpent;
    const dec = await tx.loyaltyAccount.updateMany({
      where: {
        customerId: row.customerId,
        tenantId,
        pointsBalance: { gte: cost },
      },
      data: { pointsBalance: { decrement: cost } },
    });
    if (dec.count !== 1) {
      const err = Object.assign(new Error("insufficient_points"), {
        statusCode: 409,
      });
      throw err;
    }
    await tx.redemption.update({
      where: { id: redemptionId },
      data: { status: "completed" },
    });
    await tx.pointsLedger.create({
      data: {
        tenantId,
        customerId: row.customerId,
        type: "redeem",
        points: -cost,
        source: "redemption",
        referenceId: redemptionId,
      },
    });
    const out = await tx.redemption.findFirst({
      where: { id: redemptionId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        reward: { select: { id: true, name: true } },
      },
    });
    if (!out) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }
    return out;
  });
}

export async function rejectPendingRedemption(tenantId: string, redemptionId: string) {
  const row = await prisma.redemption.findFirst({
    where: { id: redemptionId, tenantId, status: "pending" },
  });
  if (!row) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }
  return prisma.redemption.update({
    where: { id: redemptionId },
    data: { status: "rejected" },
  });
}

export async function getCustomerAccount(tenantId: string, customerId: string) {
  const account = await prisma.loyaltyAccount.findFirst({
    where: { customerId, tenantId },
    include: { customer: true },
  });
  if (!account) {
    const err = Object.assign(new Error("not_found"), { statusCode: 404 });
    throw err;
  }

  const agg = await prisma.pointsLedger.aggregate({
    where: { tenantId, customerId },
    _sum: { points: true },
  });
  const ledgerTotal = agg._sum.points ?? 0;

  return {
    customer: account.customer,
    pointsBalance: account.pointsBalance,
    ledgerSum: ledgerTotal,
    ledgerMatchesCache: account.pointsBalance === ledgerTotal,
  };
}

export async function getCustomerDetail(tenantId: string, customerId: string) {
  const base = await getCustomerAccount(tenantId, customerId);
  const [recentVisits, recentLedger] = await Promise.all([
    prisma.visit.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        amount: true,
        pointsEarned: true,
        basePointsEarned: true,
        bonusPointsEarned: true,
        createdAt: true,
      },
    }),
    prisma.pointsLedger.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        points: true,
        source: true,
        referenceId: true,
        visitId: true,
        createdAt: true,
      },
    }),
  ]);
  return { ...base, recentVisits, recentLedger };
}

export async function listVisitsForTenant(tenantId: string, take = 100) {
  return prisma.visit.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}

export async function listRedemptionsForTenant(tenantId: string, take = 100) {
  return prisma.redemption.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      reward: { select: { id: true, name: true } },
    },
  });
}

export async function getLoyaltySummary(tenantId: string) {
  const { start, end } = utcDayRange();
  const now = new Date();

  const [
    totalCustomers,
    visitsToday,
    pointsIssuedAgg,
    redemptionsToday,
    campaignRows,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId } }),
    prisma.visit.count({
      where: { tenantId, createdAt: { gte: start, lt: end } },
    }),
    prisma.pointsLedger.aggregate({
      where: {
        tenantId,
        type: "earn",
        createdAt: { gte: start, lt: end },
      },
      _sum: { points: true },
    }),
    prisma.redemption.count({
      where: {
        tenantId,
        status: "completed",
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.campaign.findMany({
      where: { tenantId, isActive: true, status: "active" },
    }),
  ]);

  const activeCampaigns = campaignRows.filter((c) => isCampaignRunnable(c, now))
    .length;

  return {
    totalCustomers,
    visitsToday,
    pointsIssuedToday: pointsIssuedAgg._sum.points ?? 0,
    redemptionsToday,
    activeCampaigns,
  };
}
