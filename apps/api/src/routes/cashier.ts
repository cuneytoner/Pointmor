import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { writeAudit } from "../lib/audit.js";
import {
  closeCashierShift,
  closeDeviceSession,
  createBranch,
  getCashierBootstrap,
  getCashierShiftSummary,
  listBranches,
  startCashierShift,
  startDeviceSession,
} from "../lib/cashier-operation-service.js";
import { sendEntitlementHttpError } from "../lib/entitlement-service.js";

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

export async function registerCashierRoutes(app: FastifyInstance): Promise<void> {
  app.get("/cashier/bootstrap", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    return getCashierBootstrap(tenantId, s.user.id);
  });

  app.get("/cashier/branches", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    return listBranches(tenantId);
  });

  app.post<{ Body: { name?: string; slug?: string | null } }>(
    "/cashier/branches",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const b = req.body ?? {};
      try {
        const row = await createBranch(
          tenantId,
          String(b.name ?? ""),
          b.slug,
        );
        await writeAudit(s.user.email, "cashier.branch.create", row.id);
        return row;
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 400) return reply.code(400).send({ error: "validation_error" });
        if (
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          (e as { code?: string }).code === "P2002"
        ) {
          return reply.code(409).send({ error: "branch_name_taken" });
        }
        throw e;
      }
    },
  );

  app.post<{
    Body: { deviceLabel?: string; branchId?: string | null };
  }>("/cashier/device-sessions", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const s = req.authSession as SessionPayload;
    const b = req.body ?? {};
    try {
      const row = await startDeviceSession(
        tenantId,
        String(b.deviceLabel ?? ""),
        b.branchId ?? null,
        s.user.id,
      );
      await writeAudit(s.user.email, "cashier.device_session.start", row.id);
      return row;
    } catch (e) {
      const code = (e as Error & { statusCode?: number }).statusCode;
      if (code === 400) return reply.code(400).send({ error: "validation_error" });
      if (code === 404) return reply.code(404).send({ error: "not_found" });
      if (code === 409) {
        const ex = e as Error & { existingId?: string };
        return reply.code(409).send({
          error: "device_session_already_open",
          existingId: ex.existingId,
        });
      }
      throw e;
    }
  });

  app.post<{ Params: { id: string } }>(
    "/cashier/device-sessions/:id/close",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const out = await closeDeviceSession(tenantId, req.params.id, s.user.id);
        await writeAudit(
          s.user.email,
          "cashier.device_session.close",
          `${req.params.id}:${out.closedShifts}`,
        );
        return { ok: true, ...out };
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );

  app.post<{ Body: { deviceSessionId?: string } }>(
    "/cashier/shifts",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const deviceSessionId = String(req.body?.deviceSessionId ?? "").trim();
      if (!deviceSessionId) {
        return reply.code(400).send({ error: "validation_error" });
      }
      try {
        const row = await startCashierShift(tenantId, s.user.id, deviceSessionId);
        await writeAudit(s.user.email, "cashier.shift.start", row.id);
        return row;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        const msg = (e as Error).message;
        if (code === 403) return reply.code(403).send({ error: "forbidden_user" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        if (code === 409) {
          return reply.code(409).send({
            error:
              msg === "device_session_closed"
                ? "device_session_closed"
                : msg === "shift_already_open_on_device"
                  ? "shift_already_open_on_device"
                  : msg === "user_shift_already_open"
                    ? "user_shift_already_open"
                    : "conflict",
          });
        }
        throw e;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/cashier/shifts/:id/close",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const row = await closeCashierShift(tenantId, req.params.id, s.user.id);
        await writeAudit(s.user.email, "cashier.shift.close", row.id);
        return row;
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 403) return reply.code(403).send({ error: "forbidden" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );

  app.get<{ Params: { shiftId: string } }>(
    "/cashier/shifts/:shiftId/summary",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        return await getCashierShiftSummary(
          tenantId,
          req.params.shiftId,
          s.user.id,
          s.membership?.role,
          s.user.platformAdmin,
        );
      } catch (e) {
        const code = (e as Error & { statusCode?: number }).statusCode;
        if (code === 403) return reply.code(403).send({ error: "forbidden" });
        if (code === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );
}
