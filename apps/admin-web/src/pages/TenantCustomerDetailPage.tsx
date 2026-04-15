import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/EmptyState";
import { useLocale } from "../contexts/LocaleContext";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";
import { getCustomerDetail, type CustomerDetail } from "../lib/tenant-loyalty-api";

export function TenantCustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token?.trim() || !customerId) return;
    let c = false;
    setError(false);
    getCustomerDetail(token, customerId)
      .then((d) => {
        if (!c) setData(d);
      })
      .catch(() => {
        if (!c) setError(true);
      });
    return () => {
      c = true;
    };
  }, [token, customerId]);

  const loading = !data && !error;

  const redemptionStatusLabel = (s: string) => {
    const k = `tenantLoyalty.redemptions.status.${s}` as const;
    const label = t(k);
    return label === k ? s : label;
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(toIntlLocale(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.customerDetail.eyebrow")}
      title={data?.customer.name ?? "…"}
      description=""
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/app/customers" className="admin-secondary-btn">
          ← {t("tenantLoyalty.nav.customers")}
        </Link>
      </p>

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error || !data ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.customerDetail.loadError")}</p>
      ) : (
        <>
          <div className="metric-grid metric-grid--3" style={{ marginBottom: "1.25rem" }}>
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantLoyalty.customerDetail.balance")}</div>
              <div className="metric-card__value">{data.pointsBalance}</div>
            </div>
          </div>

          <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
            <p className="admin-app__card-title">{t("tenantLoyalty.customerDetail.visitsTitle")}</p>
            {data.recentVisits.length === 0 ? (
              <EmptyState
                title={t("tenantLoyalty.customerDetail.emptyVisits")}
                description=""
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("tenantLoyalty.customerDetail.visitAmount")}</th>
                      <th>{t("tenantLoyalty.customerDetail.visitBase")}</th>
                      <th>{t("tenantLoyalty.customerDetail.visitBonus")}</th>
                      <th>{t("tenantLoyalty.customerDetail.visitTotal")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentVisits.map((v) => (
                      <tr key={v.id}>
                        <td>{v.amount}</td>
                        <td>{v.basePointsEarned}</td>
                        <td>{v.bonusPointsEarned}</td>
                        <td>{v.pointsEarned}</td>
                        <td className="data-table__muted">{fmtDate(v.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
            <p className="admin-app__card-title">{t("tenantLoyalty.customerDetail.claimsTitle")}</p>
            {data.rewardClaims.length === 0 ? (
              <EmptyState
                title={t("tenantLoyalty.customerDetail.emptyClaims")}
                description=""
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("tenantLoyalty.customerDetail.claimReward")}</th>
                      <th>{t("tenantLoyalty.customerDetail.claimStatus")}</th>
                      <th>{t("tenantLoyalty.customerDetail.claimPoints")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rewardClaims.map((c) => (
                      <tr key={c.id}>
                        <td>{c.reward.name}</td>
                        <td>{redemptionStatusLabel(c.status)}</td>
                        <td className="data-table__mono">{c.pointsSpent}</td>
                        <td className="data-table__muted">{fmtDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-app__card admin-app__card--wide">
            <p className="admin-app__card-title">{t("tenantLoyalty.customerDetail.ledgerTitle")}</p>
            {data.recentLedger.length === 0 ? (
              <EmptyState
                title={t("tenantLoyalty.customerDetail.emptyLedger")}
                description=""
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("tenantLoyalty.customerDetail.ledgerPoints")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerSource")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLedger.map((l) => (
                      <tr key={l.id}>
                        <td className="data-table__mono">{l.points}</td>
                        <td>{l.source}</td>
                        <td className="data-table__muted">{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
