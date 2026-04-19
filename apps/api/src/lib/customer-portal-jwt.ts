import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

function signingSecret(): string {
  const envSecret = process.env.CUSTOMER_PORTAL_JWT_SECRET?.trim();
  if (envSecret) return envSecret;
  const cookieSecret = process.env.COOKIE_SECRET?.trim();
  if (cookieSecret) return cookieSecret;
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "demo") {
    throw new Error("CUSTOMER_PORTAL_JWT_SECRET veya COOKIE_SECRET tanımlı olmalı.");
  }
  return "dev-customer-portal-secret-change-in-prod";
}

export function customerPortalTokenTtlSeconds(): number {
  const raw = Number.parseInt(process.env.CUSTOMER_PORTAL_TOKEN_TTL_SECONDS ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return 60 * 60 * 12;
  return raw;
}

/**
 * ISO 8601 UTC önerilir (ör. `2026-09-01T00:00:00.000Z`). Bu andan sonra imzada `jti` olmayan müşteri tokenları reddedilir.
 */
export function customerPortalJtiRequiredAfterMs(): number | null {
  const raw = process.env.CUSTOMER_PORTAL_JTI_REQUIRED_AFTER?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

function tokenTtlSec(): number {
  return customerPortalTokenTtlSeconds();
}

export type CustomerTokenFailureCode = "invalid_token" | "token_expired" | "customer_jti_required";

export type VerifyCustomerTokenFailure = {
  code: CustomerTokenFailureCode;
  /** `customer_jti_required` için politika anı (ISO UTC). */
  policyAfter?: string;
  message?: string;
};

export type VerifyCustomerTokenResult =
  | { ok: true; customerId: string; tenantId: string; jti?: string }
  | { ok: false; failure: VerifyCustomerTokenFailure };

/** Doğrulama sonucu ve operasyonel hata kodu (401 gövdesi / metrik için). */
export function verifyCustomerAccessTokenDetailed(token: string): VerifyCustomerTokenResult {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, failure: { code: "invalid_token", message: "Malformed token." } };
  }
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", signingSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, failure: { code: "invalid_token", message: "Invalid signature." } };
  }
  try {
    const p = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: unknown; tid?: unknown; exp?: unknown; jti?: unknown };
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) {
      return {
        ok: false,
        failure: { code: "token_expired", message: "Token expired; obtain a new session." },
      };
    }
    if (typeof p.sub !== "string" || typeof p.tid !== "string") {
      return { ok: false, failure: { code: "invalid_token", message: "Invalid payload." } };
    }
    const jtiRaw = typeof p.jti === "string" ? p.jti.trim() : "";
    const cutoff = customerPortalJtiRequiredAfterMs();
    if (!jtiRaw && cutoff !== null && Date.now() >= cutoff) {
      const policyAfter = new Date(cutoff).toISOString();
      return {
        ok: false,
        failure: {
          code: "customer_jti_required",
          policyAfter,
          message:
            "This token was issued before session identifiers were required. Complete verify/login again to obtain a new token.",
        },
      };
    }
    return { customerId: p.sub, tenantId: p.tid, jti: jtiRaw || undefined, ok: true };
  } catch {
    return { ok: false, failure: { code: "invalid_token", message: "Invalid payload encoding." } };
  }
}

export function verifyCustomerAccessToken(
  token: string,
): { customerId: string; tenantId: string; jti?: string } | null {
  const r = verifyCustomerAccessTokenDetailed(token);
  return r.ok ? r : null;
}

/** HS256 JWT — müşteri portalı oturumu (SMS yok; telefon doğrulaması + bu token). */
export function signCustomerAccessToken(
  customerId: string,
  tenantId: string,
): string {
  const hdr = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + tokenTtlSec();
  const pl = Buffer.from(
    JSON.stringify({
      sub: customerId,
      tid: tenantId,
      jti: randomUUID(),
      iat: now,
      exp,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", signingSecret())
    .update(`${hdr}.${pl}`)
    .digest("base64url");
  return `${hdr}.${pl}.${sig}`;
}
