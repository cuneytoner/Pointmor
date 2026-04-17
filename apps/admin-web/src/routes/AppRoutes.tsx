import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
  RequireTenantRouteAccess,
  TenantAppHomeRedirect,
  WorkspaceAdminIndexRedirect,
} from "../components/route-guards";
import { LoginPage } from "../pages/LoginPage";
import { PlansPage } from "../pages/PlansPage";
import { PlatformAdminPage } from "../pages/PlatformAdminPage";
import { PlatformDashboardPage } from "../pages/PlatformDashboardPage";
import { PricingPage } from "../pages/PricingPage";
import { SubscriptionsPage } from "../pages/SubscriptionsPage";
import { TenantBillingPage } from "../pages/TenantBillingPage";
import { TenantCampaignsPage } from "../pages/TenantCampaignsPage";
import { TenantCustomerDetailPage } from "../pages/TenantCustomerDetailPage";
import { TenantCustomersPage } from "../pages/TenantCustomersPage";
import { TenantDashboardPage } from "../pages/TenantDashboardPage";
import { TenantGrowthPage } from "../pages/TenantGrowthPage";
import { TenantAuditPage } from "../pages/TenantAuditPage";
import { TenantRedemptionsPage } from "../pages/TenantRedemptionsPage";
import { TenantRewardsPage } from "../pages/TenantRewardsPage";
import { TenantSettingsPage } from "../pages/TenantSettingsPage";
import { TenantVisitsPage } from "../pages/TenantVisitsPage";
import { TenantsPage } from "../pages/TenantsPage";
import { UsersPage } from "../pages/UsersPage";
import { CustomerPwaLayout } from "../customer-pwa/CustomerPwaLayout";
import { CustomerActivityPage } from "../pages/customer/CustomerActivityPage";
import { CustomerClaimPage } from "../pages/customer/CustomerClaimPage";
import { CustomerHomePage } from "../pages/customer/CustomerHomePage";
import { CustomerProfilePage } from "../pages/customer/CustomerProfilePage";
import { CustomerRewardsPage } from "../pages/customer/CustomerRewardsPage";
import { CustomerMenuPage } from "../pages/customer/CustomerMenuPage";
import { TenantMenuPage } from "../pages/TenantMenuPage";
import { TenantMessagingPage } from "../pages/TenantMessagingPage";
import { TenantAdminTeamPage } from "../pages/TenantAdminTeamPage";
import { WorkspaceAdminLayout } from "../components/WorkspaceAdminLayout";
import { CUSTOMER_LAST_TENANT_SLUG_KEY } from "../lib/customer-portal-api";

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

function CustomerPwaStandaloneEntry() {
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true);
  const last =
    typeof window !== "undefined"
      ? window.localStorage.getItem(CUSTOMER_LAST_TENANT_SLUG_KEY)?.trim()
      : "";
  if (standalone && last) {
    return <Navigate to={`/c/${encodeURIComponent(last)}`} replace />;
  }
  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  const location = useLocation();
  const { token, setToken, refreshKey } = useAuth();
  const locale = useLocale();
  const { t } = useTranslation();
  const adminData = useAdminData(token, refreshKey, locale);

  const isCustomerPortalRoute = /^\/c\/[^/]+/.test(location.pathname);
  const isPublicMenuRoute = /^\/m\/[^/]+/.test(location.pathname);

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

  if (isCustomerPortalRoute) {
    return (
      <Routes>
        <Route path="/c/:tenantSlug" element={<CustomerPwaLayout />}>
          <Route index element={<CustomerHomePage />} />
          <Route path="rewards" element={<CustomerRewardsPage />} />
          <Route path="activity" element={<CustomerActivityPage />} />
          <Route path="claim/:rewardId" element={<CustomerClaimPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>
      </Routes>
    );
  }

  if (isPublicMenuRoute) {
    return (
      <Routes>
        <Route path="/m/:tenantSlug" element={<CustomerMenuPage />} />
      </Routes>
    );
  }

  if (sessionLoading) {
    return <FullScreenSpinner label={t("app.verifyingSession")} />;
  }

  if (!sessionOk) {
    return (
      <Routes>
        <Route path="/" element={<CustomerPwaStandaloneEntry />} />
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
            <Route element={<RequireTenantRouteAccess />}>
              <Route index element={<TenantAppHomeRedirect />} />
              <Route path="dashboard" element={<TenantDashboardPage />} />
              <Route path="audit" element={<TenantAuditPage />} />
              <Route path="growth" element={<TenantGrowthPage />} />
              <Route path="messaging" element={<Navigate to="/app/admin/messaging" replace />} />
              <Route path="customers" element={<TenantCustomersPage />} />
              <Route path="customers/:customerId" element={<TenantCustomerDetailPage />} />
              <Route path="visits" element={<TenantVisitsPage />} />
              <Route path="rewards" element={<TenantRewardsPage />} />
              <Route path="campaigns" element={<TenantCampaignsPage />} />
              <Route path="menu" element={<TenantMenuPage />} />
              <Route path="redemptions" element={<TenantRedemptionsPage />} />
              <Route path="billing" element={<Navigate to="/app/admin/billing" replace />} />
              <Route path="settings" element={<Navigate to="/app/admin/general" replace />} />
              <Route path="admin" element={<WorkspaceAdminLayout />}>
                <Route index element={<WorkspaceAdminIndexRedirect />} />
                <Route path="general" element={<TenantSettingsPage embedded />} />
                <Route path="team" element={<TenantAdminTeamPage />} />
                <Route path="messaging" element={<TenantMessagingPage embedded />} />
                <Route path="billing" element={<TenantBillingPage embedded />} />
              </Route>
            </Route>
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
