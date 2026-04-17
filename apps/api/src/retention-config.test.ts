import { afterEach, describe, expect, it, vi } from "vitest";
import { cutoffDate, getEffectiveRetentionConfig } from "./lib/retention-config.js";

describe("retention-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("cutoffDate is before now by N days", () => {
    const c = cutoffDate(7);
    const diff = Date.now() - c.getTime();
    expect(diff).toBeGreaterThan(6.5 * 86_400_000);
    expect(diff).toBeLessThan(7.5 * 86_400_000);
  });

  it("respects RETENTION_OPERATIONAL_AUDIT_DAYS", () => {
    vi.stubEnv("RETENTION_OPERATIONAL_AUDIT_DAYS", "120");
    const cfg = getEffectiveRetentionConfig();
    expect(cfg.rules.get("operational_audit")?.effectiveDays).toBe(120);
  });

  it("never disables product analytics when set", () => {
    vi.stubEnv("RETENTION_PRODUCT_ANALYTICS_DAYS", "never");
    const cfg = getEffectiveRetentionConfig();
    expect(cfg.rules.get("product_analytics_event")?.effectiveDays).toBeNull();
  });
});
