import type { ReactNode } from "react";

import type { CashierNetworkPhase } from "./useCashierNetworkResilience";

type CashierLayoutProps = {
  tenantName: string;
  connectionPhase: CashierNetworkPhase;
  onlineLabel: string;
  offlineLabel: string;
  reconnectingLabel: string;
  /** Küçük senkron göstergesi (ör. SyncStatusPill) */
  syncSlot?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

export function CashierLayout({
  tenantName,
  connectionPhase,
  onlineLabel,
  offlineLabel,
  reconnectingLabel,
  syncSlot,
  children,
  footer,
}: CashierLayoutProps) {
  const conn =
    connectionPhase === "online"
      ? { dot: "bg-emerald-500 ring-emerald-500/30", label: onlineLabel }
      : connectionPhase === "reconnecting"
        ? {
            dot: "bg-sky-500 ring-sky-500/30",
            label: reconnectingLabel,
          }
        : { dot: "bg-amber-500 ring-amber-500/30", label: offlineLabel };

  return (
    <div className="cashier-root flex min-h-[min(78vh,840px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 md:gap-3 md:px-5 md:py-3.5">
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 md:text-lg">
          {tenantName}
        </h1>
        {syncSlot ? (
          <div className="flex shrink-0 items-center md:order-none">{syncSlot}</div>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ${conn.dot}`}
            aria-hidden
          />
          <span className="text-slate-600">{conn.label}</span>
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">{children}</div>
        {footer}
      </div>
    </div>
  );
}
