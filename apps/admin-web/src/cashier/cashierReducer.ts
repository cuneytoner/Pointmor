import type {
  CustomerWithBalance,
  PendingClaimRow,
  RewardDto,
  VisitPreviewResult,
  VisitRecordResult,
} from "../lib/tenant-loyalty-api";

export type SubmissionKind = "idle" | "visit" | "redeem" | "quick";

/** Arka plan senkron; visit/redeem submit’ten ayrı tutulur. */
export type CashierSyncStatus =
  | "idle"
  | "syncing"
  | "fresh"
  | "stale"
  | "error";

export type PollIntervalMode = "none" | "slow" | "normal" | "fast";

/** Ağ + veri tazeliği yüzeyi; ağ fazı hook’ta, veri stale’i syncStatus’ta tutulur. */
export type CashierConnectivitySurface = {
  networkPhase: "online" | "reconnecting" | "offline";
  submitBlockedOffline: boolean;
  dataStale: boolean;
};

const RECENT_KEY = "pointmor.cashier.recentCustomers";

export function loadRecentCustomerIds(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentCustomerId(id: string): string[] {
  const prev = loadRecentCustomerIds().filter((x) => x !== id);
  const next = [id, ...prev].slice(0, 12);
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export type CashierState = {
  customerQuery: string;
  selectedCustomerId: string;
  customers: CustomerWithBalance[] | null;
  customersLoadError: boolean;
  amountInput: string;
  preview: VisitPreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  rewards: RewardDto[] | null;
  rewardsLoadError: boolean;
  selectedRewardId: string | null;
  submissionState: SubmissionKind;
  inlineError: string | null;
  successFlash: boolean;
  successFlashRedeem: boolean;
  lastVisitResult: VisitRecordResult | null;
  quickCreateOpen: boolean;
  qcName: string;
  qcPhone: string;
  recentCustomerIds: string[];
  pendingClaims: PendingClaimRow[] | null;
  claimsLoading: boolean;
  claimsError: string | null;
  claimAction: null | { id: string; kind: "approve" | "reject" };
  customerSyncState: "idle" | "refreshing" | "error";
  syncStatus: CashierSyncStatus;
  lastSyncedAt: number | null;
  pollIntervalMode: PollIntervalMode;
  backgroundPollingDisabled: boolean;
  claimToast: null | "approved" | "rejected";
};

export const initialCashierState: CashierState = {
  customerQuery: "",
  selectedCustomerId: "",
  customers: null,
  customersLoadError: false,
  amountInput: "",
  preview: null,
  previewLoading: false,
  previewError: null,
  rewards: null,
  rewardsLoadError: false,
  selectedRewardId: null,
  submissionState: "idle",
  inlineError: null,
  successFlash: false,
  successFlashRedeem: false,
  lastVisitResult: null,
  quickCreateOpen: false,
  qcName: "",
  qcPhone: "",
  recentCustomerIds: loadRecentCustomerIds(),
  pendingClaims: null,
  claimsLoading: false,
  claimsError: null,
  claimAction: null,
  customerSyncState: "idle",
  syncStatus: "idle",
  lastSyncedAt: null,
  pollIntervalMode: "none",
  backgroundPollingDisabled: false,
  claimToast: null,
};

export type CashierAction =
  | { type: "SET_CUSTOMER_QUERY"; payload: string }
  | { type: "SET_CUSTOMERS"; payload: CustomerWithBalance[] | null }
  | { type: "SET_CUSTOMERS_LOAD_ERROR"; payload: boolean }
  | { type: "SELECT_CUSTOMER"; payload: string }
  | { type: "SET_AMOUNT"; payload: string }
  | { type: "SET_PREVIEW_LOADING"; payload: boolean }
  | { type: "SET_PREVIEW"; payload: VisitPreviewResult | null }
  | { type: "SET_PREVIEW_ERROR"; payload: string | null }
  | { type: "SET_REWARDS"; payload: RewardDto[] | null }
  | { type: "SET_REWARDS_LOAD_ERROR"; payload: boolean }
  | { type: "SELECT_REWARD"; payload: string | null }
  | { type: "SET_SUBMISSION"; payload: SubmissionKind }
  | { type: "SET_INLINE_ERROR"; payload: string | null }
  | { type: "SET_SUCCESS_FLASH"; payload: boolean }
  | { type: "SET_SUCCESS_FLASH_REDEEM"; payload: boolean }
  | { type: "SET_LAST_VISIT"; payload: VisitRecordResult | null }
  | { type: "RESET_AMOUNT_AFTER_VISIT" }
  | { type: "SET_QUICK_CREATE_OPEN"; payload: boolean }
  | { type: "SET_QC_NAME"; payload: string }
  | { type: "SET_QC_PHONE"; payload: string }
  | { type: "SET_RECENT_IDS"; payload: string[] }
  | {
      type: "PATCH_CUSTOMER_BALANCE";
      payload: { customerId: string; pointsBalance: number };
    }
  | { type: "SET_PENDING_CLAIMS"; payload: PendingClaimRow[] | null }
  | { type: "SET_CLAIMS_LOADING"; payload: boolean }
  | { type: "SET_CLAIMS_ERROR"; payload: string | null }
  | {
      type: "SET_CLAIM_ACTION";
      payload: null | { id: string; kind: "approve" | "reject" };
    }
  | { type: "SET_CUSTOMER_SYNC_STATE"; payload: "idle" | "refreshing" | "error" }
  | { type: "SET_SYNC_STATUS"; payload: CashierSyncStatus }
  | { type: "SET_LAST_SYNCED_AT"; payload: number | null }
  | { type: "SET_POLL_INTERVAL_MODE"; payload: PollIntervalMode }
  | { type: "SET_BACKGROUND_POLLING_DISABLED"; payload: boolean }
  | { type: "SET_CLAIM_TOAST"; payload: null | "approved" | "rejected" };

export function cashierReducer(
  state: CashierState,
  action: CashierAction,
): CashierState {
  switch (action.type) {
    case "SET_CUSTOMER_QUERY":
      return { ...state, customerQuery: action.payload };
    case "SET_CUSTOMERS":
      return { ...state, customers: action.payload };
    case "SET_CUSTOMERS_LOAD_ERROR":
      return { ...state, customersLoadError: action.payload };
    case "SELECT_CUSTOMER":
      return {
        ...state,
        selectedCustomerId: action.payload,
        inlineError: null,
        pendingClaims: null,
        claimsError: null,
        claimAction: null,
        claimToast: null,
        lastSyncedAt: null,
        syncStatus: "idle",
        customerSyncState: "idle",
        pollIntervalMode: "none",
      };
    case "SET_AMOUNT":
      return { ...state, amountInput: action.payload, inlineError: null };
    case "SET_PREVIEW_LOADING":
      return { ...state, previewLoading: action.payload };
    case "SET_PREVIEW":
      return { ...state, preview: action.payload };
    case "SET_PREVIEW_ERROR":
      return { ...state, previewError: action.payload };
    case "SET_REWARDS":
      return { ...state, rewards: action.payload };
    case "SET_REWARDS_LOAD_ERROR":
      return { ...state, rewardsLoadError: action.payload };
    case "SELECT_REWARD":
      return { ...state, selectedRewardId: action.payload, inlineError: null };
    case "SET_SUBMISSION":
      return { ...state, submissionState: action.payload };
    case "SET_INLINE_ERROR":
      return { ...state, inlineError: action.payload };
    case "SET_SUCCESS_FLASH":
      return {
        ...state,
        successFlash: action.payload,
        successFlashRedeem: action.payload ? false : state.successFlashRedeem,
      };
    case "SET_SUCCESS_FLASH_REDEEM":
      return {
        ...state,
        successFlashRedeem: action.payload,
        successFlash: action.payload ? false : state.successFlash,
      };
    case "SET_LAST_VISIT":
      return { ...state, lastVisitResult: action.payload };
    case "RESET_AMOUNT_AFTER_VISIT":
      return {
        ...state,
        amountInput: "",
        preview: null,
        previewError: null,
        previewLoading: false,
      };
    case "SET_QUICK_CREATE_OPEN":
      return { ...state, quickCreateOpen: action.payload };
    case "SET_QC_NAME":
      return { ...state, qcName: action.payload };
    case "SET_QC_PHONE":
      return { ...state, qcPhone: action.payload };
    case "SET_RECENT_IDS":
      return { ...state, recentCustomerIds: action.payload };
    case "PATCH_CUSTOMER_BALANCE": {
      if (!state.customers) return state;
      const { customerId, pointsBalance } = action.payload;
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                loyaltyAccount: c.loyaltyAccount
                  ? { ...c.loyaltyAccount, pointsBalance }
                  : { pointsBalance },
              }
            : c,
        ),
      };
    }
    case "SET_PENDING_CLAIMS":
      return { ...state, pendingClaims: action.payload };
    case "SET_CLAIMS_LOADING":
      return { ...state, claimsLoading: action.payload };
    case "SET_CLAIMS_ERROR":
      return { ...state, claimsError: action.payload };
    case "SET_CLAIM_ACTION":
      return { ...state, claimAction: action.payload };
    case "SET_CUSTOMER_SYNC_STATE":
      return { ...state, customerSyncState: action.payload };
    case "SET_SYNC_STATUS": {
      const s = action.payload;
      const customerSyncState =
        s === "syncing" ? "refreshing" : s === "error" ? "error" : "idle";
      return { ...state, syncStatus: s, customerSyncState };
    }
    case "SET_LAST_SYNCED_AT":
      return { ...state, lastSyncedAt: action.payload };
    case "SET_POLL_INTERVAL_MODE":
      return { ...state, pollIntervalMode: action.payload };
    case "SET_BACKGROUND_POLLING_DISABLED":
      return { ...state, backgroundPollingDisabled: action.payload };
    case "SET_CLAIM_TOAST":
      return { ...state, claimToast: action.payload };
    default:
      return state;
  }
}
