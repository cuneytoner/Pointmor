import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import {
  getCashierBootstrap,
  getCustomers,
  getPendingClaims,
  getRewards,
  postCustomer,
  postRedemption,
  postRedemptionApprove,
  postRedemptionReject,
  postVisit,
  postVisitPreview,
  type CashierOperationIds,
} from "../lib/tenant-loyalty-api";
import {
  loadCashierOperationIds,
  saveCashierOperationIds,
} from "./cashierOperationStorage";
import {
  cashierReducer,
  initialCashierState,
  pushRecentCustomerId,
  type CashierState,
  type PollIntervalMode,
} from "./cashierReducer";
import {
  hadMeaningfulDraftOnLoad,
  saveCashierSessionDraft,
  loadCashierSessionDraft,
} from "./cashierSessionDraft";
import { parseCashierApiError } from "./parseCashierApiError";
import { CashierLayout } from "./CashierLayout";
import { CustomerPanel } from "./CustomerPanel";
import { AmountPanel } from "./AmountPanel";
import { SummaryPanel } from "./SummaryPanel";
import { RewardStrip } from "./RewardStrip";
import { CashierActionBar } from "./CashierActionBar";
import { SuccessToast } from "./SuccessToast";
import { InlineStatusNotice } from "./InlineStatusNotice";
import { ClaimPanel } from "./ClaimPanel";
import { SyncStatusPill } from "./SyncStatusPill";
import {
  useCashierSyncPolling,
  useDocumentHidden,
} from "./useCashierSyncPolling";
import { useCashierNetworkResilience } from "./useCashierNetworkResilience";
import { OfflineBanner } from "./OfflineBanner";
import { RestoreDraftNotice } from "./RestoreDraftNotice";

function buildInitialCashierState(): CashierState {
  const d = loadCashierSessionDraft();
  if (!d) return initialCashierState;
  return {
    ...initialCashierState,
    selectedCustomerId: d.selectedCustomerId ?? "",
    amountInput: d.amountInput ?? "",
    selectedRewardId: d.selectedRewardId ?? null,
  };
}

export function CashierPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const { auth } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const permVisit = hasPermission("visits.create");
  const permRedeem = hasPermission("redemptions.create");
  const permApprove = hasPermission("redemptions.approve");
  const permReject = hasPermission("redemptions.reject");
  const permCreateCustomer = hasPermission("customers.create");

  const [state, dispatch] = useReducer(
    cashierReducer,
    undefined,
    buildInitialCashierState,
  );
  const [reconnectedFlash, setReconnectedFlash] = useState(false);
  const [draftRestoredVisible, setDraftRestoredVisible] = useState(
    hadMeaningfulDraftOnLoad,
  );
  const [cashierOpCtx, setCashierOpCtx] = useState<CashierOperationIds | null>(
    () => loadCashierOperationIds(),
  );
  const [cashierBranchName, setCashierBranchName] = useState<string | null>(null);
  const reconnectToastAt = useRef(0);
  const lastVisitTap = useRef(0);
  const lastRedeemTap = useRef(0);
  const lastClaimTap = useRef(0);
  const amountRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedCustomerIdRef = useRef(state.selectedCustomerId);
  selectedCustomerIdRef.current = state.selectedCustomerId;
  const lastSyncedAtRef = useRef<number | null>(null);
  const syncStatusRef = useRef(state.syncStatus);
  lastSyncedAtRef.current = state.lastSyncedAt;
  syncStatusRef.current = state.syncStatus;

  const documentHidden = useDocumentHidden();

  const tenantName =
    auth?.tenant?.name?.trim() || t("tenantLoyalty.cashier.fallbackTenant");

  const refreshCustomers = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    return getCustomers(token)
      .then((rows) => {
        dispatch({ type: "SET_CUSTOMERS", payload: rows });
        dispatch({ type: "SET_CUSTOMERS_LOAD_ERROR", payload: false });
      })
      .catch(() => {
        dispatch({ type: "SET_CUSTOMERS_LOAD_ERROR", payload: true });
      });
  }, [token]);

  const loadRewards = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve();
    return getRewards(token, true)
      .then((rows) => {
        dispatch({ type: "SET_REWARDS", payload: rows });
        dispatch({ type: "SET_REWARDS_LOAD_ERROR", payload: false });
      })
      .catch(() => dispatch({ type: "SET_REWARDS_LOAD_ERROR", payload: true }));
  }, [token]);

  const syncCashierSelection = useCallback(
    async (mode: "full" | "silent", customerId: string) => {
      if (!token?.trim() || !customerId.trim()) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (mode === "full") {
          dispatch({ type: "SET_CLAIMS_LOADING", payload: false });
        }
        return;
      }

      if (mode === "full") {
        dispatch({ type: "SET_CLAIMS_LOADING", payload: true });
        dispatch({ type: "SET_CLAIMS_ERROR", payload: null });
      }

      dispatch({ type: "SET_SYNC_STATUS", payload: "syncing" });

      try {
        const [claims, customers, rewards] = await Promise.all([
          getPendingClaims(token, customerId),
          getCustomers(token),
          getRewards(token, true),
        ]);

        if (selectedCustomerIdRef.current !== customerId) return;

        dispatch({ type: "SET_PENDING_CLAIMS", payload: claims });
        dispatch({ type: "SET_CUSTOMERS", payload: customers });
        dispatch({ type: "SET_CUSTOMERS_LOAD_ERROR", payload: false });
        dispatch({ type: "SET_REWARDS", payload: rewards });
        dispatch({ type: "SET_REWARDS_LOAD_ERROR", payload: false });
        dispatch({ type: "SET_LAST_SYNCED_AT", payload: Date.now() });
        dispatch({ type: "SET_SYNC_STATUS", payload: "fresh" });
        dispatch({ type: "SET_CLAIMS_ERROR", payload: null });
      } catch {
        if (selectedCustomerIdRef.current !== customerId) return;
        if (mode === "full") {
          dispatch({
            type: "SET_CLAIMS_ERROR",
            payload: t("tenantLoyalty.cashier.claimsLoadError"),
          });
        }
        dispatch({ type: "SET_SYNC_STATUS", payload: "error" });
      } finally {
        if (mode === "full") {
          dispatch({ type: "SET_CLAIMS_LOADING", payload: false });
        }
      }
    },
    [token, t],
  );

  const recoverFromNetwork = useCallback(async () => {
    if (!token?.trim()) return;
    await Promise.all([refreshCustomers(), loadRewards()]);
    const cid = selectedCustomerIdRef.current;
    if (cid.trim()) await syncCashierSelection("silent", cid);
    const n = Date.now();
    if (n - reconnectToastAt.current > 9000) {
      reconnectToastAt.current = n;
      setReconnectedFlash(true);
      window.setTimeout(() => setReconnectedFlash(false), 3200);
    }
  }, [token, refreshCustomers, loadRewards, syncCashierSelection]);

  const { phase: networkPhase, isSubmitBlocked } =
    useCashierNetworkResilience(recoverFromNetwork);

  useEffect(() => {
    if (!token?.trim()) return;
    refreshCustomers();
    loadRewards();
  }, [token, refreshCustomers, loadRewards]);

  useEffect(() => {
    if (!token?.trim()) return;
    void getCashierBootstrap(token)
      .then((b) => {
        setCashierBranchName(b.myOpenShift?.deviceSession?.branch?.name ?? null);
        if (b.myOpenShift) {
          const next: CashierOperationIds = {
            deviceSessionId: b.myOpenShift.deviceSessionId,
            cashierShiftId: b.myOpenShift.id,
          };
          saveCashierOperationIds(next);
          setCashierOpCtx(next);
        }
      })
      .catch(() => {
        /* sessiz */
      });
  }, [token]);

  useEffect(() => {
    if (!token?.trim() || !state.selectedCustomerId) {
      dispatch({ type: "SET_PENDING_CLAIMS", payload: null });
      dispatch({ type: "SET_CLAIMS_ERROR", payload: null });
      dispatch({ type: "SET_CLAIMS_LOADING", payload: false });
      return;
    }
    void syncCashierSelection("full", state.selectedCustomerId);
  }, [token, state.selectedCustomerId, syncCashierSelection]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (syncStatusRef.current === "syncing") return;
      const at = lastSyncedAtRef.current;
      if (at == null || syncStatusRef.current !== "fresh") return;
      if (Date.now() - at > 45_000) {
        dispatch({ type: "SET_SYNC_STATUS", payload: "stale" });
      }
    }, 4_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let mode: PollIntervalMode = "slow";
    if (!state.selectedCustomerId.trim()) mode = "slow";
    else if (documentHidden) mode = "slow";
    else if ((state.pendingClaims?.length ?? 0) > 0) mode = "fast";
    else mode = "normal";
    dispatch({ type: "SET_POLL_INTERVAL_MODE", payload: mode });
  }, [state.selectedCustomerId, state.pendingClaims, documentHidden]);

  const selected = useMemo(() => {
    if (!state.customers || !state.selectedCustomerId) return null;
    return state.customers.find((c) => c.id === state.selectedCustomerId) ?? null;
  }, [state.customers, state.selectedCustomerId]);

  const balance = selected?.loyaltyAccount?.pointsBalance ?? 0;

  const filtered = useMemo(() => {
    if (!state.customers) return [];
    const s = state.customerQuery.trim().toLowerCase();
    if (!s) return state.customers.slice(0, 80);
    return state.customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone.toLowerCase().includes(s),
      )
      .slice(0, 80);
  }, [state.customers, state.customerQuery]);

  const recentCustomers = useMemo(() => {
    if (!state.customers?.length) return [];
    const byId = new Map(state.customers.map((c) => [c.id, c]));
    return state.recentCustomerIds
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof state.customers;
  }, [state.customers, state.recentCustomerIds]);

  const amountNum = Number(state.amountInput);
  const hasValidAmount =
    state.amountInput.trim() !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  const pendingRewardIds = useMemo(() => {
    const pc = state.pendingClaims;
    if (!pc?.length) return new Set<string>();
    return new Set(pc.map((c) => c.reward.id));
  }, [state.pendingClaims]);

  const eligibleRewards = useMemo(() => {
    if (!state.rewards) return [];
    return state.rewards.filter(
      (r) =>
        r.isActive &&
        r.pointsCost <= balance &&
        !pendingRewardIds.has(r.id),
    );
  }, [state.rewards, balance, pendingRewardIds]);

  useEffect(() => {
    if (
      state.selectedRewardId &&
      !eligibleRewards.some((r) => r.id === state.selectedRewardId)
    ) {
      dispatch({ type: "SELECT_REWARD", payload: null });
    }
  }, [eligibleRewards, state.selectedRewardId]);

  useEffect(() => {
    if (!token?.trim() || !state.selectedCustomerId) {
      dispatch({ type: "SET_PREVIEW", payload: null });
      dispatch({ type: "SET_PREVIEW_ERROR", payload: null });
      dispatch({ type: "SET_PREVIEW_LOADING", payload: false });
      return;
    }
    if (!permVisit) {
      dispatch({ type: "SET_PREVIEW", payload: null });
      dispatch({ type: "SET_PREVIEW_ERROR", payload: null });
      dispatch({ type: "SET_PREVIEW_LOADING", payload: false });
      return;
    }
    if (!hasValidAmount) {
      dispatch({ type: "SET_PREVIEW", payload: null });
      dispatch({ type: "SET_PREVIEW_ERROR", payload: null });
      dispatch({ type: "SET_PREVIEW_LOADING", payload: false });
      return;
    }
    if (networkPhase !== "online") {
      dispatch({ type: "SET_PREVIEW", payload: null });
      dispatch({ type: "SET_PREVIEW_LOADING", payload: false });
      dispatch({
        type: "SET_PREVIEW_ERROR",
        payload:
          networkPhase === "offline"
            ? t("tenantLoyalty.cashier.previewOfflineHint")
            : null,
      });
      return;
    }

    let cancelled = false;
    dispatch({ type: "SET_PREVIEW_LOADING", payload: true });
    dispatch({ type: "SET_PREVIEW_ERROR", payload: null });
    const tid = window.setTimeout(() => {
      postVisitPreview(
        token,
        {
          customerId: state.selectedCustomerId,
          amount: amountNum,
        },
        cashierOpCtx,
      )
        .then((p) => {
          if (!cancelled) {
            dispatch({ type: "SET_PREVIEW", payload: p });
            dispatch({ type: "SET_PREVIEW_ERROR", payload: null });
          }
        })
        .catch(() => {
          if (!cancelled) {
            dispatch({ type: "SET_PREVIEW", payload: null });
            dispatch({
              type: "SET_PREVIEW_ERROR",
              payload: t("tenantLoyalty.visits.previewError"),
            });
          }
        })
        .finally(() => {
          if (!cancelled) dispatch({ type: "SET_PREVIEW_LOADING", payload: false });
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [
    token,
    state.selectedCustomerId,
    state.amountInput,
    hasValidAmount,
    amountNum,
    networkPhase,
    permVisit,
    t,
    cashierOpCtx,
  ]);

  useEffect(() => {
    if (state.selectedCustomerId && amountRef.current) {
      const tmr = window.setTimeout(() => amountRef.current?.focus(), 80);
      return () => window.clearTimeout(tmr);
    }
    return undefined;
  }, [state.selectedCustomerId]);

  const campaignTypeLabel = useCallback(
    (type: string) => {
      const k = `tenantLoyalty.campaigns.types.${type}` as const;
      const label = t(k);
      return label === k ? type : label;
    },
    [t],
  );

  const formatClaimWhen = useCallback(
    (iso: string) => {
      try {
        return new Date(iso).toLocaleString(locale, {
          dateStyle: "short",
          timeStyle: "short",
        });
      } catch {
        return iso;
      }
    },
    [locale],
  );

  const loading =
    state.customers === null && !state.customersLoadError;

  const pollListRefresh = useCallback(async () => {
    await Promise.all([refreshCustomers(), loadRewards()]);
  }, [refreshCustomers, loadRewards]);

  const pollCustomerIdRef = useRef(state.selectedCustomerId);
  pollCustomerIdRef.current = state.selectedCustomerId;

  const pollSelectionSilent = useCallback(async () => {
    const id = pollCustomerIdRef.current;
    if (!id.trim()) return;
    await syncCashierSelection("silent", id);
  }, [syncCashierSelection]);

  useCashierSyncPolling({
    enabled: Boolean(
      token?.trim() && state.customers !== null && !state.customersLoadError,
    ),
    token,
    selectedCustomerId: state.selectedCustomerId,
    pendingClaimCount: state.pendingClaims?.length ?? 0,
    documentHidden,
    backgroundPollingDisabled: state.backgroundPollingDisabled,
    networkOnline: networkPhase === "online",
    onPollList: pollListRefresh,
    onPollSelection: pollSelectionSilent,
  });

  const canCompleteVisit = Boolean(
    permVisit &&
      state.selectedCustomerId &&
      hasValidAmount &&
      state.submissionState === "idle" &&
      !state.claimAction &&
      networkPhase === "online",
  );

  const selectedReward = state.rewards?.find(
    (r) => r.id === state.selectedRewardId,
  );
  const canUseReward = Boolean(
    permRedeem &&
      state.selectedCustomerId &&
      state.selectedRewardId &&
      selectedReward &&
      balance >= selectedReward.pointsCost &&
      state.submissionState === "idle" &&
      !state.claimAction &&
      networkPhase === "online",
  );

  const helperText = useMemo(() => {
    if (!state.selectedCustomerId) {
      return t("tenantLoyalty.cashier.helperNeedCustomer");
    }
    if (hasValidAmount && state.selectedRewardId) {
      return t("tenantLoyalty.cashier.helperBoth");
    }
    if (hasValidAmount) {
      return t("tenantLoyalty.cashier.helperVisit");
    }
    if (state.selectedRewardId) {
      return t("tenantLoyalty.cashier.helperRedeemOnly");
    }
    return t("tenantLoyalty.cashier.helperVisit");
  }, [state.selectedCustomerId, hasValidAmount, state.selectedRewardId, t]);

  const actionHelperText = useMemo(() => {
    if (networkPhase === "offline") {
      return t("tenantLoyalty.cashier.actionBarOffline");
    }
    if (networkPhase === "reconnecting") {
      return t("tenantLoyalty.cashier.actionBarReconnecting");
    }
    return helperText;
  }, [networkPhase, helperText, t]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveCashierSessionDraft({
        selectedCustomerId: state.selectedCustomerId,
        amountInput: state.amountInput,
        selectedRewardId: state.selectedRewardId,
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [state.selectedCustomerId, state.amountInput, state.selectedRewardId]);

  useEffect(() => {
    if (!draftRestoredVisible) return undefined;
    const id = window.setTimeout(() => setDraftRestoredVisible(false), 10000);
    return () => window.clearTimeout(id);
  }, [draftRestoredVisible]);

  const onCompleteVisit = useCallback(async () => {
    if (!token || !permVisit || !canCompleteVisit || networkPhase !== "online") return;
    const now = Date.now();
    if (now - lastVisitTap.current < 650) return;
    lastVisitTap.current = now;
    dispatch({ type: "SET_INLINE_ERROR", payload: null });
    dispatch({ type: "SET_SUBMISSION", payload: "visit" });
    try {
      const res = await postVisit(
        token,
        {
          customerId: state.selectedCustomerId,
          amount: amountNum,
        },
        cashierOpCtx,
      );
      dispatch({ type: "SET_LAST_VISIT", payload: res });
      dispatch({ type: "RESET_AMOUNT_AFTER_VISIT" });
      dispatch({ type: "SET_SUCCESS_FLASH_REDEEM", payload: false });
      dispatch({ type: "SET_SUCCESS_FLASH", payload: true });
      window.setTimeout(() => dispatch({ type: "SET_SUCCESS_FLASH", payload: false }), 4500);
      const newBal =
        balance + res.totalPointsAwarded;
      dispatch({
        type: "PATCH_CUSTOMER_BALANCE",
        payload: {
          customerId: state.selectedCustomerId,
          pointsBalance: newBal,
        },
      });
      void syncCashierSelection("silent", state.selectedCustomerId);
      window.setTimeout(() => amountRef.current?.focus(), 120);
    } catch (err) {
      dispatch({
        type: "SET_INLINE_ERROR",
        payload: parseCashierApiError(err, t),
      });
    } finally {
      dispatch({ type: "SET_SUBMISSION", payload: "idle" });
    }
  }, [
    token,
    canCompleteVisit,
    state.selectedCustomerId,
    amountNum,
    balance,
    syncCashierSelection,
    networkPhase,
    cashierOpCtx,
    permVisit,
    t,
  ]);

  const onUseReward = useCallback(async () => {
    if (!token || !permRedeem || !canUseReward || !state.selectedRewardId || networkPhase !== "online")
      return;
    const now = Date.now();
    if (now - lastRedeemTap.current < 650) return;
    lastRedeemTap.current = now;
    dispatch({ type: "SET_INLINE_ERROR", payload: null });
    dispatch({ type: "SET_SUBMISSION", payload: "redeem" });
    const cost = selectedReward!.pointsCost;
    try {
      await postRedemption(
        token,
        {
          customerId: state.selectedCustomerId,
          rewardId: state.selectedRewardId,
        },
        cashierOpCtx,
      );
      dispatch({
        type: "PATCH_CUSTOMER_BALANCE",
        payload: {
          customerId: state.selectedCustomerId,
          pointsBalance: Math.max(0, balance - cost),
        },
      });
      dispatch({ type: "SELECT_REWARD", payload: null });
      dispatch({ type: "SET_SUCCESS_FLASH", payload: false });
      dispatch({ type: "SET_SUCCESS_FLASH_REDEEM", payload: true });
      window.setTimeout(
        () => dispatch({ type: "SET_SUCCESS_FLASH_REDEEM", payload: false }),
        3500,
      );
      void syncCashierSelection("silent", state.selectedCustomerId);
    } catch (err) {
      dispatch({
        type: "SET_INLINE_ERROR",
        payload: parseCashierApiError(err, t),
      });
    } finally {
      dispatch({ type: "SET_SUBMISSION", payload: "idle" });
    }
  }, [
    token,
    canUseReward,
    state.selectedCustomerId,
    state.selectedRewardId,
    selectedReward,
    balance,
    syncCashierSelection,
    networkPhase,
    cashierOpCtx,
    permRedeem,
    t,
  ]);

  const onApproveClaim = useCallback(
    async (redemptionId: string) => {
      if (!token || !permApprove || !state.selectedCustomerId || networkPhase !== "online") return;
      const now = Date.now();
      if (now - lastClaimTap.current < 550) return;
      lastClaimTap.current = now;
      dispatch({ type: "SET_INLINE_ERROR", payload: null });
      dispatch({
        type: "SET_CLAIM_ACTION",
        payload: { id: redemptionId, kind: "approve" },
      });
      try {
        const row = await postRedemptionApprove(
          token,
          redemptionId,
          cashierOpCtx,
        );
        const cost = row.pointsSpent;
        dispatch({
          type: "PATCH_CUSTOMER_BALANCE",
          payload: {
            customerId: state.selectedCustomerId,
            pointsBalance: Math.max(0, balance - cost),
          },
        });
        dispatch({ type: "SET_CLAIM_TOAST", payload: "approved" });
        window.setTimeout(
          () => dispatch({ type: "SET_CLAIM_TOAST", payload: null }),
          4000,
        );
        void syncCashierSelection("silent", state.selectedCustomerId);
      } catch (err) {
        dispatch({
          type: "SET_INLINE_ERROR",
          payload: parseCashierApiError(err, t),
        });
      } finally {
        dispatch({ type: "SET_CLAIM_ACTION", payload: null });
      }
    },
    [
      token,
      state.selectedCustomerId,
      balance,
      syncCashierSelection,
      networkPhase,
      cashierOpCtx,
      permApprove,
      t,
    ],
  );

  const onRejectClaim = useCallback(
    async (redemptionId: string) => {
      if (!token || !permReject || !state.selectedCustomerId || networkPhase !== "online") return;
      const now = Date.now();
      if (now - lastClaimTap.current < 550) return;
      lastClaimTap.current = now;
      dispatch({ type: "SET_INLINE_ERROR", payload: null });
      dispatch({
        type: "SET_CLAIM_ACTION",
        payload: { id: redemptionId, kind: "reject" },
      });
      try {
        await postRedemptionReject(token, redemptionId);
        dispatch({ type: "SET_CLAIM_TOAST", payload: "rejected" });
        window.setTimeout(
          () => dispatch({ type: "SET_CLAIM_TOAST", payload: null }),
          4000,
        );
        void syncCashierSelection("silent", state.selectedCustomerId);
      } catch (err) {
        dispatch({
          type: "SET_INLINE_ERROR",
          payload: parseCashierApiError(err, t),
        });
      } finally {
        dispatch({ type: "SET_CLAIM_ACTION", payload: null });
      }
    },
    [
      token,
      state.selectedCustomerId,
      syncCashierSelection,
      networkPhase,
      permReject,
      t,
    ],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tEl = e.target as HTMLElement | null;
      if (tEl?.closest?.("[data-cashier-suppress-enter]")) return;
      if (state.submissionState !== "idle" || state.claimAction) return;
      if (networkPhase !== "online") return;
      e.preventDefault();
      if (canCompleteVisit) {
        void onCompleteVisit();
      } else if (canUseReward) {
        void onUseReward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    canCompleteVisit,
    canUseReward,
    onCompleteVisit,
    onUseReward,
    state.submissionState,
    state.claimAction,
    networkPhase,
  ]);

  const onSelectCustomer = (id: string) => {
    dispatch({ type: "SELECT_CUSTOMER", payload: id });
    const next = pushRecentCustomerId(id);
    dispatch({ type: "SET_RECENT_IDS", payload: next });
  };

  const onQuickCreate = async () => {
    if (!token || !permCreateCustomer || !state.qcName.trim() || !state.qcPhone.trim()) return;
    if (networkPhase !== "online") {
      dispatch({
        type: "SET_INLINE_ERROR",
        payload: t("tenantLoyalty.cashier.quickCreateOffline"),
      });
      return;
    }
    dispatch({ type: "SET_SUBMISSION", payload: "quick" });
    dispatch({ type: "SET_INLINE_ERROR", payload: null });
    try {
      const c = await postCustomer(token, {
        name: state.qcName.trim(),
        phone: state.qcPhone.trim(),
      });
      await refreshCustomers();
      dispatch({ type: "SELECT_CUSTOMER", payload: c.id });
      dispatch({ type: "SET_QC_NAME", payload: "" });
      dispatch({ type: "SET_QC_PHONE", payload: "" });
      dispatch({ type: "SET_QUICK_CREATE_OPEN", payload: false });
      const next = pushRecentCustomerId(c.id);
      dispatch({ type: "SET_RECENT_IDS", payload: next });
    } catch {
      dispatch({
        type: "SET_INLINE_ERROR",
        payload: t("tenantLoyalty.visits.loadError"),
      });
    } finally {
      dispatch({ type: "SET_SUBMISSION", payload: "idle" });
    }
  };

  const keypadHandler = (k: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "clear" | "0" | "back") => {
    if (k === "clear") {
      dispatch({ type: "SET_AMOUNT", payload: "" });
      return;
    }
    if (k === "back") {
      dispatch({
        type: "SET_AMOUNT",
        payload: state.amountInput.slice(0, -1),
      });
      return;
    }
    dispatch({
      type: "SET_AMOUNT",
      payload: (state.amountInput + k).replace(/\D/g, "").slice(0, 12),
    });
  };

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.cashier.eyebrow")}
      title={t("tenantLoyalty.cashier.title")}
      description=""
    >
      <p className="mb-4 text-sm text-slate-600">{t("tenantLoyalty.cashier.lead")}</p>
      {cashierOpCtx ? (
        <p className="mb-3 text-xs text-emerald-800">
          {t("tenantLoyalty.cashier.operationContextOn")}
        </p>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          {t("tenantLoyalty.cashier.operationContextOff")}
        </p>
      )}

      <SuccessToast
        visible={
          reconnectedFlash ||
          state.successFlash ||
          state.successFlashRedeem ||
          state.claimToast !== null
        }
        message={
          reconnectedFlash
            ? t("tenantLoyalty.cashier.reconnectedToast")
            : state.claimToast === "approved"
              ? t("tenantLoyalty.cashier.claimApprovedToast")
              : state.claimToast === "rejected"
                ? t("tenantLoyalty.cashier.claimRejectedToast")
                : state.successFlashRedeem
                  ? t("tenantLoyalty.cashier.redeemSuccess")
                  : state.lastVisitResult
                    ? t("tenantLoyalty.visits.posSuccess", {
                        n: String(state.lastVisitResult.totalPointsAwarded),
                      })
                    : ""
        }
      />

      {loading ? (
        <p className="text-slate-600">{t("tenantLoyalty.common.loading")}</p>
      ) : state.customersLoadError ? (
        <InlineStatusNotice
          variant="error"
          message={t("tenantLoyalty.visits.loadError")}
        />
      ) : (
        <div className="flex min-h-[min(85vh,920px)] flex-col">
          <CashierLayout
            tenantName={tenantName}
            branchName={cashierBranchName}
            connectionPhase={networkPhase}
            onlineLabel={t("tenantLoyalty.cashier.online")}
            offlineLabel={t("tenantLoyalty.cashier.offline")}
            reconnectingLabel={t("tenantLoyalty.cashier.reconnecting")}
            syncSlot={
              <SyncStatusPill
                syncStatus={state.syncStatus}
                lastSyncedAt={state.lastSyncedAt}
                labels={{
                  syncing: t("tenantLoyalty.cashier.syncPillSyncing"),
                  freshJustNow: t("tenantLoyalty.cashier.syncPillFreshJustNow"),
                  stale: t("tenantLoyalty.cashier.syncPillStale"),
                  error: t("tenantLoyalty.cashier.syncPillError"),
                  freshAgo: (sec) =>
                    sec < 90
                      ? t("tenantLoyalty.cashier.syncPillFreshAgoSec", {
                          n: String(sec),
                        })
                      : t("tenantLoyalty.cashier.syncPillFreshAgoMin", {
                          n: String(Math.max(1, Math.round(sec / 60))),
                        }),
                }}
              />
            }
            footer={
              <CashierActionBar
                completeLabel={t("tenantLoyalty.visits.posComplete")}
                useRewardLabel={t("tenantLoyalty.cashier.useReward")}
                submittingVisitLabel={t("tenantLoyalty.visits.posSubmitting")}
                submittingRedeemLabel={t("tenantLoyalty.cashier.submittingRedeem")}
                helperText={actionHelperText}
                canCompleteVisit={canCompleteVisit}
                canUseReward={canUseReward}
                showVisitAction={permVisit}
                showRedeemAction={permRedeem}
                noPermissionHint={
                  !permVisit && !permRedeem ? t("rbac.cashierNoActions") : undefined
                }
                loadingTarget={
                  state.submissionState === "visit"
                    ? "visit"
                    : state.submissionState === "redeem"
                      ? "redeem"
                      : null
                }
                onCompleteVisit={() => void onCompleteVisit()}
                onUseReward={() => void onUseReward()}
              />
            }
          >
            <OfflineBanner
              phase={networkPhase}
              labels={{
                offline: t("tenantLoyalty.cashier.offlineBanner"),
                reconnecting: t("tenantLoyalty.cashier.reconnectingBanner"),
              }}
            />
            <RestoreDraftNotice
              visible={draftRestoredVisible}
              message={t("tenantLoyalty.cashier.draftRestored")}
            />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 min-[768px]:gap-5 lg:max-w-none">
              <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[768px]:max-[1279px]:landscape:grid-cols-[minmax(200px,0.92fr)_minmax(260px,1.12fr)_minmax(220px,0.96fr)] lg:grid-cols-3">
                <div className="max-[767px]:order-2 min-[768px]:order-1 lg:order-1">
                  <CustomerPanel
                    searchPlaceholder={t("tenantLoyalty.visits.searchPlaceholder")}
                    noMatches={t("tenantLoyalty.visits.posNoMatches")}
                    pointsSuffix={t("tenantLoyalty.visits.pointsSuffix")}
                    quickCreateLabel={t("tenantLoyalty.visits.quickCreate")}
                    qcNameLabel={t("tenantLoyalty.visits.qcName")}
                    qcPhoneLabel={t("tenantLoyalty.visits.qcPhone")}
                    qcSubmitLabel={t("tenantLoyalty.visits.qcSubmit")}
                    selectedHeading={t("tenantLoyalty.cashier.selectedLabel")}
                    recentHeading={t("tenantLoyalty.cashier.recentLabel")}
                    searchRef={searchRef}
                    customerQuery={state.customerQuery}
                    onCustomerQueryChange={(v) =>
                      dispatch({ type: "SET_CUSTOMER_QUERY", payload: v })
                    }
                    filteredCustomers={filtered}
                    recentCustomers={recentCustomers}
                    selectedCustomer={selected}
                    selectedCustomerId={state.selectedCustomerId}
                    onSelectCustomer={onSelectCustomer}
                    quickCreateOpen={state.quickCreateOpen}
                    onToggleQuickCreate={() =>
                      dispatch({
                        type: "SET_QUICK_CREATE_OPEN",
                        payload: !state.quickCreateOpen,
                      })
                    }
                    qcName={state.qcName}
                    qcPhone={state.qcPhone}
                    onQcNameChange={(v) =>
                      dispatch({ type: "SET_QC_NAME", payload: v })
                    }
                    onQcPhoneChange={(v) =>
                      dispatch({ type: "SET_QC_PHONE", payload: v })
                    }
                    onQuickCreateSubmit={() => void onQuickCreate()}
                    quickCreateBusy={state.submissionState === "quick"}
                    allowQuickCreate={permCreateCustomer}
                  />
                </div>
                <div className="max-[767px]:order-1 min-[768px]:order-2 lg:order-2">
                  <AmountPanel
                    title={t("tenantLoyalty.visits.posColumnAmount")}
                    hint={t("tenantLoyalty.visits.amountHint")}
                    keypadClear={t("tenantLoyalty.visits.keypadClear")}
                    keypadBack="⌫"
                    amountRef={amountRef}
                    amountInput={state.amountInput}
                    onAmountChange={(digits) =>
                      dispatch({ type: "SET_AMOUNT", payload: digits })
                    }
                    onKeypad={keypadHandler}
                  />
                </div>
                <div className="order-3">
                  <SummaryPanel
                    title={t("tenantLoyalty.visits.posColumnSummary")}
                    baseLabel={t("tenantLoyalty.visits.base")}
                    bonusLabel={t("tenantLoyalty.visits.bonus")}
                    totalLabel={t("tenantLoyalty.visits.total")}
                    campaignsTitle={t("tenantLoyalty.visits.posCampaignsPreview")}
                    previewPlaceholder={t(
                      "tenantLoyalty.visits.posPreviewPlaceholder",
                    )}
                    noBonusCampaigns={t(
                      "tenantLoyalty.visits.posNoBonusCampaigns",
                    )}
                    helpText={t("tenantLoyalty.cashier.summaryHelp")}
                    preview={state.preview}
                    previewLoading={state.previewLoading}
                    previewError={state.previewError}
                    hasCustomer={Boolean(state.selectedCustomerId)}
                    hasAmount={hasValidAmount}
                    campaignTypeLabel={campaignTypeLabel}
                  />
                </div>
              </div>

              {state.selectedCustomerId ? (
                <ClaimPanel
                  title={t("tenantLoyalty.cashier.claimsTitle")}
                  intro={t("tenantLoyalty.cashier.claimsIntro")}
                  empty={t("tenantLoyalty.cashier.claimsEmpty")}
                  claims={state.pendingClaims}
                  loading={state.claimsLoading}
                  error={state.claimsError}
                  pendingLabel={t("tenantLoyalty.redemptions.status.pending")}
                  pointsLabel={t("tenantLoyalty.cashier.claimPoints")}
                  approveLabel={t("tenantLoyalty.redemptions.approve")}
                  rejectLabel={t("tenantLoyalty.redemptions.reject")}
                  formatWhen={formatClaimWhen}
                  claimAction={state.claimAction}
                  customerSyncState={
                    state.customerSyncState === "refreshing"
                      ? "refreshing"
                      : state.customerSyncState === "error"
                        ? "error"
                        : "idle"
                  }
                  hintIdle={t("tenantLoyalty.cashier.syncHintIdle")}
                  hintRefreshing={t("tenantLoyalty.cashier.syncHintRefreshing")}
                  hintError={t("tenantLoyalty.cashier.syncHintError")}
                  refreshLabel={t("tenantLoyalty.cashier.syncRefresh")}
                  onRefresh={() =>
                    void syncCashierSelection("full", state.selectedCustomerId)
                  }
                  onApprove={(id) => void onApproveClaim(id)}
                  onReject={(id) => void onRejectClaim(id)}
                  canApprove={permApprove}
                  canReject={permReject}
                  networkBlocked={isSubmitBlocked}
                />
              ) : null}

              {state.rewardsLoadError ? (
                <InlineStatusNotice
                  variant="error"
                  message={t("tenantLoyalty.rewards.loadError")}
                />
              ) : (
                <RewardStrip
                  title={t("tenantLoyalty.cashier.rewardsTitle")}
                  empty={t("tenantLoyalty.cashier.rewardsEmpty")}
                  pointsSuffix={t("tenantLoyalty.visits.pointsSuffix")}
                  costLabel={t("tenantLoyalty.cashier.rewardCost")}
                  readyLabel={t("tenantLoyalty.cashier.rewardReady")}
                  insufficientLabel={t("tenantLoyalty.cashier.rewardInsufficient")}
                  balanceLine={t("tenantLoyalty.cashier.balanceLine", {
                    n: String(balance),
                  })}
                  eligibleRewards={eligibleRewards}
                  selectedRewardId={state.selectedRewardId}
                  balance={balance}
                  onSelectReward={(id) =>
                    dispatch({ type: "SELECT_REWARD", payload: id })
                  }
                  footnote={
                    pendingRewardIds.size > 0
                      ? t("tenantLoyalty.cashier.rewardsHiddenPendingNote")
                      : null
                  }
                />
              )}

              {state.inlineError ? (
                <InlineStatusNotice
                  variant="error"
                  message={state.inlineError}
                />
              ) : null}
            </div>
          </CashierLayout>
        </div>
      )}
    </PageShell>
  );
}
