import type { ReactNode } from "react";
import { usePermissions } from "../hooks/usePermissions";
import type { TenantPermission } from "../lib/tenant-permissions";

type PermissionGateProps = {
  /** Tek izin veya hepsi gerekli (AND) */
  permission: TenantPermission | TenantPermission[];
  /** Varsayılan: tümü gerekli */
  mode?: "all" | "any";
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Yetkisizde alt ağaç çizilmez (varsayılan). Yönetim/ödeme aksiyonları için kullanın.
 */
export function PermissionGate({ permission, mode = "all", children, fallback = null }: PermissionGateProps) {
  const { hasPermission, hasAny } = usePermissions();
  const list = Array.isArray(permission) ? permission : [permission];
  const ok =
    mode === "any"
      ? hasAny(list)
      : list.every((p) => hasPermission(p));
  if (!ok) return fallback;
  return <>{children}</>;
}
