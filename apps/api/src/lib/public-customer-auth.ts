import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { verifyCustomerAccessTokenDetailed } from "./customer-portal-jwt.js";
import { customerPortalJtiRequiredAfterMs } from "./customer-portal-jwt.js";
import { parseBearerToken } from "./http-auth.js";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  customerBearerFallbackAllowed,
  customerBearerLegacySunsetAtMs,
  customerBearerLegacySunsetAfterIso,
  customerBearerLegacySunsetPassed,
  customerSessionCookieOnlyMode,
} from "./customer-session-cookie.js";
import { getSecurityState } from "./security-state.js";
import { bumpRuntimeSecurityMetric } from "./runtime-security-metrics.js";

function resolveCustomerRawToken(req: FastifyRequest, tenantSlug: string): string | undefined {
  const cookieTok = (req.cookies?.[CUSTOMER_SESSION_COOKIE_NAME] ?? "").trim() || undefined;
  const bearerTok = parseBearerToken(req);
  if (bearerTok && customerBearerLegacySunsetPassed()) {
    bumpRuntimeSecurityMetric("customer_bearer_sunset_blocked");
    req.log.warn(
      { tenantSlug: tenantSlug.trim(), route: req.url },
      "customer_bearer_sunset_enforced",
    );
    if (!cookieTok) return undefined;
  }
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
    const sunsetMs = customerBearerLegacySunsetAtMs();
    if (sunsetMs !== null) {
      const days = (sunsetMs - Date.now()) / 86_400_000;
      if (days > 0 && days <= 14) {
        req.log.warn(
          {
            tenantSlug: tenantSlug.trim(),
            route: req.url,
            bearerSunsetAfter: customerBearerLegacySunsetAfterIso(),
            daysUntilSunset: Math.ceil(days),
          },
          "customer_auth_bearer_legacy_near_sunset",
        );
      }
    }
    bumpRuntimeSecurityMetric("customer_auth_bearer_legacy");
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
    await reply.code(401).send({
      error: customerBearerLegacySunsetPassed()
        ? "customer_bearer_sunset_enforced"
        : "customer_cookie_session_required",
      message: customerBearerLegacySunsetPassed()
        ? "Bearer legacy session is sunset. Re-login to obtain cookie-first session."
        : "Cookie session is required for customer endpoints.",
      policyAfter: customerBearerLegacySunsetAfterIso() ?? undefined,
      reauthRecommended: true,
    });
    return null;
  }

  const raw = resolveCustomerRawToken(req, tenantSlug);
  if (!raw) {
    await reply.code(401).send({
      error: customerBearerLegacySunsetPassed()
        ? "customer_bearer_sunset_enforced"
        : "unauthorized",
      message: customerBearerLegacySunsetPassed()
        ? "Bearer legacy session is sunset. Re-login to obtain cookie-first session."
        : undefined,
      policyAfter: customerBearerLegacySunsetAfterIso() ?? undefined,
      reauthRecommended: customerBearerLegacySunsetPassed() ? true : undefined,
    });
    return null;
  }
  const vr = verifyCustomerAccessTokenDetailed(raw);
  if (!vr.ok) {
    if (vr.failure.code === "customer_jti_required") {
      bumpRuntimeSecurityMetric("customer_jti_required_reject");
      await reply.code(401).send({
        error: vr.failure.code,
        message: vr.failure.message,
        policyAfter: vr.failure.policyAfter,
        reauthRecommended: true,
      });
      return null;
    }
    if (vr.failure.code === "token_expired") {
      await reply.code(401).send({ error: "token_expired", message: vr.failure.message });
      return null;
    }
    await reply.code(401).send({ error: "invalid_token", message: vr.failure.message });
    return null;
  }
  const pl = vr;
  if (!pl.jti) {
    bumpRuntimeSecurityMetric("customer_token_missing_jti");
    const jtiCutoffMs = customerPortalJtiRequiredAfterMs();
    const daysUntilCutoff =
      jtiCutoffMs !== null ? Math.ceil((jtiCutoffMs - Date.now()) / 86_400_000) : undefined;
    req.log.warn(
      {
        tenantSlug: tenantSlug.trim(),
        route: req.url,
        jtiRequiredAfter: jtiCutoffMs !== null ? new Date(jtiCutoffMs).toISOString() : undefined,
        daysUntilJtiCutoff: daysUntilCutoff,
      },
      "customer_token_missing_jti",
    );
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
