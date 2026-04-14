import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  CustomerPortalBootstrap,
  CustomerPortalDashboard,
} from "../lib/customer-portal-api";

export type CustomerPwaPhase = "loading" | "error" | "gate" | "ready";

export type CustomerPwaContextValue = {
  tenantSlug: string;
  phase: CustomerPwaPhase;
  errorMessage: string | null;
  bootstrap: CustomerPortalBootstrap | null;
  data: CustomerPortalDashboard | null;
  token: string | null;
  offlineStale: boolean;
  /** Son yenilemede bakiye arttıysa (ör. ziyaret sonrası) gösterilecek delta */
  celebrationGain: number | null;
  clearCelebration: () => void;
  refresh: () => Promise<void>;
  setGate: () => void;
  submitPhone: (phone: string) => Promise<void>;
  claimReward: (rewardId: string) => Promise<void>;
  claimingId: string | null;
};

const Ctx = createContext<CustomerPwaContextValue | null>(null);

export function CustomerPwaProvider({
  value,
  children,
}: {
  value: CustomerPwaContextValue;
  children: ReactNode;
}) {
  const v = useMemo(() => value, [value]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useCustomerPwa(): CustomerPwaContextValue {
  const x = useContext(Ctx);
  if (!x) {
    throw new Error("useCustomerPwa must be used under CustomerPwaProvider");
  }
  return x;
}

