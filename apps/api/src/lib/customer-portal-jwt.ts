import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret(): string {
  return (
    process.env.CUSTOMER_PORTAL_JWT_SECRET?.trim() ||
    process.env.COOKIE_SECRET?.trim() ||
    "dev-customer-portal-secret-change-in-prod"
  );
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
  const exp = now + 60 * 60 * 24 * 30;
  const payload = Buffer.from(
    JSON.stringify({ sub: customerId, tid: tenantId, iat: now, exp }),
  ).toString("base64url");
  const sig = createHmac("sha256", signingSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyCustomerAccessToken(
  token: string,
): { customerId: string; tenantId: string } | null {
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
    ) as { sub?: unknown; tid?: unknown; exp?: unknown };
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    if (typeof p.sub !== "string" || typeof p.tid !== "string") return null;
    return { customerId: p.sub, tenantId: p.tid };
  } catch {
    return null;
  }
}
