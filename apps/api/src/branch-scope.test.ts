import { describe, expect, it } from "vitest";
import {
  assertVisitBranchForSession,
  branchScopeFromSession,
  visitWhereForSession,
} from "./lib/branch-scope.js";
import type { SessionBranchScope, SessionPayload } from "./lib/auth-memory.js";
import { TENANT_MEMBERSHIP_ROLES } from "./lib/tenant-app-role.js";

function session(role: string, branchScope?: SessionBranchScope): SessionPayload {
  return {
    user: { id: "u1", email: "u@test", name: "U", platformAdmin: false },
    tenant: { id: "t1", slug: "acme", name: "Acme" },
    membership: branchScope !== undefined ? { role, branchScope } : { role },
  };
}

describe("branchScopeFromSession", () => {
  it("owner: tüm şubeler", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.owner, "all");
    expect(branchScopeFromSession(s)).toBe("all");
  });

  it("staff: tek şube listesi", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.staff, {
      restrictedTo: ["b1"],
    });
    expect(branchScopeFromSession(s)).toEqual({ restrictedTo: ["b1"] });
  });
});

describe("visitWhereForSession", () => {
  it("kısıtlı kullanıcı sadece kendi şubelerindeki ziyaretleri görür", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.staff, {
      restrictedTo: ["b1"],
    });
    expect(visitWhereForSession("t1", s)).toEqual({
      tenantId: "t1",
      branchId: { in: ["b1"] },
    });
  });

  it("staff başka şube verisini sorguda göremez (GÖREV 10/1)", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.staff, {
      restrictedTo: ["b_staff"],
    });
    const w = visitWhereForSession("t1", s);
    expect(w).toEqual({ tenantId: "t1", branchId: { in: ["b_staff"] } });
  });
});

describe("assertVisitBranchForSession", () => {
  it("yanlış şubede 403", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.staff, {
      restrictedTo: ["b1"],
    });
    expect(() => assertVisitBranchForSession(s, "b2")).toThrow("branch_access_denied");
  });

  it("doğru şubede geçer", () => {
    const s = session(TENANT_MEMBERSHIP_ROLES.staff, {
      restrictedTo: ["b1"],
    });
    expect(() => assertVisitBranchForSession(s, "b1")).not.toThrow();
  });
});
