import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import { formatPoints } from "../lib/formatters";
import { getCustomers, type CustomerWithBalance } from "../lib/tenant-loyalty-api";

export function TenantCustomersPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const [rows, setRows] = useState<CustomerWithBalance[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token?.trim()) return;
    let c = false;
    setError(false);
    getCustomers(token)
      .then((r) => {
        if (!c) setRows(r);
      })
      .catch(() => {
        if (!c) setError(true);
      });
    return () => {
      c = true;
    };
  }, [token]);

  const loading = rows === null && !error;

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.customers.eyebrow")}
      title={t("tenantLoyalty.customers.title")}
      description={t("tenantLoyalty.customers.description")}
    >
      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.customers.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState title={t("tenantLoyalty.customers.empty")} description="" />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLoyalty.customers.columns.name")}</th>
                  <th>{t("tenantLoyalty.customers.columns.phone")}</th>
                  <th className="data-table__num">{t("tenantLoyalty.customers.columns.balance")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows?.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="data-table__mono">{c.phone}</td>
                    <td className="data-table__num">
                      {formatPoints(c.loyaltyAccount?.pointsBalance ?? 0, locale)}
                    </td>
                    <td>
                      <Link className="admin-secondary-btn" to={`/app/customers/${c.id}`}>
                        {t("tenantLoyalty.customers.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
