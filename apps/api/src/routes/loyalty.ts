import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { writeAudit } from "../lib/audit.js";
import {
  createCustomer,
  createReward,
  getCustomerAccount,
  listCustomers,
  listRewards,
  recordVisit,
  redeemReward,
} from "../lib/loyalty-service.js";

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

export async function registerLoyaltyRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { name?: string; phone?: string; email?: string } }>(
    "/customers",
    { preHandler: [authPreHandler] },
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

  app.get("/customers", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    return listCustomers(tenantId);
  });

  app.get<{ Params: { customerId: string } }>(
    "/customers/:customerId/account",
    { preHandler: [authPreHandler] },
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

  app.post<{ Body: { customerId?: string; amount?: number } }>(
    "/visits",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const customerId = String(b.customerId ?? "").trim();
      const amount = Number(b.amount);
      try {
        const result = await recordVisit(tenantId, customerId, amount);
        await writeAudit(s.user.email, "loyalty.visit.create", result.visitId);
        return result;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) return reply.code(400).send({ error: "validation_error" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );

  app.post<{
    Body: { name?: string; description?: string; pointsCost?: number; isActive?: boolean };
  }>("/rewards", { preHandler: [authPreHandler] }, async (req, reply) => {
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
      });
      await writeAudit(s.user.email, "loyalty.reward.create", row.id);
      return row;
    } catch (e) {
      if ((e as Error & { statusCode?: number }).statusCode === 400) {
        return reply.code(400).send({ error: "validation_error" });
      }
      throw e;
    }
  });

  app.get<{ Querystring: { active?: string } }>(
    "/rewards",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const activeOnly = req.query.active !== "false";
      return listRewards(tenantId, activeOnly);
    },
  );

  app.post<{ Body: { customerId?: string; rewardId?: string } }>(
    "/redemptions",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      const customerId = String(b.customerId ?? "").trim();
      const rewardId = String(b.rewardId ?? "").trim();
      try {
        const row = await redeemReward(tenantId, customerId, rewardId);
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
}
