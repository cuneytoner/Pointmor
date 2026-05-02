import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";

export { mergeTenantWhere } from "./tenant-scope.js";

export function tenantIdFromSession(session: SessionPayload | undefined): string | null {
  const tenantId = session?.tenant?.id?.trim();
  return tenantId ? tenantId : null;
}

export async function requireTenantIdFromRequest(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const tenantId = tenantIdFromSession(req.authSession as SessionPayload | undefined);
  if (!tenantId) {
    await reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}
