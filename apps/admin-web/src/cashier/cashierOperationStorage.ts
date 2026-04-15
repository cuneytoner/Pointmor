import type { CashierOperationIds } from "../lib/tenant-loyalty-api";

const KEY = "pointmor.cashier.operationIds";

export type { CashierOperationIds };

export function loadCashierOperationIds(): CashierOperationIds | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const deviceSessionId =
      typeof o.deviceSessionId === "string" ? o.deviceSessionId : "";
    const cashierShiftId =
      typeof o.cashierShiftId === "string" ? o.cashierShiftId : "";
    if (!deviceSessionId || !cashierShiftId) return null;
    return { deviceSessionId, cashierShiftId };
  } catch {
    return null;
  }
}

export function saveCashierOperationIds(ids: CashierOperationIds | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!ids) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
