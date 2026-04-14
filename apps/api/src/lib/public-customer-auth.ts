import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { verifyCustomerAccessToken } from "./customer-portal-jwt.js";
import { parseBearerToken } from "./http-auth.js";

/**
 * Müşteri PWA erişimi: Authorization: Bearer &lt;HS256 customer token&gt;.
 * tenantSlug URL’deki mağaza ile token içindeki tid eşleşmeli (cross-tenant engeli).
 */
export async function requireCustomerBearer(
  req: FastifyRequest,
  reply: FastifyReply,
  tenantSlug: string,
): Promise<{ tenantId: string; customerId: string } | null> {
  const raw = parseBearerToken(req);
  if (!raw) {
    await reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  const pl = verifyCustomerAccessToken(raw);
  if (!pl) {
    await reply.code(401).send({ error: "invalid_token" });
    return null;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug.trim() },
  });
  if (!tenant || tenant.id !== pl.tenantId) {
    req.log.warn(
      { tenantSlug: tenantSlug.trim(), tokenTenantId: pl.tenantId },
      "public_api_tenant_mismatch",
    );
    await reply.code(403).send({ error: "tenant_mismatch" });
    return null;
  }
  return { tenantId: pl.tenantId, customerId: pl.customerId };
}
