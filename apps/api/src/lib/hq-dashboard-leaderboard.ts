/** HQ dashboard: şube sıralaması (saf fonksiyon, test edilebilir). */

export type HqLeaderboardBranch = { id: string; name: string };

export type HqLeaderboardRow = {
  branchId: string | null;
  name: string;
  visits: number;
  rank: number;
};

export function computeHqLeaderboard(
  branches: HqLeaderboardBranch[],
  visitCounts: Map<string, number>,
): {
  rows: HqLeaderboardRow[];
  bestBranchId: string | null;
  worstBranchId: string | null;
  medianVisits: number;
} {
  const rows: HqLeaderboardRow[] = branches.map((b) => ({
    branchId: b.id,
    name: b.name,
    visits: visitCounts.get(b.id) ?? 0,
    rank: 0,
  }));
  rows.sort((a, b) => b.visits - a.visits);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const withVisits = rows.filter((r) => r.visits > 0);
  const best = withVisits[0] ?? null;
  const worst = withVisits.length > 1 ? withVisits[withVisits.length - 1]! : null;

  const medianVisits =
    withVisits.length === 0
      ? 0
      : (() => {
          const mid = Math.floor(withVisits.length / 2);
          return withVisits.length % 2 === 1
            ? withVisits[mid]!.visits
            : Math.round((withVisits[mid - 1]!.visits + withVisits[mid]!.visits) / 2);
        })();

  return {
    rows,
    bestBranchId: best?.branchId ?? null,
    worstBranchId: worst?.branchId ?? null,
    medianVisits,
  };
}
