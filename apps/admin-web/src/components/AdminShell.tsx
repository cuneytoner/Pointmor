import type { FC, SVGProps } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LanguageSelector } from "./LanguageSelector";
import type { AdminAuth } from "../hooks/useAdminData";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { getApiBaseUrl } from "../lib/api-base";
import { useTranslation } from "../hooks/useTranslation";
import type { NavItemConfig } from "../navigation/nav-config";
import { PLATFORM_NAV, TENANT_NAV } from "../navigation/nav-config";
import { canAccessTenantNavTarget, getAppSurface } from "../lib/access";
import { PlanTypeBadge, planBadgeFromEntitlements } from "./PlanTypeBadge";
import { EntitlementAlerts } from "./EntitlementAlerts";

type AdminShellProps = {
  auth: AdminAuth;
};

function filterTenantNav(
  items: NavItemConfig[],
  featureList: string[] | undefined,
  auth: AdminShellProps["auth"],
): NavItemConfig[] {
  return items.filter((item) => {
    if (featureList && featureList.length > 0) {
      const f = new Set(featureList);
      if (item.to === "/app/growth" && !f.has("product_analytics")) return false;
      if (item.to === "/app/campaigns" && !f.has("campaigns")) return false;
    }
    return canAccessTenantNavTarget(item.to, auth);
  });
}

export function AdminShell({ auth }: AdminShellProps) {
  const { t } = useTranslation();
  const { token, setToken } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const location = useLocation();

  const surface = getAppSurface(auth);
  const nav =
    surface === "platform"
      ? PLATFORM_NAV
      : filterTenantNav(TENANT_NAV, bootstrap?.entitlements?.features, auth);
  const planType = planBadgeFromEntitlements(bootstrap?.entitlements ?? null);

  const topbarKey =
    surface === "platform" ? "shell.platformConsole" : "shell.tenantApp";

  const logout = async () => {
    const base = getApiBaseUrl();
    try {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    setToken(null);
  };

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
      </aside>
      <div className="admin-app__main">
        <header className="admin-app__topbar">
          <span className="admin-app__topbar-title">{t(topbarKey)}</span>
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
