import { describe, expect, it } from "vitest";
import {
  compliancePackLevelFromContext,
  FEATURE,
  type TenantEntitlementContext,
} from "./lib/entitlement-service.js";

function ctx(features: string[]): TenantEntitlementContext {
  return {
    tenantId: "t",
    plan: { featureTags: features } as TenantEntitlementContext["plan"],
    limits: {
      maxCustomers: null,
      maxActiveRewards: null,
      maxActiveCampaigns: null,
      maxVisitsPerMonth: null,
      maxBranches: null,
      maxStaffUsers: null,
      softWarningPercent: 80,
    },
    features: new Set(features),
  };
}

describe("compliancePackLevelFromContext", () => {
  it("returns none without tags", () => {
    expect(compliancePackLevelFromContext(ctx([]))).toBe("none");
  });

  it("full wins over limited", () => {
    expect(compliancePackLevelFromContext(ctx([FEATURE.COMPLIANCE_FULL, FEATURE.COMPLIANCE_LIMITED]))).toBe(
      "full",
    );
  });

  it("returns limited", () => {
    expect(compliancePackLevelFromContext(ctx([FEATURE.COMPLIANCE_LIMITED]))).toBe("limited");
  });
});
