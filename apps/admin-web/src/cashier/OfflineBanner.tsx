import type { CashierNetworkPhase } from "./useCashierNetworkResilience";

type OfflineBannerProps = {
  phase: CashierNetworkPhase;
  labels: {
    offline: string;
    reconnecting: string;
  };
};

export function OfflineBanner({ phase, labels }: OfflineBannerProps) {
  if (phase === "online") return null;

  const text = phase === "offline" ? labels.offline : labels.reconnecting;
  const tone =
    phase === "offline"
      ? "border-slate-300 bg-slate-100/95 text-slate-800"
      : "border-sky-200 bg-sky-50/95 text-sky-950";

  return (
    <div
      className={`mb-3 rounded-xl border px-3 py-2 text-center text-xs font-medium ${tone}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
