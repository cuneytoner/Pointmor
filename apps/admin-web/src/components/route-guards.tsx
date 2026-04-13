import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { defaultHomePath } from "../lib/access";

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
  return <Navigate to="/app/dashboard" replace />;
}
