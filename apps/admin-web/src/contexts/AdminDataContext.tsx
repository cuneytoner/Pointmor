import { createContext, useContext, type ReactNode } from "react";
import type { AdminDataState } from "../hooks/useAdminData";

const AdminDataContext = createContext<AdminDataState | null>(null);

export function AdminDataProvider({
  value,
  children,
}: {
  value: AdminDataState;
  children: ReactNode;
}) {
  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminDataContext(): AdminDataState {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminDataContext requires AdminDataProvider");
  return ctx;
}
