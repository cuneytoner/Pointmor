import { useEffect, useRef, useState } from "react";

/** Tab gizliyken aralığı uzatmak için kullanılır. */
export function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return hidden;
}

type UseCashierSyncPollingOpts = {
  enabled: boolean;
  token: string | null | undefined;
  /** Seçili müşteri yokken yavaş liste yenilemesi */
  onPollList: () => void | Promise<void>;
  /** Seçili müşteri için sessiz senkron */
  onPollSelection: () => void | Promise<void>;
  selectedCustomerId: string;
  pendingClaimCount: number;
  documentHidden: boolean;
  backgroundPollingDisabled: boolean;
  /** offline / reconnecting iken polling durur */
  networkOnline: boolean;
};

function computeIntervalMs(opts: {
  selectedCustomerId: string;
  pendingClaimCount: number;
  documentHidden: boolean;
}): number {
  if (opts.documentHidden) return 60_000;
  if (!opts.selectedCustomerId.trim()) return 60_000;
  if (opts.pendingClaimCount > 0) return 4_000;
  return 8_000;
}

/**
 * Tek recursive timeout: interval dinamik değişince bir sonraki turda uygulanır.
 * İlk tetikleme bir tur bekler (mount sonrası çift istek riskini azaltır).
 */
export function useCashierSyncPolling(opts: UseCashierSyncPollingOpts) {
  const {
    enabled,
    token,
    onPollList,
    onPollSelection,
    selectedCustomerId,
    pendingClaimCount,
    documentHidden,
    backgroundPollingDisabled,
    networkOnline,
  } = opts;

  const listRef = useRef(onPollList);
  const selRef = useRef(onPollSelection);
  listRef.current = onPollList;
  selRef.current = onPollSelection;

  useEffect(() => {
    if (!enabled || !token?.trim() || backgroundPollingDisabled || !networkOnline)
      return;

    let cancelled = false;
    let timeoutId: number;

    const tick = async () => {
      if (cancelled) return;
      try {
        if (selectedCustomerId.trim()) {
          await selRef.current();
        } else {
          await listRef.current();
        }
      } catch {
        /* hata reducer’da syncStatus ile yansır */
      }
    };

    const schedule = () => {
      const delay = computeIntervalMs({
        selectedCustomerId,
        pendingClaimCount,
        documentHidden,
      });
      timeoutId = window.setTimeout(async () => {
        await tick();
        if (!cancelled) schedule();
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    enabled,
    token,
    selectedCustomerId,
    pendingClaimCount,
    documentHidden,
    backgroundPollingDisabled,
    networkOnline,
  ]);
}
