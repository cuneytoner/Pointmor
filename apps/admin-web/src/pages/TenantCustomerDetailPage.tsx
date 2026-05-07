import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { buildAuthHeaders, getApiBaseUrl } from "../lib/api-base";
import { downloadComplianceExport } from "../lib/compliance-api";
import { formatCurrencyValue, formatDateTimeLabel, formatPoints } from "../lib/formatters";
import { getCustomerDetail, type CustomerDetail } from "../lib/tenant-loyalty-api";

export function TenantCustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const complianceFull = bootstrap?.entitlements?.compliance?.level === "full";
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState(false);
  const [complianceMsg, setComplianceMsg] = useState<string | null>(null);
  const [complianceBusy, setComplianceBusy] = useState(false);

  useEffect(() => {
    if (!customerId) return;
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

  const fmtDate = (iso: string) => formatDateTimeLabel(iso, locale);

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
              <div className="metric-card__value metric-card__value--num">
                {formatPoints(data.pointsBalance, locale)}
              </div>
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
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.visitAmount")}</th>
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.visitBase")}</th>
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.visitBonus")}</th>
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.visitTotal")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="data-table__num">{formatCurrencyValue(v.amount, locale)}</td>
                        <td className="data-table__num">{formatPoints(v.basePointsEarned, locale)}</td>
                        <td className="data-table__num">{formatPoints(v.bonusPointsEarned, locale)}</td>
                        <td className="data-table__num">{formatPoints(v.pointsEarned, locale)}</td>
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
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.claimPoints")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rewardClaims.map((c) => (
                      <tr key={c.id}>
                        <td>{c.reward.name}</td>
                        <td>{redemptionStatusLabel(c.status)}</td>
                        <td className="data-table__num">{formatPoints(c.pointsSpent, locale)}</td>
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
                      <th className="data-table__num">{t("tenantLoyalty.customerDetail.ledgerPoints")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerSource")}</th>
                      <th>{t("tenantLoyalty.customerDetail.ledgerWhen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLedger.map((l) => (
                      <tr key={l.id}>
                        <td className="data-table__num">{formatPoints(l.points, locale)}</td>
                        <td>{l.source}</td>
                        <td className="data-table__muted">{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {customerId &&
          (hasPermission("gdpr.customer_export") || hasPermission("settings.manage")) ? (
            <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.25rem" }}>
              <p className="admin-app__card-title">{t("compliance.sectionCustomer")}</p>
              <div className="metric-grid metric-grid--2" style={{ alignItems: "end" }}>
                {hasPermission("gdpr.customer_export") ? (
                  <button
                    type="button"
                    className="admin-primary-btn"
                    disabled={complianceBusy || !complianceFull}
                    title={!complianceFull ? t("compliance.upgradeUnlockFullPack") : undefined}
                    onClick={() => {
                      if (!window.confirm(t("compliance.exportConfirmGdprJson"))) return;
                      setComplianceBusy(true);
                      setComplianceMsg(null);
                      downloadComplianceExport(
                        token,
                        `/tenant/customers/${customerId}/gdpr-export`,
                        `customer-${customerId}-export.json`,
                        locale,
                      )
                        .catch(() => setComplianceMsg(t("compliance.exportFailed")))
                        .finally(() => setComplianceBusy(false));
                    }}
                  >
                    {t("compliance.gdprExport")}
                  </button>
                ) : null}
                {hasPermission("settings.manage") ? (
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    disabled={complianceBusy || !complianceFull}
                    title={!complianceFull ? t("compliance.upgradeUnlockFullPack") : undefined}
                    onClick={async () => {
                      if (!window.confirm(t("compliance.anonymizeConfirm"))) return;
                      setComplianceBusy(true);
                      setComplianceMsg(null);
                      try {
                        const base = getApiBaseUrl().replace(/\/$/, "");
                        const res = await fetch(`${base}/tenant/customers/${customerId}/anonymize`, {
                          method: "POST",
                          headers: { ...(buildAuthHeaders(token) ?? {}) },
                          credentials: "include",
                        });
                        if (!res.ok) throw new Error("fail");
                        setComplianceMsg(t("compliance.anonymizeDone"));
                        const refreshed = await getCustomerDetail(token, customerId);
                        setData(refreshed);
                      } catch {
                        setComplianceMsg(t("compliance.exportFailed"));
                      } finally {
                        setComplianceBusy(false);
                      }
                    }}
                  >
                    {t("compliance.anonymize")}
                  </button>
                ) : null}
              </div>
              {!complianceFull ? (
                <p className="admin-app__card-text data-table__muted" style={{ marginTop: "0.75rem" }}>
                  {t("compliance.upgradeUnlockFullPack")}{" "}
                  <Link to="/app/admin/billing">{t("compliancePack.ctaPlans")}</Link>
                </p>
              ) : null}
              {complianceMsg ? (
                <p className="admin-app__card-text" style={{ marginTop: "0.75rem" }}>
                  {complianceMsg}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
