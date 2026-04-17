import { describe, expect, it } from "vitest";
import { detectRelativeDrop, dropVsTrailingBaseline, isoWeekKey } from "./hq-insight-math.js";

describe("hq-insight-math", () => {
  it("detectRelativeDrop: %20+ düşüş ve min önceki hacim", () => {
    expect(detectRelativeDrop(7, 10, { minPrevious: 10, dropFraction: 0.2 })).toBe(true);
    expect(detectRelativeDrop(8, 10, { minPrevious: 10, dropFraction: 0.2 })).toBe(false);
    expect(detectRelativeDrop(0, 5, { minPrevious: 10, dropFraction: 0.2 })).toBe(false);
  });

  it("dropVsTrailingBaseline: son 7g önceki 21g baseline’a göre düşük", () => {
    const daily = Array(35).fill(5);
    daily[34] = 1;
    daily[33] = 1;
    daily[32] = 1;
    daily[31] = 1;
    daily[30] = 1;
    daily[29] = 1;
    daily[28] = 1;
    expect(
      dropVsTrailingBaseline(daily, 7, 21, { dropFraction: 0.2, minBaselineSum: 30 }),
    ).toBe(true);
  });

  it("isoWeekKey stabil anahtar üretir", () => {
    expect(isoWeekKey(new Date("2026-04-17T12:00:00.000Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });
});
