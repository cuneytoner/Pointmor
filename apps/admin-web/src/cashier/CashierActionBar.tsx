type LoadingTarget = "visit" | "redeem" | null;

type CashierActionBarProps = {
  completeLabel: string;
  useRewardLabel: string;
  submittingVisitLabel: string;
  submittingRedeemLabel: string;
  helperText: string;
  canCompleteVisit: boolean;
  canUseReward: boolean;
  loadingTarget: LoadingTarget;
  onCompleteVisit: () => void;
  onUseReward: () => void;
};

export function CashierActionBar({
  completeLabel,
  useRewardLabel,
  submittingVisitLabel,
  submittingRedeemLabel,
  helperText,
  canCompleteVisit,
  canUseReward,
  loadingTarget,
  onCompleteVisit,
  onUseReward,
}: CashierActionBarProps) {
  const visitBusy = loadingTarget === "visit";
  const redeemBusy = loadingTarget === "redeem";

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-md md:px-5">
      <p className="mb-2 text-center text-xs text-slate-600">{helperText}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          className="h-14 min-h-[56px] w-full touch-manipulation rounded-xl border-2 border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-45 sm:min-w-[200px] sm:flex-1"
          disabled={!canUseReward || redeemBusy || visitBusy}
          onClick={onUseReward}
        >
          {redeemBusy ? submittingRedeemLabel : useRewardLabel}
        </button>
        <button
          type="button"
          className="h-14 min-h-[56px] w-full touch-manipulation rounded-xl bg-indigo-600 px-4 text-base font-semibold text-white shadow-md transition hover:bg-indigo-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 sm:min-w-[220px] sm:flex-1"
          disabled={!canCompleteVisit || visitBusy || redeemBusy}
          onClick={onCompleteVisit}
        >
          {visitBusy ? submittingVisitLabel : completeLabel}
        </button>
      </div>
    </div>
  );
}
