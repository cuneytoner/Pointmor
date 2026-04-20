import { Badge } from "../components/ui/Badge";
import type { VisitPreviewResult } from "../lib/tenant-loyalty-api";

type SummaryPanelProps = {
  title: string;
  baseLabel: string;
  bonusLabel: string;
  totalLabel: string;
  campaignsTitle: string;
  previewPlaceholder: string;
  noBonusCampaigns: string;
  helpText: string;
  preview: VisitPreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  hasCustomer: boolean;
  hasAmount: boolean;
  campaignTypeLabel: (type: string) => string;
  formatPoints: (value: number) => string;
};

export function SummaryPanel({
  title,
  baseLabel,
  bonusLabel,
  totalLabel,
  campaignsTitle,
  previewPlaceholder,
  noBonusCampaigns,
  helpText,
  preview,
  previewLoading,
  previewError,
  hasCustomer,
  hasAmount,
  campaignTypeLabel,
  formatPoints,
}: SummaryPanelProps) {
  const showDots = previewLoading && hasCustomer && hasAmount;
  const base = showDots ? "…" : preview ? formatPoints(preview.basePoints) : "—";
  const bonus = showDots ? "…" : preview ? formatPoints(preview.bonusPoints) : "—";
  const total = showDots ? "…" : preview ? formatPoints(preview.totalPointsAwarded) : "—";

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
      aria-labelledby="cashier-summary-heading"
    >
      <h2
        id="cashier-summary-heading"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {title}
      </h2>
      <div className="grid gap-2">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">{baseLabel}</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {base}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-indigo-50/60 px-3 py-2">
          <span className="text-sm text-indigo-900">{bonusLabel}</span>
          <span className="text-lg font-semibold tabular-nums text-indigo-900">
            {bonus}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 px-3 py-2">
          <span className="text-sm font-medium text-slate-800">{totalLabel}</span>
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {total}
          </span>
        </div>
      </div>
      {previewError ? (
        <p className="text-sm text-red-700" role="alert">
          {previewError}
        </p>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase text-slate-500">{campaignsTitle}</p>
        {!hasCustomer || !hasAmount ? (
          <p className="mt-1 text-sm text-slate-500">{previewPlaceholder}</p>
        ) : preview?.appliedCampaigns.length ? (
          <ul className="mt-2 space-y-2">
            {preview.appliedCampaigns.map((a) => (
              <li
                key={a.campaignId}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <Badge tone="info">{campaignTypeLabel(a.type)}</Badge>
                <span className="text-slate-800">{a.name}</span>
                <span className="ml-auto font-medium text-indigo-700">
                  +{formatPoints(a.pointsAwarded)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">{noBonusCampaigns}</p>
        )}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">{helpText}</p>
    </section>
  );
}
