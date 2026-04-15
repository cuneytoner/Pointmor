import { useCallback, useEffect, useRef, useState } from "react";

/**
 * navigator + görünürlük; reconnecting sırasında submit/poll güvenli biçimde durur.
 * recover: müşteri listesi + ödüller + seçili müşteri sessiz sync (parent verir).
 */
export type CashierNetworkPhase = "online" | "reconnecting" | "offline";

export function useCashierNetworkResilience(recover: () => Promise<void>) {
  const recoverRef = useRef(recover);
  recoverRef.current = recover;

  const [phase, setPhase] = useState<CashierNetworkPhase>(() =>
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  );

  const recoveringRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);

  const runRecover = useCallback(async () => {
    if (recoveringRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    recoveringRef.current = true;
    try {
      await recoverRef.current();
    } finally {
      window.setTimeout(() => {
        recoveringRef.current = false;
      }, 1200);
    }
  }, []);

  useEffect(() => {
    const onOffline = () => setPhase("offline");

    const onOnline = () => {
      setPhase("reconnecting");
      void runRecover()
        .then(() => setPhase("online"))
        .catch(() => setPhase("offline"));
    };

    const onVis = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }
      const started = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!started) return;
      if (Date.now() - started < 2500) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setPhase("offline");
        return;
      }
      setPhase("reconnecting");
      void runRecover()
        .then(() => setPhase("online"))
        .catch(() => {});
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [runRecover]);

  const isSubmitBlocked = phase !== "online";
  const isPollingPaused = phase !== "online";

  return { phase, isSubmitBlocked, isPollingPaused, runRecover };
}
