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

function tokenTtlSec(): number {
  return customerPortalTokenTtlSeconds();
}

/** HS256 JWT — müşteri portalı oturumu (SMS yok; telefon doğrulaması + bu token). */
export function signCustomerAccessToken(
  customerId: string,
  tenantId: string,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + tokenTtlSec();
  const payload = Buffer.from(
    JSON.stringify({
      sub: customerId,
      tid: tenantId,
      jti: randomUUID(),
      iat: now,
      exp,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", signingSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyCustomerAccessToken(
  token: string,
): { customerId: string; tenantId: string; jti?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", signingSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: unknown; tid?: unknown; exp?: unknown; jti?: unknown };
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    if (typeof p.sub !== "string" || typeof p.tid !== "string") return null;
    const jtiRaw = typeof p.jti === "string" ? p.jti.trim() : "";
    return { customerId: p.sub, tenantId: p.tid, jti: jtiRaw || undefined };
  } catch {
    return null;
  }
}
