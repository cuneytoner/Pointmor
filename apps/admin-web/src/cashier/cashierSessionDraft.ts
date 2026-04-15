import type { CashierState } from "./cashierReducer";

const DRAFT_KEY = "pointmor.cashier.sessionDraft";

export type CashierSessionDraftV1 = {
  v: 1;
  selectedCustomerId: string;
  amountInput: string;
  selectedRewardId: string | null;
};

export function loadCashierSessionDraft(): Partial<CashierSessionDraftV1> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    if (o.v !== 1) return null;
    return {
      v: 1,
      selectedCustomerId:
        typeof o.selectedCustomerId === "string" ? o.selectedCustomerId : "",
      amountInput: typeof o.amountInput === "string" ? o.amountInput : "",
      selectedRewardId:
        o.selectedRewardId === null || typeof o.selectedRewardId === "string"
          ? (o.selectedRewardId as string | null)
          : null,
    };
  } catch {
    return null;
  }
}

export function saveCashierSessionDraft(
  slice: Pick<
    CashierState,
    "selectedCustomerId" | "amountInput" | "selectedRewardId"
  >,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: CashierSessionDraftV1 = {
      v: 1,
      selectedCustomerId: slice.selectedCustomerId,
      amountInput: slice.amountInput,
      selectedRewardId: slice.selectedRewardId,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function hadMeaningfulDraftOnLoad(): boolean {
  const d = loadCashierSessionDraft();
  if (!d) return false;
  return Boolean(
    (d.selectedCustomerId && d.selectedCustomerId.trim()) ||
      (d.amountInput && d.amountInput.trim()),
  );
}
