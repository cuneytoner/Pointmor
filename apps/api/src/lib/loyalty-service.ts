import type { Customer } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import {
  normalizeCustomerPhone,
  visitAmountToPointsEarned,
} from "./loyalty-config.js";

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

export async function listCustomers(tenantId: string): Promise<Customer[]> {
  return prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function recordVisit(
  tenantId: string,
  customerId: string,
  amount: number,
): Promise<{ visitId: string; pointsEarned: number }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const pointsEarned = visitAmountToPointsEarned(Math.floor(amount));

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      const err = Object.assign(new Error("not_found"), { statusCode: 404 });
      throw err;
    }

    const visit = await tx.visit.create({
      data: {
        tenantId,
        customerId,
        amount: Math.floor(amount),
        pointsEarned,
      },
    });

    if (pointsEarned !== 0) {
      await tx.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          type: "earn",
          points: pointsEarned,
          source: "visit",
          referenceId: visit.id,
        },
      });
      await tx.loyaltyAccount.update({
        where: { customerId },
        data: { pointsBalance: { increment: pointsEarned } },
      });
    }

    return { visitId: visit.id, pointsEarned };
  });
}

export async function createReward(
  tenantId: string,
  data: {
    name: string;
    description?: string | null;
    pointsCost: number;
    isActive?: boolean;
  },
) {
  const name = data.name.trim();
  const cost = Math.floor(data.pointsCost);
  if (!name || cost <= 0) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  return prisma.reward.create({
    data: {
      tenantId,
      name,
      description: data.description?.trim() || null,
      pointsCost: cost,
      isActive: data.isActive ?? true,
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
