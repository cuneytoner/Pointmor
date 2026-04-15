import type { CustomerPortalDashboard } from "../lib/customer-portal-api";

export type NextRewardPreview = {
  reward: {
    id: string;
    name: string;
    pointsCost: number;
  };
  pointsBalance: number;
  progressPct: number;
  pointsToNext: number;
  canRedeemNow: boolean;
};

/** Sıradaki hedef ödül + ilerleme — home / success sheet ile aynı kurallar. */
export function getNextRewardPreview(data: CustomerPortalDashboard): NextRewardPreview | null {
  const active = data.rewards
    .filter((r) => r.isActive)
    .sort((a, b) => a.pointsCost - b.pointsCost);
  if (active.length === 0) return null;

  const canRedeemNow = active.some((r) => data.pointsBalance >= r.pointsCost);
  const needUnlock = active.find((r) => r.pointsCost > data.pointsBalance);
  const target = needUnlock ?? active[0];
  const pc = target.pointsCost;
  if (pc <= 0) {
    return {
      reward: { id: target.id, name: target.name, pointsCost: pc },
      pointsBalance: data.pointsBalance,
      progressPct: 100,
      pointsToNext: 0,
      canRedeemNow,
    };
  }
  const progressPct = Math.min(100, Math.round((data.pointsBalance / pc) * 100));
  const pointsToNext = Math.max(0, pc - data.pointsBalance);
  return {
    reward: { id: target.id, name: target.name, pointsCost: pc },
    pointsBalance: data.pointsBalance,
    progressPct,
    pointsToNext,
    canRedeemNow,
  };
}
