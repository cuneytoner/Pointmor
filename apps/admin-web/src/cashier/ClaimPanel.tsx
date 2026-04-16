import type { PendingClaimRow } from "../lib/tenant-loyalty-api";
import { ClaimListItem } from "./ClaimListItem";
import { CustomerSyncHint } from "./CustomerSyncHint";

type ClaimPanelProps = {
  title: string;
  empty: string;
  intro: string;
  claims: PendingClaimRow[] | null;
  loading: boolean;
  error: string | null;
  pendingLabel: string;
  pointsLabel: string;
  approveLabel: string;
  rejectLabel: string;
  formatWhen: (iso: string) => string;
  claimAction: null | { id: string; kind: "approve" | "reject" };
  customerSyncState: "idle" | "refreshing" | "error";
  hintIdle: string;
  hintRefreshing: string;
  hintError: string;
  refreshLabel: string;
  onRefresh: () => void;
  onApprove: (redemptionId: string) => void;
  onReject: (redemptionId: string) => void;
  canApprove?: boolean;
  canReject?: boolean;
  /** Ağ yokken onay/red ve yenileme kapalı */
  networkBlocked?: boolean;
};

export function ClaimPanel({
  title,
  empty,
  intro,
  claims,
  loading,
  error,
  pendingLabel,
  pointsLabel,
  approveLabel,
  rejectLabel,
  formatWhen,
  claimAction,
  customerSyncState,
  hintIdle,
  hintRefreshing,
  hintError,
  refreshLabel,
  onRefresh,
  onApprove,
  onReject,
  canApprove = true,
  canReject = true,
  networkBlocked = false,
}: ClaimPanelProps) {
  const busy = claimAction !== null || networkBlocked;

  return (
    <section
      className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm md:p-5"
      aria-labelledby="cashier-claims-heading"
    >
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="cashier-claims-heading"
            className="text-sm font-semibold uppercase tracking-wide text-amber-900"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-amber-900/80">{intro}</p>
        </div>
        <CustomerSyncHint
          hintIdle={hintIdle}
          hintRefreshing={hintRefreshing}
          hintError={hintError}
          refreshLabel={refreshLabel}
          state={customerSyncState}
          onRefresh={onRefresh}
          disabled={loading || busy}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !claims?.length ? (
        <p className="text-sm text-slate-600">…</p>
      ) : null}
      {!loading && claims && claims.length === 0 ? (
        <p className="text-sm text-slate-600">{empty}</p>
      ) : null}
      {claims && claims.length > 0 ? (
        <ul className="mt-3 space-y-2" role="list">
          {claims.map((c) => {
            const ca = claimAction;
            const busyApprove = ca?.id === c.id && ca.kind === "approve";
            const busyReject = ca?.id === c.id && ca.kind === "reject";
            return (
              <ClaimListItem
                key={c.id}
                claim={c}
                pendingLabel={pendingLabel}
                pointsLabel={pointsLabel}
                approveLabel={approveLabel}
                rejectLabel={rejectLabel}
                formatWhen={formatWhen}
                busy={busy}
                busyApprove={busyApprove}
                busyReject={busyReject}
                onApprove={() => onApprove(c.id)}
                onReject={() => onReject(c.id)}
                showApprove={canApprove}
                showReject={canReject}
              />
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
