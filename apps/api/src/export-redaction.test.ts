import { describe, expect, it } from "vitest";
import {
  redactJsonForExport,
  summarizePayloadForCsv,
  summarizePayloadForPdfLine,
} from "./lib/export-redaction.js";

describe("export-redaction", () => {
  it("masks phone-like strings in JSON", () => {
    const o = redactJsonForExport({ phone: "+905551112233", note: "ok" });
    expect(o).toMatchObject({ note: "ok" });
    expect(String((o as { phone: string }).phone)).toContain("**");
  });

  it("summarizePayloadForCsv truncates long payloads", () => {
    const big = { x: "y".repeat(2000) };
    const s = summarizePayloadForCsv(big);
    expect(s.length).toBeLessThanOrEqual(902);
    expect(s.endsWith("…")).toBe(true);
  });

  it("summarizePayloadForPdfLine stays short", () => {
    const s = summarizePayloadForPdfLine({
      a: 1,
      b: "longtext".repeat(20),
      c: 3,
      d: 4,
      e: 5,
    });
    expect(s.length).toBeLessThan(300);
    expect(s).toContain("+");
  });
});
