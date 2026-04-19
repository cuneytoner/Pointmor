import { describe, expect, it } from "vitest";
import { mergeTenantWhere } from "./tenant-scope.js";

describe("mergeTenantWhere", () => {
  it("tenantId ekler", () => {
    const w = mergeTenantWhere("t1", { status: "active" });
    expect(w).toEqual({ status: "active", tenantId: "t1" });
  });

  it("uyumlu tenantId ile birleşir", () => {
    const w = mergeTenantWhere("t1", { tenantId: "t1", status: "active" });
    expect(w.tenantId).toBe("t1");
  });

  it("çakışan tenantId’de hata", () => {
    expect(() => mergeTenantWhere("t1", { tenantId: "t2" })).toThrow(/tenant_scope_conflict/);
  });
});
