import { describe, expect, it } from "vitest";
import { mapHqInsightToAutomationCandidate } from "./hq-automation-rules.js";

describe("mapHqInsightToAutomationCandidate", () => {
  it("visit_drop_tenant → kampanya", () => {
    const c = mapHqInsightToAutomationCandidate({
      id: "i1",
      type: "visit_drop_tenant",
      branchId: null,
      message: "test",
    });
    expect(c?.actionType).toBe("create_campaign");
    expect(c?.triggerType).toBe("visit_drop");
    expect(c?.idempotencyKey).toBe("syncInsight:i1");
  });

  it("top_branch_growth → null", () => {
    expect(
      mapHqInsightToAutomationCandidate({
        id: "i2",
        type: "top_branch_growth",
        branchId: "b1",
        message: "x",
      }),
    ).toBeNull();
  });
});
