import { useEffect, useState, type FC, type SVGProps } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSelector } from "./LanguageSelector";
import type { AdminAuth } from "../hooks/useAdminData";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { buildAuthHeaders, getApiBaseUrl } from "../lib/api-base";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import type { NavItemConfig } from "../navigation/nav-config";
import { PLATFORM_NAV, TENANT_NAV } from "../navigation/nav-config";
import { canAccessTenantNavTarget, getAppSurface } from "../lib/access";
import {
  canAccessAiActSurface,
  canAccessLoyaltySurface,
} from "../lib/tenant-module-access";
import { isProductNavTarget } from "../lib/productRegistry";
import { PlanTypeBadge, planBadgeFromEntitlements } from "./PlanTypeBadge";
import { EntitlementAlerts } from "./EntitlementAlerts";
import { LocationBranchSwitcher } from "./LocationBranchSwitcher";

type AdminShellProps = {
  auth: AdminAuth;
};

function filterTenantNav(
  items: NavItemConfig[],
  featureList: string[] | undefined,
  bootstrap: ReturnType<typeof useAdminDataContext>["bootstrap"],
  auth: AdminShellProps["auth"],
): NavItemConfig[] {
  const loyaltyActive = canAccessLoyaltySurface(auth, bootstrap);
  const aiActActive = canAccessAiActSurface(auth, bootstrap);
  return items.filter((item) => {
    if (featureList && featureList.length > 0) {
      const f = new Set(featureList);
      if (item.to === "/app/hq" && !f.has("hq_dashboard")) return false;
      if (item.to === "/app/growth" && !f.has("product_analytics")) return false;
      if (item.to === "/app/campaigns" && !f.has("campaigns")) return false;
      if (item.to === "/app/audit" && !f.has("manager_closing")) return false;
    }
    if (isProductNavTarget(item.to, "loyalty")) {
      return loyaltyActive;
    }
    if (isProductNavTarget(item.to, "ai_act")) {
      return aiActActive;
    }
    return canAccessTenantNavTarget(item.to, auth);
  });
}

export function AdminShell({ auth }: AdminShellProps) {
  const { t } = useTranslation();
  const { token, setToken, bumpRefresh } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const surface = getAppSurface(auth);
  const nav =
    surface === "platform"
      ? PLATFORM_NAV
      : filterTenantNav(TENANT_NAV, bootstrap?.entitlements?.features, bootstrap, auth);
  const planType = planBadgeFromEntitlements(bootstrap?.entitlements ?? null);

  const topbarKey =
    surface === "platform" ? "shell.platformConsole" : "shell.tenantApp";
  const showLocationBranchSwitcher =
    surface === "tenant" &&
    canAccessLoyaltySurface(auth, bootstrap) &&
    (hasPermission("customers.view") || hasPermission("visits.create"));

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const logout = async () => {
    const base = getApiBaseUrl();
    try {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: buildAuthHeaders(token),
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    setToken(null);
    bumpRefresh();
    navigate("/login", { replace: true });
  };

  const renderNavItems = () => (
    <nav className="admin-app__nav">
      {nav.map((item) => {
        const label = t(item.labelKey);
        const Icon = item.Icon as FC<SVGProps<SVGSVGElement>>;
        const end = item.navActivePrefix
          ? false
          : (item.end ?? item.to.endsWith("/dashboard"));
        const prefix = item.navActivePrefix;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => {
              const active =
                prefix !== undefined
                  ? location.pathname.startsWith(prefix)
                  : isActive;
              return `admin-app__nav-link${active ? " admin-app__nav-link--active" : ""}`;
            }}
            end={end}
          >
            <span className="admin-app__nav-icon" aria-hidden>
              <Icon />
            </span>
            {label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="admin-app">
      <aside className="admin-app__sidebar" aria-label={t("shell.brandAria")}>
        <div className="admin-app__brand-row">
          <img
            className="admin-app__brand-mark"
            src="/brand/pointmor-mark.svg"
            width={40}
            height={40}
            alt=""
          />
          <div className="admin-app__brand">{t("common.appName")}</div>
        </div>
        {renderNavItems()}
      </aside>
      <button
        type="button"
        className={`admin-app__mobile-nav-backdrop${mobileNavOpen ? " admin-app__mobile-nav-backdrop--open" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        id="admin-mobile-navigation"
        className={`admin-app__mobile-drawer${mobileNavOpen ? " admin-app__mobile-drawer--open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileNavOpen}
        hidden={!mobileNavOpen}
      >
        <div className="admin-app__brand-row admin-app__mobile-drawer-head">
          <img
            className="admin-app__brand-mark"
            src="/brand/pointmor-mark.svg"
            width={40}
            height={40}
            alt=""
          />
          <div className="admin-app__brand">{t("common.appName")}</div>
          <button
            type="button"
            className="admin-app__mobile-nav-close"
            onClick={() => setMobileNavOpen(false)}
          >
            Close
          </button>
        </div>
        {renderNavItems()}
      </aside>
      <div className="admin-app__main">
        <header className="admin-app__topbar">
          <button
            type="button"
            className="admin-app__mobile-nav-toggle"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            Menu
          </button>
          <span className="admin-app__topbar-title">{t(topbarKey)}</span>
          {showLocationBranchSwitcher ? <LocationBranchSwitcher /> : null}
          {surface === "tenant" && planType ? (
            <span className="admin-app__topbar-plan-wrap">
              <PlanTypeBadge planType={planType} />
            </span>
          ) : null}
          <span className="admin-app__topbar-spacer" />
          <span className="admin-app__status-pill" title="API">
            <span className="admin-app__status-dot" aria-hidden />
            {t("shell.statusOnline")}
          </span>
          <LanguageSelector variant="topbar" />
          <button type="button" className="admin-app__logout" onClick={logout}>
            {t("shell.signOut")}
          </button>
        </header>
        <div className="admin-app__workspace">
          <div className="workspace__status-band" role="status">
            {t("shell.envBanner")}
          </div>
          <div className="workspace__body">
            {surface === "tenant" ? (
              <EntitlementAlerts entitlements={bootstrap?.entitlements} />
            ) : null}
            <section className="admin-app__user-strip" aria-label={t("shell.sessionAria")}>
              <img
                className="admin-app__user-avatar"
                src="/brand/avatar-placeholder.svg"
                width={48}
                height={48}
                alt=""
              />
              <div className="admin-app__user-meta">
                <div className="admin-app__user-name">{auth.user.name}</div>
                <div className="admin-app__user-email">{auth.user.email}</div>
                {auth.tenant ? (
                  <div className="admin-app__user-tenant">
                    {t("shell.workspaceLine", {
                      name: auth.tenant.name,
                      slug: auth.tenant.slug,
                    })}
                  </div>
                ) : (
                  <div className="admin-app__user-tenant">{t("shell.platformSession")}</div>
                )}
              </div>
            </section>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
