import { useEffect, useState } from "react";
import type { CashierSyncStatus } from "./cashierReducer";

type SyncStatusPillProps = {
  syncStatus: CashierSyncStatus;
  lastSyncedAt: number | null;
  labels: {
    syncing: string;
    freshJustNow: string;
    freshAgo: (seconds: number) => string;
    stale: string;
    error: string;
  };
};

function ageSeconds(lastSyncedAt: number | null): number | null {
  if (lastSyncedAt == null) return null;
  return Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000));
}

export function SyncStatusPill({
  syncStatus,
  lastSyncedAt,
  labels,
}: SyncStatusPillProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (syncStatus !== "fresh") return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, [syncStatus]);

  if (syncStatus === "idle" && lastSyncedAt == null) return null;

  let tone: "neutral" | "ok" | "warn" | "bad" = "neutral";
  let text: string;

  if (syncStatus === "syncing") {
    tone = "neutral";
    text = labels.syncing;
  } else if (syncStatus === "error") {
    tone = "bad";
    text = labels.error;
  } else if (syncStatus === "stale") {
    tone = "warn";
    text = labels.stale;
  } else if (syncStatus === "fresh") {
    if (lastSyncedAt == null) return null;
    void tick;
    const sec = ageSeconds(lastSyncedAt) ?? 0;
    tone = "ok";
    text = sec < 6 ? labels.freshJustNow : labels.freshAgo(sec);
  } else {
    return null;
  }

  const ring =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50/90 text-amber-900"
        : tone === "bad"
          ? "border-red-200 bg-red-50/90 text-red-900"
          : "border-slate-200 bg-slate-50/90 text-slate-700";

  return (
    <span
      className={`inline-flex max-w-[14rem] items-center truncate rounded-full border px-2.5 py-1 text-xs font-medium ${ring}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </span>
  );
}
