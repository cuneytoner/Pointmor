import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import { canAccessWorkspaceAdmin, canAccessWorkspaceAdminSection } from "../lib/access";
import { canAccessLoyaltySurface } from "../lib/tenant-module-access";

const TAB_GENERAL = "general";
const TAB_LOCATIONS = "locations";
const TAB_TEAM = "team";
const TAB_MESSAGING = "messaging";
const TAB_BILLING = "billing";

export function WorkspaceAdminLayout() {
  const { t } = useTranslation();
  const { auth, bootstrap } = useAdminDataContext();
  const location = useLocation();
  const loyaltyActive = canAccessLoyaltySurface(auth, bootstrap);

  if (!auth || !canAccessWorkspaceAdmin(auth)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const tabs: Array<{ path: string; labelKey: string }> = [
    ...(canAccessWorkspaceAdminSection("general", auth)
      ? [{ path: TAB_GENERAL, labelKey: "workspaceAdmin.tab.general" as const }]
      : []),
    ...(loyaltyActive && canAccessWorkspaceAdminSection("locations", auth)
      ? [{ path: TAB_LOCATIONS, labelKey: "workspaceAdmin.tab.locations" as const }]
      : []),
    ...(canAccessWorkspaceAdminSection("team", auth)
      ? [{ path: TAB_TEAM, labelKey: "workspaceAdmin.tab.team" as const }]
      : []),
    ...(canAccessWorkspaceAdminSection("messaging", auth)
      ? [{ path: TAB_MESSAGING, labelKey: "workspaceAdmin.tab.messaging" as const }]
      : []),
    ...(canAccessWorkspaceAdminSection("billing", auth)
      ? [{ path: TAB_BILLING, labelKey: "workspaceAdmin.tab.billing" as const }]
      : []),
  ];

  const allowedPaths = new Set(tabs.map((x) => x.path));
  const currentSeg = location.pathname.replace(/^\/app\/admin\/?/, "").split("/")[0] || "";
  if (currentSeg && !allowedPaths.has(currentSeg)) {
    const fallback = tabs[0]?.path ?? TAB_MESSAGING;
    return <Navigate to={`/app/admin/${fallback}`} replace />;
  }

  return (
    <div className="page-shell workspace-admin">
      <p className="page-shell__eyebrow">{t("workspaceAdmin.eyebrow")}</p>
      <h1 className="page-shell__title">{t("workspaceAdmin.title")}</h1>
      <p className="page-shell__desc">{t("workspaceAdmin.description")}</p>

      <nav className="workspace-admin-tabs" aria-label={t("workspaceAdmin.subnavAria")}>
        {tabs.map(({ path, labelKey }) => (
          <NavLink
            key={path}
            to={`/app/admin/${path}`}
            className={({ isActive }) =>
              `workspace-admin-tabs__link${isActive ? " workspace-admin-tabs__link--active" : ""}`
            }
          >
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="page-shell__body workspace-admin__outlet">
        <Outlet />
      </div>
    </div>
  );
}
