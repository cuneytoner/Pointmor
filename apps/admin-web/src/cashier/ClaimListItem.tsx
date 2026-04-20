import type { PendingClaimRow } from "../lib/tenant-loyalty-api";
import { ClaimStatusBadge } from "./ClaimStatusBadge";

type ClaimListItemProps = {
  claim: PendingClaimRow;
  pendingLabel: string;
  pointsLabel: string;
  approveLabel: string;
  rejectLabel: string;
  formatWhen: (iso: string) => string;
  busy: boolean;
  busyApprove: boolean;
  busyReject: boolean;
  formatPoints: (value: number) => string;
  showApprove?: boolean;
  showReject?: boolean;
  onApprove: () => void;
  onReject: () => void;
};

export function ClaimListItem({
  claim,
  pendingLabel,
  pointsLabel,
  approveLabel,
  rejectLabel,
  formatWhen,
  busy,
  busyApprove,
  busyReject,
  formatPoints,
  showApprove = true,
  showReject = true,
  onApprove,
  onReject,
}: ClaimListItemProps) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{claim.reward.name}</p>
          <ClaimStatusBadge label={pendingLabel} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {formatWhen(claim.createdAt)} · {pointsLabel}: {formatPoints(claim.pointsSpent)}
        </p>
      </div>
      {showApprove || showReject ? (
        <div className="flex shrink-0 gap-2">
          {showReject ? (
            <button
              type="button"
              className="min-h-12 min-w-[3.25rem] touch-manipulation rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              disabled={busy}
              onClick={onReject}
            >
              {busyReject ? "…" : rejectLabel}
            </button>
          ) : null}
          {showApprove ? (
            <button
              type="button"
              className="min-h-12 min-w-[3.25rem] touch-manipulation rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              disabled={busy}
              onClick={onApprove}
            >
              {busyApprove ? "…" : approveLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
