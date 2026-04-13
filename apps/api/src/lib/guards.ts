import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";

export async function requirePlatformAdmin(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  void _reply;
  const s = req.authSession as SessionPayload | undefined;
  if (!s?.user.platformAdmin) {
    const err = Object.assign(new Error("platform_admin_required"), {
      statusCode: 403,
    });
    throw err;
  }
}

export function canAccessTenant(
  session: SessionPayload,
  tenantId: string,
): boolean {
  if (session.user.platformAdmin) return true;
  return session.tenant?.id === tenantId;
}
