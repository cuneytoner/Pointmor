import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isStrictSecurityProfile,
  validateStartupSecurityConfig,
} from "./security-config.js";

describe("validateStartupSecurityConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects SECURITY_STATE_BACKEND=redis without REDIS_URL", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("SECURITY_STATE_BACKEND", "redis");
    vi.stubEnv("REDIS_URL", "");
    expect(() => validateStartupSecurityConfig()).toThrow(/REDIS_URL/);
  });

  it("rejects strict profile with memory backend without explicit allow", () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("SECURITY_STATE_BACKEND", "memory");
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("SECURITY_STATE_ALLOW_MEMORY_FALLBACK", "");
    expect(() => validateStartupSecurityConfig()).toThrow(/SECURITY_STATE_ALLOW_MEMORY_FALLBACK/);
  });

  it("allows strict profile with memory when explicitly acknowledged", () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("SECURITY_STATE_BACKEND", "memory");
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("SECURITY_STATE_ALLOW_MEMORY_FALLBACK", "true");
    vi.stubEnv("SECURITY_STATE_ACK_IN_PROCESS_MEMORY", "true");
    vi.stubEnv("SECURITY_STATE_MEMORY_FALLBACK_JUSTIFICATION", "vitest-single-node");
    expect(() => validateStartupSecurityConfig()).not.toThrow();
  });

  it("rejects strict profile with memory allow but missing second ack", () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("SECURITY_STATE_BACKEND", "memory");
    vi.stubEnv("SECURITY_STATE_ALLOW_MEMORY_FALLBACK", "true");
    vi.stubEnv("SECURITY_STATE_ACK_IN_PROCESS_MEMORY", "");
    vi.stubEnv("REDIS_URL", "");
    expect(() => validateStartupSecurityConfig()).toThrow(/SECURITY_STATE_ACK_IN_PROCESS_MEMORY/);
  });

  it("rejects strict profile when internal job legacy window expired", () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("SECURITY_STATE_BACKEND", "memory");
    vi.stubEnv("SECURITY_STATE_ALLOW_MEMORY_FALLBACK", "true");
    vi.stubEnv("SECURITY_STATE_ACK_IN_PROCESS_MEMORY", "true");
    vi.stubEnv("SECURITY_STATE_MEMORY_FALLBACK_JUSTIFICATION", "vitest-single-node");
    vi.stubEnv("RETENTION_JOB_SECRET", "s");
    vi.stubEnv("INTERNAL_JOB_REQUIRE_HMAC", "false");
    vi.stubEnv("INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT", "2000-01-01T00:00:00.000Z");
    expect(() => validateStartupSecurityConfig()).toThrow(/INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT/);
  });

  it("isStrictSecurityProfile true for demo", () => {
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("NODE_ENV", "development");
    expect(isStrictSecurityProfile()).toBe(true);
  });
});
