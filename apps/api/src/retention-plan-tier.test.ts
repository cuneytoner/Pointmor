import { describe, expect, it } from "vitest";
import {
  clampRetentionDays,
  retentionTierFromPlan,
  validateRetentionDaysForTier,
} from "./lib/retention-plan-tier.js";

describe("retention-plan-tier", () => {
  it("maps starter slug to free", () => {
    expect(retentionTierFromPlan({ slug: "starter", planType: "free" })).toBe("free");
  });

  it("maps enterprise to growth", () => {
    expect(retentionTierFromPlan({ slug: "enterprise", planType: "pro" })).toBe("growth");
  });

  it("maps paid non-growth slug to pro", () => {
    expect(retentionTierFromPlan({ slug: "pro", planType: "pro" })).toBe("pro");
  });

  it("pro rejects messaging value outside enum", () => {
    const r = validateRetentionDaysForTier("pro", {
      operationalAuditDays: 60,
      exportAuditDays: 60,
      messagingDays: 45,
      anomalyDays: 60,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("messagingDays");
  });

  it("growth clamps via clampRetentionDays", () => {
    expect(clampRetentionDays("messaging", "growth", 3)).toBe(7);
    expect(clampRetentionDays("messaging", "growth", 500)).toBe(180);
  });

  it("growth accepts range values", () => {
    const r = validateRetentionDaysForTier("growth", {
      operationalAuditDays: 200,
      exportAuditDays: 365,
      messagingDays: 90,
      anomalyDays: 30,
    });
    expect(r.ok).toBe(true);
  });
});
