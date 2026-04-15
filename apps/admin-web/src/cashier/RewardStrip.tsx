import type { RewardDto } from "../lib/tenant-loyalty-api";

type RewardStripProps = {
  title: string;
  empty: string;
  pointsSuffix: string;
  costLabel: string;
  readyLabel: string;
  insufficientLabel: string;
  balanceLine: string;
  eligibleRewards: RewardDto[];
  selectedRewardId: string | null;
  balance: number;
  onSelectReward: (id: string | null) => void;
  /** Bekleyen talep nedeniyle strip’ten çıkarılan ödüller için kısa not */
  footnote?: string | null;
};

export function RewardStrip({
  title,
  empty,
  pointsSuffix,
  costLabel,
  readyLabel,
  insufficientLabel,
  balanceLine,
  eligibleRewards,
  selectedRewardId,
  balance,
  onSelectReward,
  footnote,
}: RewardStripProps) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby="cashier-rewards-heading"
    >
      <h2
        id="cashier-rewards-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {title}
      </h2>
      {eligibleRewards.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {eligibleRewards.map((r) => {
            const selected = r.id === selectedRewardId;
            const affordable = balance >= r.pointsCost;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectReward(selected ? null : r.id)}
                className={`min-h-[48px] min-w-[10rem] shrink-0 touch-manipulation rounded-xl border-2 px-3 py-3 text-left transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500 min-[768px]:min-h-[52px] ${
                  selected
                    ? "border-indigo-600 bg-indigo-50 shadow-md"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-slate-900">{r.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {costLabel}: {r.pointsCost} {pointsSuffix}
                </p>
                <p className="mt-2 text-xs font-medium">
                  {affordable ? (
                    <span className="text-emerald-700">{readyLabel}</span>
                  ) : (
                    <span className="text-amber-800">{insufficientLabel}</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-600">{balanceLine}</p>
      {footnote ? (
        <p className="mt-2 text-xs text-amber-900/90">{footnote}</p>
      ) : null}
    </section>
  );
}
