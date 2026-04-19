import { customerPortalTokenTtlSeconds } from "./customer-portal-jwt.js";

export const CUSTOMER_SESSION_COOKIE_NAME = "pointmor_customer_session";

export function customerSessionCookieOnlyMode(): boolean {
  const mode = process.env.CUSTOMER_SESSION_MODE?.trim().toLowerCase();
  if (mode === "cookie") return true;
  if (mode === "dual") return false;
  if (process.env.APP_ENV === "demo") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * Cookie-only modunda bile `Authorization: Bearer` ile geri uyumluluk (gözlem / geçiş).
 * Varsayılan: cookie-only modda kapalı; dual modda açık.
 */
export function customerBearerFallbackAllowed(): boolean {
  const raw = process.env.CUSTOMER_ALLOW_BEARER_FALLBACK?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return !customerSessionCookieOnlyMode();
}

export function customerSessionCookieOptions(tenantSlug: string): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
} {
  const prod = process.env.NODE_ENV === "production";
  return {
    path: `/public/tenants/${encodeURIComponent(tenantSlug)}`,
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    maxAge: customerPortalTokenTtlSeconds(),
  };
}

export function customerSessionCookieClearOptions(tenantSlug: string): {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
} {
  return {
    ...customerSessionCookieOptions(tenantSlug),
    maxAge: 0,
  };
}
