import { describe, expect, it } from "vitest";
import { mergeEffectiveLimits } from "./lib/entitlement-service.js";
import { visitWhereForSession } from "./lib/branch-scope.js";
import type { SessionPayload } from "./lib/auth-memory.js";
import type { Plan, PlanType } from "./generated/prisma/client.js";

function mockPlan(slug: string, planType: PlanType, limits: object = {}): Plan {
  return {
    id: `plan_${slug}`,
    slug,
    name: slug,
    description: null,
    priceCents: 0,
    currency: "EUR",
    interval: "month",
    planType,
    featureTags: [],
    limits,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Kampanya satırı — şube override mantığı (loyalty-service ile aynı kural). */
function campaignAppliesAtBranch(
  c: { branchId: string | null },
  visitBranchId: string | null,
): boolean {
  if (!c.branchId) return true;
  if (!visitBranchId) return false;
  return c.branchId === visitBranchId;
}

describe("plan gating — maxBranches (GÖREV 8)", () => {
  it("starter/free: tek şube", () => {
    const l = mergeEffectiveLimits(mockPlan("starter", "free"));
    expect(l.maxBranches).toBe(1);
  });

  it("pro: sınırlı şube (varsayılan 5)", () => {
    const l = mergeEffectiveLimits(mockPlan("pro", "pro"));
    expect(l.maxBranches).toBe(5);
  });

  it("growth: sınırsız şube", () => {
    const l = mergeEffectiveLimits(mockPlan("growth", "pro"));
    expect(l.maxBranches).toBeNull();
  });
});

describe("kampanya şube override (GÖREV 5)", () => {
  it("merkezi kampanya tüm şubelerde geçer", () => {
    expect(campaignAppliesAtBranch({ branchId: null }, "b1")).toBe(true);
  });

  it("override yalnızca eşleşen şubede", () => {
    expect(campaignAppliesAtBranch({ branchId: "b1" }, "b1")).toBe(true);
    expect(campaignAppliesAtBranch({ branchId: "b1" }, "b2")).toBe(false);
  });
});

describe("manager çoklu şube görünürlüğü (GÖREV 10/2)", () => {
  it("restrictedTo iki şube — visit filtresi OR branchId in", () => {
    const s: SessionPayload = {
      user: { id: "u", email: "a@a", name: "A", platformAdmin: false },
      tenant: { id: "t1", slug: "x", name: "X" },
      membership: {
        role: "tenant_manager",
        branchScope: { restrictedTo: ["b1", "b2"] },
      },
    };
    expect(visitWhereForSession("t1", s)).toEqual({
      tenantId: "t1",
      branchId: { in: ["b1", "b2"] },
    });
  });
});
