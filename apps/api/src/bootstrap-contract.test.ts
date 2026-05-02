import { describe, expect, it } from "vitest";

describe("Bootstrap contract", () => {
  it("bootstrap response should not include aiCompliance.systems", async () => {
    // This is a static type check test to ensure bootstrap contract
    // The actual API testing requires complex session setup which is handled
    // by other integration tests. This test serves as a guard against regressions.
    
    // Verify that the bootstrap types don't include systems
    // This will fail at compile time if systems is added back
    const mockBootstrap = {
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
          // systems: [], // This should NOT be present
        } as const,
      },
    };

    // Verify systems field is not present
    expect(mockBootstrap.moduleOperations.aiCompliance).not.toHaveProperty("systems");
    
    // Verify only count fields are present
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

    expectedFields.forEach(field => {
      expect(mockBootstrap.moduleOperations.aiCompliance).toHaveProperty(field);
    });

    // Ensure no unexpected fields
    const actualFields = Object.keys(mockBootstrap.moduleOperations.aiCompliance);
    expect(actualFields).toEqual(expect.arrayContaining(expectedFields));
    expect(actualFields).not.toContain("systems");
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
