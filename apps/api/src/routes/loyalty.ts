import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { writeAudit } from "../lib/audit.js";
import type {
  CampaignType,
  RedemptionMethod,
  RewardType,
  RewardValueType,
} from "../generated/prisma/client.js";
import {
  createCampaign,
  createCustomer,
  createReward,
  getCustomerAccount,
  getCustomerDetail,
  getLoyaltySummary,
  listCampaigns,
  listCustomers,
  listPendingClaimsForCustomer,
  listRedemptionsForTenant,
  listRewards,
  listVisitsForTenant,
  previewVisitPoints,
  recordVisit,
  redeemReward,
  rejectPendingRedemption,
  finalizePendingRedemption,
  updateCampaign,
  updateReward,
} from "../lib/loyalty-service.js";
import {
  listCustomerActionsForCustomer,
  listTenantCustomerActions,
  scanInactivityAndAct,
} from "../lib/automation-engine.js";
import { prisma } from "../lib/prisma.js";
import { assertVisitBranchForSession } from "../lib/branch-scope.js";
import {
  assertCashierOperationContext,
  type CashierOperationContext,
} from "../lib/cashier-operation-service.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";

const CAMPAIGN_TYPES: CampaignType[] = [
  "BONUS_POINTS",
  "SPEND_THRESHOLD_BONUS",
  "FIRST_VISIT_BONUS",
];

const CAMPAIGN_STATUSES = ["draft", "active", "paused", "archived"] as const;

function isCampaignType(v: unknown): v is CampaignType {
  return typeof v === "string" && (CAMPAIGN_TYPES as string[]).includes(v);
}

function isCampaignStatus(
  v: unknown,
): v is (typeof CAMPAIGN_STATUSES)[number] {
  return typeof v === "string" && (CAMPAIGN_STATUSES as readonly string[]).includes(v);
}

function parseOptionalIsoDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
    throw err;
  }
  return d;
}

function requireTenantSession(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const tenantId = s?.tenant?.id;
  if (!tenantId) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}

async function resolvePreviewBranchId(
  tenantId: string,
  req: {
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
  },
  s: SessionPayload,
): Promise<string | null> {
  const pick = (name: string) => {
    const v = req.headers[name];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  let ctx: CashierOperationContext | undefined;
  try {
    ctx = readCashierCtxFromRequest(req);
  } catch {
    ctx = undefined;
  }
  if (ctx) {
    await assertCashierOperationContext(tenantId, s.user.id, ctx, s);
    const ds = await prisma.deviceSession.findFirst({
      where: { id: ctx.deviceSessionId, tenantId, status: "open" },
      select: { branchId: true },
    });
    return ds?.branchId ?? null;
  }
  const b = (req.body ?? {}) as { branchId?: string | null };
  const fromBody =
    b.branchId !== undefined && b.branchId !== null && String(b.branchId).trim() !== ""
      ? String(b.branchId).trim()
      : "";
  const fromHeader = String(pick("x-pointmor-active-branch") ?? "").trim();
  const chosen = fromBody || fromHeader || null;
  if (chosen) {
    const br = await prisma.branch.findFirst({
      where: { id: chosen, tenantId },
      select: { id: true },
    });
    if (!br) {
      const err = Object.assign(new Error("validation_error"), { statusCode: 400 });
      throw err;
    }
  }
  assertVisitBranchForSession(s, chosen);
  return chosen;
}

/** İkisi birlikte veya yok; kısmi header 400. */
function readCashierCtxFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): CashierOperationContext | undefined {
  const pick = (name: string) => {
    const v = req.headers[name];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const ds = String(pick("x-pointmor-device-session") ?? "").trim();
  const sh = String(pick("x-pointmor-cashier-shift") ?? "").trim();
  if (!ds && !sh) return undefined;
  if (!ds || !sh) {
    const err = Object.assign(new Error("incomplete_cashier_context"), {
      statusCode: 400,
    });
    throw err;
  }
  return { deviceSessionId: ds, cashierShiftId: sh };
}

export async function registerLoyaltyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/summary", { preHandler: [authPreHandler, requireTenantPermission("customers.view")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    return getLoyaltySummary(tenantId);
  });

  app.post<{ Body: { name?: string; phone?: string; email?: string } }>(
    "/customers",
    { preHandler: [authPreHandler, requireTenantPermission("customers.create")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      try {
        const row = await createCustomer(tenantId, {
          name: String(b.name ?? ""),
          phone: String(b.phone ?? ""),
          email: b.email,
        });
        await writeAudit(s.user.email, "loyalty.customer.create", row.id);
        return row;
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        if ((e as Error & { statusCode?: number }).statusCode === 400) {
          return reply.code(400).send({ error: "validation_error" });
        }
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code?: string }).code === "P2002"
        ) {
          return reply.code(409).send({ error: "phone_taken" });
        }
        throw e;
      }
    },
  );

  app.get("/customers", { preHandler: [authPreHandler, requireTenantPermission("customers.view")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    return listCustomers(tenantId);
  });

  app.get<{ Querystring: { limit?: string } }>(
    "/actions",
    { preHandler: [authPreHandler, requireTenantPermission("automation.run")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.GROWTH_AUTOMATION);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 100;
      const take = Number.isFinite(lim) && lim > 0 && lim <= 500 ? lim : 100;
      return listTenantCustomerActions(tenantId, take);
    },
  );

  app.get<{ Params: { customerId: string }; Querystring: { limit?: string } }>(
    "/customers/:customerId/actions",
    { preHandler: [authPreHandler, requireTenantPermission("automation.run")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.GROWTH_AUTOMATION);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 50;
      const take = Number.isFinite(lim) && lim > 0 && lim <= 200 ? lim : 50;
      return listCustomerActionsForCustomer(
        tenantId,
        req.params.customerId,
        take,
      );
    },
  );

  app.post(
    "/automation/scan-inactivity",
    { preHandler: [authPreHandler, requireTenantPermission("automation.run")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.GROWTH_AUTOMATION);
        const out = await scanInactivityAndAct(tenantId);
        await writeAudit(s.user.email, "loyalty.automation.scan_inactivity", String(out.actionsCreated));
        return out;
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
    },
  );

  app.get<{ Params: { customerId: string } }>(
    "/customers/:customerId/detail",
    { preHandler: [authPreHandler, requireTenantPermission("customers.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      try {
        return await getCustomerDetail(tenantId, req.params.customerId);
      } catch (e) {
        if ((e as Error & { statusCode?: number }).statusCode === 404) {
          return reply.code(404).send({ error: "not_found" });
        }
        throw e;
      }
    },
  );

  app.get<{ Params: { customerId: string } }>(
    "/customers/:customerId/account",
    { preHandler: [authPreHandler, requireTenantPermission("customers.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      try {
        return await getCustomerAccount(tenantId, req.params.customerId);
      } catch (e) {
        if ((e as Error & { statusCode?: number }).statusCode === 404) {
          return reply.code(404).send({ error: "not_found" });
        }
        throw e;
      }
    },
  );

  app.get<{ Params: { customerId: string } }>(
    "/customers/:customerId/pending-claims",
    { preHandler: [authPreHandler, requireTenantPermission("rewards.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      return listPendingClaimsForCustomer(tenantId, req.params.customerId);
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    "/visits",
    { preHandler: [authPreHandler, requireTenantPermission("visits.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 100;
      const take = Number.isFinite(lim) && lim > 0 && lim <= 500 ? lim : 100;
      return listVisitsForTenant(tenantId, take, s);
    },
  );

  app.post<{ Body: { customerId?: string; amount?: number; branchId?: string | null } }>(
    "/visits/preview",
    { preHandler: [authPreHandler, requireTenantPermission("visits.create")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const customerId = String(b.customerId ?? "").trim();
      const amount = Number(b.amount);
      try {
        const atBranch = await resolvePreviewBranchId(tenantId, req, s);
        return await previewVisitPoints(tenantId, customerId, amount, atBranch, s);
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) return reply.code(400).send({ error: "validation_error" });
        if (code === 403) return reply.code(403).send({ error: (e as Error).message });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 500) {
          return reply.code(500).send({ error: "campaign_config_corrupt" });
        }
        throw e;
      }
    },
  );

  app.post<{ Body: { customerId?: string; amount?: number } }>(
    "/visits",
    { preHandler: [authPreHandler, requireTenantPermission("visits.create")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const customerId = String(b.customerId ?? "").trim();
      const amount = Number(b.amount);
      let ctx: CashierOperationContext | undefined;
      try {
        ctx = readCashierCtxFromRequest(req);
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) {
          return reply.code(400).send({ error: "incomplete_cashier_context" });
        }
        throw e;
      }
      if (ctx) {
        try {
          await assertCashierOperationContext(tenantId, s.user.id, ctx, s);
        } catch (e) {
          const code = (e as Error & { statusCode?: number }).statusCode;
          if (code === 403) {
            return reply.code(403).send({ error: (e as Error).message });
          }
          if (code === 409) {
            return reply.code(409).send({ error: (e as Error).message });
          }
          throw e;
        }
      }
      try {
        const result = await recordVisit(
          tenantId,
          customerId,
          amount,
          ctx,
          {
            userId: s.user.id,
            actorType: "cashier",
          },
          s,
        );
        await writeAudit(s.user.email, "loyalty.visit.create", result.visitId);
        return result;
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) return reply.code(400).send({ error: "validation_error" });
        if (code === 403) return reply.code(403).send({ error: (e as Error).message });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 500) {
          return reply.code(500).send({ error: "campaign_config_corrupt" });
        }
        throw e;
      }
    },
  );

  app.get<{ Querystring: { active?: string } }>(
    "/rewards",
    { preHandler: [authPreHandler, requireTenantPermission("rewards.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const activeOnly = req.query.active !== "false";
      return listRewards(tenantId, activeOnly);
    },
  );

  app.post<{
    Body: {
      name?: string;
      description?: string;
      pointsCost?: number;
      isActive?: boolean;
      rewardType?: string;
      valueType?: string;
      value?: number;
      redemptionMethod?: string;
    };
  }>("/rewards", { preHandler: [authPreHandler, requireTenantPermission("rewards.manage")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    const b = req.body ?? {};
    try {
      const row = await createReward(tenantId, {
        name: String(b.name ?? ""),
        description: b.description,
        pointsCost: Number(b.pointsCost),
        isActive: b.isActive,
        rewardType: b.rewardType as RewardType | undefined,
        valueType: b.valueType as RewardValueType | undefined,
        value: b.value !== undefined ? Number(b.value) : undefined,
        redemptionMethod: b.redemptionMethod as RedemptionMethod | undefined,
      });
      await writeAudit(s.user.email, "loyalty.reward.create", row.id);
      return row;
    } catch (e) {
      if (sendEntitlementHttpError(reply, e)) return;
      if ((e as Error & { statusCode?: number }).statusCode === 400) {
        return reply.code(400).send({ error: "validation_error" });
      }
      throw e;
    }
  });

  app.patch<{
    Params: { rewardId: string };
    Body: {
      name?: string;
      description?: string | null;
      pointsCost?: number;
      isActive?: boolean;
      rewardType?: string;
      valueType?: string;
      value?: number;
      redemptionMethod?: string;
    };
  }>("/rewards/:rewardId", { preHandler: [authPreHandler, requireTenantPermission("rewards.manage")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    const b = req.body ?? {};
    try {
      const row = await updateReward(tenantId, req.params.rewardId, {
        ...(b.name !== undefined ? { name: String(b.name) } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(b.pointsCost !== undefined ? { pointsCost: Number(b.pointsCost) } : {}),
        ...(b.isActive !== undefined ? { isActive: Boolean(b.isActive) } : {}),
        ...(b.rewardType !== undefined ? { rewardType: b.rewardType as never } : {}),
        ...(b.valueType !== undefined ? { valueType: b.valueType as never } : {}),
        ...(b.value !== undefined ? { value: Number(b.value) } : {}),
        ...(b.redemptionMethod !== undefined
          ? { redemptionMethod: b.redemptionMethod as never }
          : {}),
      });
      await writeAudit(s.user.email, "loyalty.reward.update", row.id);
      return row;
    } catch (e) {
      if (sendEntitlementHttpError(reply, e)) return;
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 400) return reply.code(400).send({ error: "validation_error" });
      if (code === 404) return reply.code(404).send({ error: "not_found" });
      throw e;
    }
  });

  app.get("/campaigns", { preHandler: [authPreHandler, requireTenantPermission("campaigns.view")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    return listCampaigns(tenantId);
  });

  app.post<{
    Body: {
      name?: string;
      description?: string;
      type?: string;
      status?: string;
      startAt?: string | null;
      endAt?: string | null;
      config?: unknown;
      isActive?: boolean;
      branchId?: string | null;
    };
  }>("/campaigns", { preHandler: [authPreHandler, requireTenantPermission("campaigns.manage")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    const b = req.body ?? {};
    if (!isCampaignType(b.type)) {
      return reply.code(400).send({ error: "invalid_campaign_type" });
    }
    if (b.status !== undefined && !isCampaignStatus(b.status)) {
      return reply.code(400).send({ error: "invalid_campaign_status" });
    }
    try {
      const startAt = parseOptionalIsoDate(b.startAt);
      const endAt = parseOptionalIsoDate(b.endAt);
      const row = await createCampaign(tenantId, {
        name: String(b.name ?? ""),
        description: b.description,
        type: b.type,
        status: b.status !== undefined ? b.status : undefined,
        startAt: startAt === undefined ? undefined : startAt,
        endAt: endAt === undefined ? undefined : endAt,
        config: b.config,
        isActive: b.isActive,
        branchId:
          b.branchId === undefined || b.branchId === null || String(b.branchId).trim() === ""
            ? undefined
            : String(b.branchId).trim(),
      });
      await writeAudit(s.user.email, "loyalty.campaign.create", row.id);
      return row;
    } catch (e) {
      if (sendEntitlementHttpError(reply, e)) return;
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 400) {
        return reply.code(400).send({
          error:
            (e as Error).message === "invalid_campaign_config"
              ? "invalid_campaign_config"
              : "validation_error",
        });
      }
      throw e;
    }
  });

  app.patch<{
    Params: { campaignId: string };
    Body: {
      name?: string;
      description?: string | null;
      type?: string;
      status?: string;
      startAt?: string | null;
      endAt?: string | null;
      config?: unknown;
      isActive?: boolean;
      branchId?: string | null;
    };
  }>("/campaigns/:campaignId", { preHandler: [authPreHandler, requireTenantPermission("campaigns.manage")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    const b = req.body ?? {};
    if (b.type !== undefined && !isCampaignType(b.type)) {
      return reply.code(400).send({ error: "invalid_campaign_type" });
    }
    if (b.status !== undefined && !isCampaignStatus(b.status)) {
      return reply.code(400).send({ error: "invalid_campaign_status" });
    }
    try {
      const patch: Parameters<typeof updateCampaign>[2] = {};
      if (b.name !== undefined) patch.name = String(b.name);
      if (b.description !== undefined) patch.description = b.description;
      if (b.type !== undefined) patch.type = b.type;
      if (b.status !== undefined) patch.status = b.status as never;
      if (b.startAt !== undefined) patch.startAt = parseOptionalIsoDate(b.startAt);
      if (b.endAt !== undefined) patch.endAt = parseOptionalIsoDate(b.endAt);
      if (b.config !== undefined) patch.config = b.config;
      if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);
      if (b.branchId !== undefined) {
        if (b.branchId === null || String(b.branchId).trim() === "") {
          patch.branchId = null;
        } else {
          patch.branchId = String(b.branchId).trim();
        }
      }

      const row = await updateCampaign(tenantId, req.params.campaignId, patch);
      await writeAudit(s.user.email, "loyalty.campaign.update", row.id);
      return row;
    } catch (e) {
      if (sendEntitlementHttpError(reply, e)) return;
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 400) {
        return reply.code(400).send({
          error:
            (e as Error).message === "invalid_campaign_config"
              ? "invalid_campaign_config"
              : "validation_error",
        });
      }
      if (code === 404) return reply.code(404).send({ error: "not_found" });
      throw e;
    }
  });

  app.get<{ Querystring: { limit?: string } }>(
    "/redemptions",
    { preHandler: [authPreHandler, requireTenantPermission("redemptions.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const lim = req.query.limit ? Number.parseInt(req.query.limit, 10) : 100;
      const take = Number.isFinite(lim) && lim > 0 && lim <= 500 ? lim : 100;
      return listRedemptionsForTenant(tenantId, take, s);
    },
  );

  app.post<{ Body: { customerId?: string; rewardId?: string } }>(
    "/redemptions",
    { preHandler: [authPreHandler, requireTenantPermission("redemptions.create")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const customerId = String(b.customerId ?? "").trim();
      const rewardId = String(b.rewardId ?? "").trim();
      let ctx: CashierOperationContext | undefined;
      try {
        ctx = readCashierCtxFromRequest(req);
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) {
          return reply.code(400).send({ error: "incomplete_cashier_context" });
        }
        throw e;
      }
      if (ctx) {
        try {
          await assertCashierOperationContext(tenantId, s.user.id, ctx, s);
        } catch (e) {
          const code = (e as Error & { statusCode?: number }).statusCode;
          if (code === 403) {
            return reply.code(403).send({ error: (e as Error).message });
          }
          if (code === 409) {
            return reply.code(409).send({ error: (e as Error).message });
          }
          throw e;
        }
      }
      try {
        const row = await redeemReward(tenantId, customerId, rewardId, ctx, {
          userId: s.user.id,
          actorType: "cashier",
        });
        await writeAudit(s.user.email, "loyalty.redemption.create", row.id);
        return row;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 409) {
          return reply.code(409).send({ error: "insufficient_points" });
        }
        throw e;
      }
    },
  );

  app.post<{ Params: { redemptionId: string } }>(
    "/redemptions/:redemptionId/approve",
    { preHandler: [authPreHandler, requireTenantPermission("redemptions.approve")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      let ctx: CashierOperationContext | undefined;
      try {
        ctx = readCashierCtxFromRequest(req);
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) {
          return reply.code(400).send({ error: "incomplete_cashier_context" });
        }
        throw e;
      }
      if (ctx) {
        try {
          await assertCashierOperationContext(tenantId, s.user.id, ctx, s);
        } catch (e) {
          const code = (e as Error & { statusCode?: number }).statusCode;
          if (code === 403) {
            return reply.code(403).send({ error: (e as Error).message });
          }
          if (code === 409) {
            return reply.code(409).send({ error: (e as Error).message });
          }
          throw e;
        }
      }
      try {
        const row = await finalizePendingRedemption(
          tenantId,
          req.params.redemptionId,
          ctx,
          {
            userId: s.user.id,
            actorType: "cashier",
          },
        );
        await writeAudit(s.user.email, "loyalty.redemption.approve", row?.id ?? "");
        return row;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 409) {
          return reply.code(409).send({ error: "insufficient_points" });
        }
        throw e;
      }
    },
  );

  app.post<{ Params: { redemptionId: string } }>(
    "/redemptions/:redemptionId/reject",
    { preHandler: [authPreHandler, requireTenantPermission("redemptions.reject")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      let ctx: CashierOperationContext | undefined;
      try {
        ctx = readCashierCtxFromRequest(req);
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) {
          return reply.code(400).send({ error: "incomplete_cashier_context" });
        }
        throw e;
      }
      if (ctx) {
        try {
          await assertCashierOperationContext(tenantId, s.user.id, ctx, s);
        } catch (e) {
          const code = (e as Error & { statusCode?: number }).statusCode;
          if (code === 403) {
            return reply.code(403).send({ error: (e as Error).message });
          }
          if (code === 409) {
            return reply.code(409).send({ error: (e as Error).message });
          }
          throw e;
        }
      }
      try {
        const row = await rejectPendingRedemption(
          tenantId,
          req.params.redemptionId,
          {
            userId: s.user.id,
            actorType: "cashier",
          },
          ctx,
        );
        await writeAudit(s.user.email, "loyalty.redemption.reject", row.id);
        return row;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );
}
