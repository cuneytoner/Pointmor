import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { verifyCustomerAccessToken } from "./customer-portal-jwt.js";
import { parseBearerToken } from "./http-auth.js";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  customerBearerFallbackAllowed,
  customerSessionCookieOnlyMode,
} from "./customer-session-cookie.js";
import { getSecurityState } from "./security-state.js";

function resolveCustomerRawToken(req: FastifyRequest, tenantSlug: string): string | undefined {
  const cookieTok = (req.cookies?.[CUSTOMER_SESSION_COOKIE_NAME] ?? "").trim() || undefined;
  const bearerTok = parseBearerToken(req);
  const allowBearer = customerBearerFallbackAllowed();

  if (cookieTok) {
    if (bearerTok && customerSessionCookieOnlyMode() && allowBearer) {
      req.log.info(
        { tenantSlug: tenantSlug.trim(), route: req.url },
        "customer_auth_bearer_redundant_cookie_present",
      );
    }
    return cookieTok;
  }

  if (bearerTok && !allowBearer) {
    req.log.warn(
      { tenantSlug: tenantSlug.trim(), route: req.url },
      "customer_auth_bearer_rejected_cookie_mode",
    );
    return undefined;
  }

  if (bearerTok && allowBearer) {
    req.log.info(
      { tenantSlug: tenantSlug.trim(), route: req.url },
      "customer_auth_bearer_legacy",
    );
    return bearerTok;
  }

  return undefined;
}

/**
 * Müşteri PWA erişimi: öncelik HttpOnly cookie; Bearer yalnızca kontrollü geçiş bayrağı ile.
 * tenantSlug URL’deki mağaza ile token içindeki tid eşleşmeli (cross-tenant engeli).
 */
export async function requireCustomerSession(
  req: FastifyRequest,
  reply: FastifyReply,
  tenantSlug: string,
): Promise<{ tenantId: string; customerId: string } | null> {
  const bearerOnly =
    !req.cookies?.[CUSTOMER_SESSION_COOKIE_NAME]?.trim() && Boolean(parseBearerToken(req));
  if (bearerOnly && !customerBearerFallbackAllowed()) {
    await reply.code(401).send({ error: "customer_cookie_session_required" });
    return null;
  }

  const raw = resolveCustomerRawToken(req, tenantSlug);
  if (!raw) {
    await reply.code(401).send({ error: "unauthorized" });
    return null;
  }
  const pl = verifyCustomerAccessToken(raw);
  if (!pl) {
    await reply.code(401).send({ error: "invalid_token" });
    return null;
  }
  if (pl.jti) {
    const revoked = await getSecurityState().isCustomerJtiRevoked(pl.jti);
    if (revoked) {
      await reply.code(401).send({ error: "session_revoked" });
      return null;
    }
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
