import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  canAccessTenantPath,
  defaultHomePath,
  redirectPathForDeniedTenantRoute,
} from "../lib/access";
import { resolveTenantAppRole } from "../lib/tenant-app-role";
import { defaultTenantHomePath } from "../lib/tenant-route-access";
import {
  canAccessAiActSurface,
  canAccessLoyaltySurface,
  isAiActPath,
  isLoyaltyPath,
} from "../lib/tenant-module-access";

export function RequirePlatformLayout(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth?.user.platformAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}

export function RequireTenantLayout(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  if (auth.user.platformAdmin) {
    return <Navigate to="/platform/dashboard" replace />;
  }
  if (!auth.tenant) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/** Kiracı rotalarında RBAC — yetkisiz URL sessizce güvenli sayfaya yönlenir. */
export function RequireTenantRouteAccess(): ReactNode {
  const { auth, bootstrap } = useAdminDataContext();
  const location = useLocation();
  if (!auth?.tenant) return <Outlet />;
  if (isLoyaltyPath(location.pathname) && !canAccessLoyaltySurface(auth, bootstrap)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (isAiActPath(location.pathname) && !canAccessAiActSurface(auth, bootstrap)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (!canAccessTenantPath(location.pathname, auth)) {
    return <Navigate to={redirectPathForDeniedTenantRoute(location.pathname, auth)} replace />;
  }
  return <Outlet />;
}

/** `/app` → role göre varsayılan giriş (staff → müşteriler). */
export function TenantAppHomeRedirect(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  return <Navigate to={defaultTenantHomePath(resolveTenantAppRole(auth))} replace />;
}

/** `/app/admin` → ops için mesajlaşma, diğerleri için genel. */
export function WorkspaceAdminIndexRedirect(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  const role = resolveTenantAppRole(auth);
  if (role === "ops") return <Navigate to="messaging" replace />;
  return <Navigate to="general" replace />;
}

/** Eski `/dashboard` bağlantıları */
export function LegacyDashboardRedirect(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  return <Navigate to={defaultHomePath(auth)} replace />;
}

export function LegacyPlatformPathRedirect({ to }: { to: string }): ReactNode {
  return <Navigate to={to} replace />;
}

/** Eski `/users` — platformda global liste, kiracıda ekip. */
export function LegacyUsersRedirect(): ReactNode {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  if (auth.user.platformAdmin) {
    return <Navigate to="/platform/users" replace />;
  }
  return <Navigate to={defaultHomePath(auth)} replace />;
}
