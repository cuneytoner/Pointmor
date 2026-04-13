import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AdminDataProvider, useAdminDataContext } from "../contexts/AdminDataContext";
import { useLocale } from "../contexts/LocaleContext";
import { useAdminData } from "../hooks/useAdminData";
import { useTranslation } from "../hooks/useTranslation";
import { defaultHomePath } from "../lib/access";
import { AdminShell } from "../components/AdminShell";
import { FullScreenSpinner } from "../components/FullScreenSpinner";
import {
  LegacyDashboardRedirect,
  LegacyUsersRedirect,
  RequirePlatformLayout,
  RequireTenantLayout,
} from "../components/route-guards";
import { LoginPage } from "../pages/LoginPage";
import { PlansPage } from "../pages/PlansPage";
import { PlatformAdminPage } from "../pages/PlatformAdminPage";
import { PlatformDashboardPage } from "../pages/PlatformDashboardPage";
import { PricingPage } from "../pages/PricingPage";
import { SubscriptionsPage } from "../pages/SubscriptionsPage";
import { TenantBillingPage } from "../pages/TenantBillingPage";
import { TenantDashboardPage } from "../pages/TenantDashboardPage";
import { TenantSettingsPage } from "../pages/TenantSettingsPage";
import { TenantsPage } from "../pages/TenantsPage";
import { UsersPage } from "../pages/UsersPage";

function RootHomeRedirect() {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  return <Navigate to={defaultHomePath(auth)} replace />;
}

function SessionHomeRedirect() {
  const { auth } = useAdminDataContext();
  if (!auth) return null;
  return <Navigate to={defaultHomePath(auth)} replace />;
}

export function AppRoutes() {
  const { token, setToken, refreshKey } = useAuth();
  const locale = useLocale();
  const { t } = useTranslation();
  const adminData = useAdminData(token, refreshKey, locale);

  useEffect(() => {
    if (!adminData.authInvalid) return;
    const id = window.setTimeout(() => setToken(null), 2600);
    return () => window.clearTimeout(id);
  }, [adminData.authInvalid, setToken]);

  const sessionLoading = Boolean(token?.trim()) && adminData.loading;
  const sessionOk =
    Boolean(token?.trim()) &&
    !adminData.authInvalid &&
    Boolean(adminData.auth?.user?.id);

  if (sessionLoading) {
    return <FullScreenSpinner label={t("app.verifyingSession")} />;
  }

  if (!sessionOk) {
    return (
      <Routes>
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/login"
          element={<LoginPage sessionInvalid={adminData.authInvalid} />}
        />
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!adminData.auth) return null;

  return (
    <AdminDataProvider value={adminData}>
      <Routes>
        <Route element={<AdminShell auth={adminData.auth} />}>
          <Route path="/" element={<RootHomeRedirect />} />
          <Route path="/login" element={<SessionHomeRedirect />} />
          <Route path="/auth/login" element={<SessionHomeRedirect />} />
          <Route path="/pricing" element={<PricingPage />} />

          <Route path="/platform" element={<RequirePlatformLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PlatformDashboardPage />} />
            <Route path="workspaces" element={<TenantsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="admin" element={<PlatformAdminPage />} />
          </Route>

          <Route path="/app" element={<RequireTenantLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TenantDashboardPage />} />
            <Route path="billing" element={<TenantBillingPage />} />
            <Route path="settings" element={<TenantSettingsPage />} />
          </Route>

          <Route path="/dashboard" element={<LegacyDashboardRedirect />} />
          <Route
            path="/tenants"
            element={<Navigate to="/platform/workspaces" replace />}
          />
          <Route path="/users" element={<LegacyUsersRedirect />} />
          <Route
            path="/plans"
            element={<Navigate to="/platform/plans" replace />}
          />
          <Route
            path="/subscriptions"
            element={<Navigate to="/platform/subscriptions" replace />}
          />
          <Route
            path="/data-health"
            element={<Navigate to="/app/dashboard" replace />}
          />
          <Route
            path="/platform-admin"
            element={<Navigate to="/platform/admin" replace />}
          />

          <Route path="*" element={<RootHomeRedirect />} />
        </Route>
      </Routes>
    </AdminDataProvider>
  );
}
