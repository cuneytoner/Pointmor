import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  verifyCustomerAccessTokenDetailed,
} from "./customer-portal-jwt.js";
import {
  customerBearerFallbackAllowed,
  customerBearerLegacySunsetPassed,
} from "./customer-session-cookie.js";

function makeToken(payloadObj: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = createHmac("sha256", "test-cookie-secret")
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

describe("customer policy rollout guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects jti-less token after cutoff", () => {
    vi.stubEnv("COOKIE_SECRET", "test-cookie-secret");
    vi.stubEnv("CUSTOMER_PORTAL_JTI_REQUIRED_AFTER", "2000-01-01T00:00:00.000Z");
    const token = makeToken({
      sub: "c1",
      tid: "t1",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const r = verifyCustomerAccessTokenDetailed(token);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failure.code).toBe("customer_jti_required");
  });

  it("allows jti-less token before cutoff", () => {
    vi.stubEnv("COOKIE_SECRET", "test-cookie-secret");
    vi.stubEnv("CUSTOMER_PORTAL_JTI_REQUIRED_AFTER", "2099-01-01T00:00:00.000Z");
    const token = makeToken({
      sub: "c1",
      tid: "t1",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const r = verifyCustomerAccessTokenDetailed(token);
    expect(r.ok).toBe(true);
  });

  it("disables bearer fallback after sunset", () => {
    vi.stubEnv("CUSTOMER_SESSION_MODE", "dual");
    vi.stubEnv("CUSTOMER_ALLOW_BEARER_FALLBACK", "true");
    vi.stubEnv("CUSTOMER_BEARER_LEGACY_SUNSET_AFTER", "2000-01-01T00:00:00.000Z");
    expect(customerBearerLegacySunsetPassed()).toBe(true);
    expect(customerBearerFallbackAllowed()).toBe(false);
  });
});
