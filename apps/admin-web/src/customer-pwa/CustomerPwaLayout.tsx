import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import {
  CUSTOMER_LAST_TENANT_SLUG_KEY,
  customerLastSeenBalanceKey,
  customerPwaSnapshotKey,
  customerTokenStorageKey,
  getCustomerPortalBootstrap,
  getCustomerPortalMe,
  postCustomerClaim,
  postCustomerPortalLogout,
  postCustomerPortalSession,
  type CustomerPortalBootstrap,
  type CustomerPortalDashboard,
} from "../lib/customer-portal-api";
import { CustomerPwaProvider, type CustomerPwaPhase } from "./CustomerPwaContext";
import { CustomerPwaChrome } from "./CustomerPwaChrome";
import { CustomerPwaGate } from "./CustomerPwaGate";
import { VisitSuccessSheet } from "./VisitSuccessSheet";
import { useLocaleActions } from "../contexts/LocaleContext";
import {
  resolveLanguage,
  resolveUiLocale,
  tenantLanguageStorageKey,
} from "../lib/resolveLanguage";
import "./customer-pwa.css";

const customerCookiesOnlySession =
  import.meta.env.VITE_CUSTOMER_SESSION_COOKIES_ONLY !== "false";

function persistSnapshot(tenantSlug: string, data: CustomerPortalDashboard) {
  try {
    localStorage.setItem(
      customerPwaSnapshotKey(tenantSlug),
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    /* ignore */
  }
}

export function CustomerPwaLayout() {
  const { tenantSlug = "" } = useParams<{ tenantSlug: string }>();
  const [searchParams] = useSearchParams();
  const { setLocale } = useLocaleActions();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<CustomerPwaPhase>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<CustomerPortalBootstrap | null>(null);
  const [data, setData] = useState<CustomerPortalDashboard | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [offlineStale, setOfflineStale] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);
  const [celebrationGain, setCelebrationGain] = useState<number | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const storageKey = customerTokenStorageKey(tenantSlug);
  const readLegacyToken = useCallback((): string | null => {
    if (customerCookiesOnlySession) return null;
    return localStorage.getItem(storageKey)?.trim() || null;
  }, [storageKey]);

  const clearCelebration = useCallback(() => setCelebrationGain(null), []);

  const applyReady = useCallback(
    (d: CustomerPortalDashboard, tok: string) => {
      try {
        const seenKey = customerLastSeenBalanceKey(tenantSlug);
        const raw = sessionStorage.getItem(seenKey);
        const prev = raw !== null && raw !== "" ? Number(raw) : null;
        if (prev !== null && !Number.isNaN(prev) && d.pointsBalance > prev) {
          setCelebrationGain(d.pointsBalance - prev);
        } else {
          setCelebrationGain(null);
        }
        sessionStorage.setItem(seenKey, String(d.pointsBalance));
      } catch {
        setCelebrationGain(null);
      }
      setData(d);
      setToken(tok || null);
      setPhase("ready");
      setOfflineStale(false);
      persistSnapshot(tenantSlug, d);
      try {
        localStorage.setItem(CUSTOMER_LAST_TENANT_SLUG_KEY, tenantSlug);
      } catch {
        /* ignore */
      }
    },
    [tenantSlug],
  );

  const refresh = useCallback(async () => {
    const tok = token ?? readLegacyToken();
    if (!tok && !customerCookiesOnlySession) return;
    try {
      const next = await getCustomerPortalMe(tenantSlug, tok);
      applyReady(next, tok ?? "");
    } catch {
      const raw = localStorage.getItem(customerPwaSnapshotKey(tenantSlug));
      if (raw) {
        try {
          const snap = JSON.parse(raw) as { data?: CustomerPortalDashboard };
          if (snap.data) {
            setData(snap.data);
            setToken(tok ?? null);
            setPhase("ready");
            setOfflineStale(true);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      setPhase("error");
      setErrorMessage(t("customerPortal.loadError"));
    }
  }, [tenantSlug, token, readLegacyToken, applyReady, t]);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMessage(null);
    (async () => {
      try {
        const boot = await getCustomerPortalBootstrap(tenantSlug);
        if (cancelled) return;
        setBootstrap(boot);
        const saved = readLegacyToken();
        if (saved) {
          try {
            const me = await getCustomerPortalMe(tenantSlug, saved);
            if (cancelled) return;
            applyReady(me, saved);
            return;
          } catch {
            localStorage.removeItem(storageKey);
            const raw = localStorage.getItem(customerPwaSnapshotKey(tenantSlug));
            if (raw) {
              try {
                const snap = JSON.parse(raw) as { data?: CustomerPortalDashboard };
                if (snap.data) {
                  setData(snap.data);
                  setToken(saved);
                  setPhase("ready");
                  setOfflineStale(true);
                  return;
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
        if (customerCookiesOnlySession) {
          try {
            const me = await getCustomerPortalMe(tenantSlug);
            if (cancelled) return;
            applyReady(me, "");
            return;
          } catch {
            // no active cookie session; continue to gate
          }
        }
        setPhase("gate");
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorMessage(t("customerPortal.notFoundTenant"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, storageKey, applyReady, readLegacyToken, t]);

  /** Kasiyer ziyareti sonrası bakiye — arka planda hafif yenileme + sekme görünür olunca sync. */
  useEffect(() => {
    if (phase !== "ready") return;
    const tok = token ?? readLegacyToken();
    if (!tok && !customerCookiesOnlySession) return;
    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    }, 7000);
    return () => clearInterval(poll);
  }, [phase, token, readLegacyToken, refresh]);

  useEffect(() => {
    if (phase !== "ready") return;
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, refresh]);

  const submitPhone = useCallback(
    async (phone: string) => {
      const res = await postCustomerPortalSession(tenantSlug, phone);
      const nextToken = res.token?.trim() || "";
      if (!customerCookiesOnlySession && nextToken) {
        localStorage.setItem(storageKey, nextToken);
      }
      applyReady(res, nextToken);
    },
    [tenantSlug, storageKey, applyReady],
  );

  const setGate = useCallback(() => {
    if (!customerCookiesOnlySession) localStorage.removeItem(storageKey);
    void postCustomerPortalLogout(tenantSlug).catch(() => {
      /* ignore logout failure */
    });
    try {
      sessionStorage.removeItem(customerLastSeenBalanceKey(tenantSlug));
    } catch {
      /* ignore */
    }
    setCelebrationGain(null);
    setToken(null);
    setData(null);
    setPhase("gate");
  }, [storageKey, tenantSlug]);

  const claimReward = useCallback(
    async (rewardId: string) => {
      const tok = token ?? readLegacyToken();
      if (!tok && !customerCookiesOnlySession) return;
      setClaimingId(rewardId);
      setClaimToast(null);
      try {
        await postCustomerClaim(tenantSlug, tok, rewardId);
        const next = await getCustomerPortalMe(tenantSlug, tok);
        applyReady(next, tok ?? "");
      } catch (err) {
        const e = err as { status?: number; body?: unknown };
        let errCode: string | undefined;
        if (e.body && typeof e.body === "object" && e.body !== null && "error" in e.body) {
          errCode = String((e.body as { error?: string }).error ?? "");
        }
        if (e.status === 409) {
          setClaimToast(
            errCode === "duplicate_pending_claim"
              ? t("customerPortal.duplicatePendingClaim")
              : t("customerPortal.insufficientPoints"),
          );
        } else {
          setClaimToast(t("customerPortal.loadError"));
        }
      } finally {
        setClaimingId(null);
      }
    },
    [tenantSlug, token, readLegacyToken, applyReady, t],
  );

  useEffect(() => {
    if (!claimToast) return;
    const id = window.setTimeout(() => setClaimToast(null), 5200);
    return () => window.clearTimeout(id);
  }, [claimToast]);

  const ctxValue = useMemo(
    () => ({
      tenantSlug,
      phase,
      errorMessage,
      bootstrap,
      data,
      token,
      offlineStale,
      celebrationGain,
      clearCelebration,
      refresh,
      setGate,
      submitPhone,
      claimReward,
      claimingId,
    }),
    [
      tenantSlug,
      phase,
      errorMessage,
      bootstrap,
      data,
      token,
      offlineStale,
      celebrationGain,
      clearCelebration,
      refresh,
      setGate,
      submitPhone,
      claimReward,
      claimingId,
    ],
  );

  const primary =
    bootstrap?.tenant.branding.primaryHex ?? data?.tenant?.branding.primaryHex ?? "#0056b3";

  useEffect(() => {
    if (!bootstrap) return;
    const ss = bootstrap.storeSettings;
    const defaultLanguage = ss?.defaultLanguage ?? "en";
    const supportedLanguages =
      ss?.supportedLanguages && ss.supportedLanguages.length > 0
        ? ss.supportedLanguages
        : ["en", "tr"];
    const langParam = searchParams.get("lang");
    const resolved = resolveLanguage({
      langParam,
      tenantSlug,
      supportedLanguages,
      defaultLanguage,
      navigatorLanguages:
        typeof navigator !== "undefined" ? navigator.languages : [],
    });
    try {
      localStorage.setItem(tenantLanguageStorageKey(tenantSlug), resolved);
    } catch {
      /* ignore */
    }
    setLocale(resolveUiLocale(resolved));
  }, [bootstrap, searchParams, setLocale, tenantSlug]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content") ?? "#0a1628";
    meta?.setAttribute("content", primary);
    return () => {
      meta?.setAttribute("content", prev);
    };
  }, [primary]);

  if (phase === "loading") {
    return (
      <div className="customer-pwa" style={{ ["--cp-primary" as string]: primary }}>
        <p className="customer-pwa__muted">{t("customerPortal.loading")}</p>
      </div>
    );
  }

  if (phase === "error" && errorMessage) {
    return (
      <div className="customer-pwa" style={{ ["--cp-primary" as string]: primary }}>
        <p className="customer-pwa__error" role="alert">
          {errorMessage}
        </p>
      </div>
    );
  }

  if (phase === "gate" && bootstrap) {
    return (
      <div className="customer-pwa" style={{ ["--cp-primary" as string]: primary }}>
        <CustomerPwaGate
          bootstrap={bootstrap}
          gateError={gateError}
          onDismissGateError={() => setGateError(null)}
          onSubmit={async (e: FormEvent, phone: string) => {
            e.preventDefault();
            setGateError(null);
            try {
              await submitPhone(phone);
            } catch (err) {
              const status = (err as { status?: number }).status;
              setGateError(
                status === 404
                  ? t("customerPortal.noAccountHint")
                  : t("customerPortal.loadError"),
              );
            }
          }}
        />
      </div>
    );
  }

  if (phase === "ready" && data) {
    return (
      <CustomerPwaProvider value={ctxValue}>
        <div
          className="customer-pwa customer-pwa--shell"
          style={{ ["--cp-primary" as string]: primary }}
        >
          {offlineStale ? (
            <p className="customer-pwa__banner" role="status">
              {t("customerPortal.offlineStale")}
            </p>
          ) : null}
          {claimToast ? (
            <p className="customer-pwa__toast customer-pwa__toast--error" role="status">
              {claimToast}
            </p>
          ) : null}
          {celebrationGain !== null && celebrationGain > 0 && data ? (
            <VisitSuccessSheet
              tenantSlug={tenantSlug}
              data={data}
              gain={celebrationGain}
              primaryHex={primary}
              onDismiss={clearCelebration}
            />
          ) : null}
          <CustomerPwaChrome>
            <Outlet />
          </CustomerPwaChrome>
        </div>
      </CustomerPwaProvider>
    );
  }

  return (
    <div className="customer-pwa">
      <p className="customer-pwa__muted">{t("customerPortal.loading")}</p>
    </div>
  );
}
