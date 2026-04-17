import { describe, expect, it } from "vitest";
import { computeHqLeaderboard } from "./hq-dashboard-leaderboard.js";

describe("computeHqLeaderboard", () => {
  it("ziyarete göre sıralar ve rank verir", () => {
    const branches = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const counts = new Map([
      ["a", 10],
      ["b", 30],
      ["c", 20],
    ]);
    const { rows, bestBranchId, worstBranchId } = computeHqLeaderboard(branches, counts);
    expect(bestBranchId).toBe("b");
    expect(worstBranchId).toBe("a");
    expect(rows.map((r) => r.branchId)).toEqual(["b", "c", "a"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("tek şubede en kötü rozet yok", () => {
    const { worstBranchId } = computeHqLeaderboard([{ id: "x", name: "X" }], new Map([["x", 5]]));
    expect(worstBranchId).toBeNull();
  });

  it("medyan tek sayıda ortadaki değer", () => {
    const branches = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const counts = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(computeHqLeaderboard(branches, counts).medianVisits).toBe(2);
  });

  it("medyan çift sayıda iki ortalama", () => {
    const branches = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ];
    const counts = new Map([
      ["a", 10],
      ["b", 20],
      ["c", 30],
      ["d", 40],
    ]);
    expect(computeHqLeaderboard(branches, counts).medianVisits).toBe(25);
  });
});
