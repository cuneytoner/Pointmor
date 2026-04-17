import { describe, expect, it } from "vitest";
import { parseTenantRetentionPut } from "./lib/tenant-retention-input.js";

describe("parseTenantRetentionPut", () => {
  it("accepts integer days object", () => {
    const r = parseTenantRetentionPut({
      operationalAuditDays: 30,
      exportAuditDays: 60,
      messagingDays: 30,
      anomalyDays: 90,
    });
    expect(r).toEqual({
      operationalAuditDays: 30,
      exportAuditDays: 60,
      messagingDays: 30,
      anomalyDays: 90,
    });
  });

  it("rejects missing keys", () => {
    const r = parseTenantRetentionPut({ operationalAuditDays: 30 });
    expect(r).toEqual({ error: "validation_error" });
  });

  it("rejects non-integer", () => {
    const r = parseTenantRetentionPut({
      operationalAuditDays: 30.5,
      exportAuditDays: 60,
      messagingDays: 30,
      anomalyDays: 90,
    });
    expect(r).toEqual({ error: "validation_error" });
  });
});
