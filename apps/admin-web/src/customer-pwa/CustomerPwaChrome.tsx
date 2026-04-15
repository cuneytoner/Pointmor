import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import { useCustomerPwa } from "./CustomerPwaContext";

export function CustomerPwaChrome({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { tenantSlug, data, setGate, bootstrap } = useCustomerPwa();
  const menuPublicOn = Boolean(bootstrap?.storeSettings?.menuPublicEnabled);
  const base = `/c/${encodeURIComponent(tenantSlug)}`;

  return (
    <div className="customer-pwa__shell-inner">
      <main className="customer-pwa__main">{children}</main>
      <nav className="customer-pwa__tabnav" aria-label={t("customerPortal.navAria")}>
        <NavLink
          to={base}
          end
          className={({ isActive }) =>
            `customer-pwa__tab ${isActive ? "customer-pwa__tab--active" : ""}`
          }
        >
          {t("customerPortal.navHome")}
        </NavLink>
        <NavLink
          to={`${base}/rewards`}
          className={({ isActive }) =>
            `customer-pwa__tab ${isActive ? "customer-pwa__tab--active" : ""}`
          }
        >
          {t("customerPortal.navRewards")}
        </NavLink>
        <NavLink
          to={`${base}/activity`}
          className={({ isActive }) =>
            `customer-pwa__tab ${isActive ? "customer-pwa__tab--active" : ""}`
          }
        >
          {t("customerPortal.navActivity")}
        </NavLink>
      </nav>
      <footer className="customer-pwa__footer">
        {menuPublicOn ? (
          <Link
            className="customer-pwa__linkbtn"
            to={`/m/${encodeURIComponent(tenantSlug)}`}
          >
            {t("customerPortal.viewMenu")}
          </Link>
        ) : null}
        <button type="button" className="customer-pwa__linkbtn" onClick={setGate}>
          {t("customerPortal.signOut")}
        </button>
        {data?.tenant?.name ? (
          <span className="customer-pwa__footer-brand">{data.tenant.name}</span>
        ) : null}
      </footer>
    </div>
  );
}
