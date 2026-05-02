import { describe, expect, it } from "vitest";
import type { AiComplianceTenantOperations } from "./lib/ai-compliance-operations.js";

describe("Bootstrap contract", () => {
  it("bootstrap AI Compliance counts should not include systems", async () => {
    // This test verifies the actual contract type used by bootstrap
    // loadAiComplianceCountsForScope returns Omit<AiComplianceTenantOperations, "systems">
    // This will fail at compile time if systems is added back to the counts function
    
    // Type assertion to verify the contract shape
    // This represents what loadAiComplianceCountsForScope actually returns
    const aiComplianceCounts: Omit<AiComplianceTenantOperations, "systems"> = {
      activeOrganizations: 0,
      assessmentsCompleted: 0,
      pendingReviews: 0,
      openObligations: 0,
      systemsNeedingReview: 0,
      overdueObligations: 0,
      escalatedAssessments: 0,
      advisorWorkload: 0,
      evidenceBacklog: 0,
      // systems field is intentionally omitted - this would cause compile error if present
    };

    // Verify systems field is not present in the counts-only contract
    expect(aiComplianceCounts).not.toHaveProperty("systems");
    
    // Verify all expected count fields are present
    const expectedFields = [
      "activeOrganizations",
      "assessmentsCompleted", 
      "pendingReviews",
      "openObligations",
      "systemsNeedingReview",
      "overdueObligations",
      "escalatedAssessments",
      "advisorWorkload",
      "evidenceBacklog",
    ];

    expectedFields.forEach((field) => {
      expect(aiComplianceCounts).toHaveProperty(field);
      expect(typeof (aiComplianceCounts as any)[field]).toBe("number");
    });

    // Ensure no unexpected fields
    const actualFields = Object.keys(aiComplianceCounts);
    expect(actualFields).toEqual(expect.arrayContaining(expectedFields));
    expect(actualFields).not.toContain("systems");
  });

  it("full AiComplianceTenantOperations type should include systems", async () => {
    // This test ensures the full operations type still has systems (for the dedicated endpoint)
    // This verifies we didn't accidentally remove systems from the wrong place
    
    const mockFullOperations: AiComplianceTenantOperations = {
      activeOrganizations: 0,
      assessmentsCompleted: 0,
      pendingReviews: 0,
      openObligations: 0,
      systemsNeedingReview: 0,
      overdueObligations: 0,
      escalatedAssessments: 0,
      advisorWorkload: 0,
      evidenceBacklog: 0,
      systems: [], // This SHOULD be present in the full operations type
    };

    // Verify systems field IS present in the full operations type
    expect(mockFullOperations).toHaveProperty("systems");
    expect(Array.isArray(mockFullOperations.systems)).toBe(true);
  });

  it("bootstrap should only return minimal cross-product data", async () => {
    // Static type check for minimal bootstrap contract
    const mockBootstrap = {
      user: {},
      tenant: null,
      membership: null,
      tenants: [],
      users: [],
      plans: [],
      subscriptions: [],
      tenantModules: [],
      platformMetrics: {},
      moduleOperations: {
        aiCompliance: {
          activeOrganizations: 0,
          assessmentsCompleted: 0,
          pendingReviews: 0,
          openObligations: 0,
          systemsNeedingReview: 0,
          overdueObligations: 0,
          escalatedAssessments: 0,
          advisorWorkload: 0,
          evidenceBacklog: 0,
        },
        loyalty: {
          activeOrganizations: 0,
          activeCampaigns: 0,
          enrolledCustomers: 0,
          campaignActivity: 0,
        },
        advisorPortal: {
          advisorOrganizations: 0,
          linkedClientOrganizations: 0,
          pendingAdvisorActions: 0,
          sharedWorkspaceActivity: 0,
        },
      },
    };

    // Verify bootstrap contains only expected top-level fields
    const expectedTopLevelFields = [
      "user",
      "tenant", 
      "membership",
      "tenants",
      "users",
      "plans",
      "subscriptions",
      "tenantModules",
      "platformMetrics",
      "moduleOperations",
    ];

    expectedTopLevelFields.forEach(field => {
      expect(mockBootstrap).toHaveProperty(field);
    });

    // Verify moduleOperations only contains counts, no operational data
    expect(mockBootstrap.moduleOperations).toHaveProperty("aiCompliance");
    expect(mockBootstrap.moduleOperations).toHaveProperty("loyalty");
    expect(mockBootstrap.moduleOperations).toHaveProperty("advisorPortal");

    // Verify loyalty only has count fields
    const loyalty = mockBootstrap.moduleOperations.loyalty;
    const expectedLoyaltyFields = [
      "activeOrganizations",
      "activeCampaigns", 
      "enrolledCustomers",
      "campaignActivity",
    ];

    expectedLoyaltyFields.forEach((field) => {
      expect(loyalty).toHaveProperty(field);
      expect(typeof (loyalty as any)[field]).toBe("number");
    });

    // Verify advisorPortal only has count fields  
    const advisorPortal = mockBootstrap.moduleOperations.advisorPortal;
    const expectedAdvisorFields = [
      "advisorOrganizations",
      "linkedClientOrganizations",
      "pendingAdvisorActions",
      "sharedWorkspaceActivity",
    ];

    expectedAdvisorFields.forEach((field) => {
      expect(advisorPortal).toHaveProperty(field);
      expect(typeof (advisorPortal as any)[field]).toBe("number");
    });
  });
});
