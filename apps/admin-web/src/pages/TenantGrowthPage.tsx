import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { downloadComplianceExport } from "../lib/compliance-api";
import { formatCount, formatCurrencyValue, formatPercent } from "../lib/formatters";
import {
  getGrowthOverview,
  type GrowthOverview,
  type ProductAnalyticsEventType,
} from "../lib/tenant-product-analytics-api";

export function TenantGrowthPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const { bootstrap } = useAdminDataContext();
  const ent = bootstrap?.entitlements;
  const [data, setData] = useState<GrowthOverview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token?.trim()) return;
    if (
      bootstrap?.entitlements &&
      !bootstrap.entitlements.features.includes("product_analytics")
    ) {
      return;
    }
    let c = false;
    setError(false);
    getGrowthOverview(token, {
      funnelDays: 30,
      cohortDays: 90,
      rewardDays: 30,
    })
      .then((o) => {
        if (!c) setData(o);
      })
      .catch(() => {
        if (!c) setError(true);
      });
    return () => {
      c = true;
    };
  }, [token, bootstrap?.entitlements]);

  const loading = data === null && !error;

  const stepLabel = (s: ProductAnalyticsEventType) => {
    const k = `tenantLoyalty.growth.stepLabels.${s}` as const;
    const x = t(k);
    return x === k ? s : x;
  };

  if (!ent) {
    return (
      <PageShell
        eyebrow={t("tenantLoyalty.growth.eyebrow")}
        title={t("tenantLoyalty.growth.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("plan.gate.loadingEntitlements")}</p>
      </PageShell>
    );
  }

  if (!ent.features.includes("product_analytics")) {
    return (
      <PageShell
        eyebrow={t("tenantLoyalty.growth.eyebrow")}
        title={t("plan.gate.growthTitle")}
        description={t("plan.gate.growthLead")}
      >
        <div className="feature-plan-gate">
          <p className="admin-app__card-text">{t("plan.gate.growthBody")}</p>
          <Link to="/app/admin/billing" className="admin-primary-btn">
            {t("plan.gate.ctaBilling")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.growth.eyebrow")}
      title={t("tenantLoyalty.growth.title")}
      description={t("tenantLoyalty.growth.description")}
    >
      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error || !data ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.growth.loadError")}</p>
      ) : (
        <>
          {token?.trim() && hasPermission("summary.export") ? (
            <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
              <p className="admin-app__card-title">{t("compliance.growthSummaryPdfTitle")}</p>
              <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "0.75rem" }}>
                {t("compliance.exportsHint")}
              </p>
              <div className="metric-grid metric-grid--2" style={{ alignItems: "end" }}>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    if (!token?.trim()) return;
                    if (!window.confirm(t("compliance.exportConfirmSummaryPdf"))) return;
                    downloadComplianceExport(
                      token,
                      "/summary/export/pdf?period=day",
                      "summary-day.pdf",
                      locale,
                    ).catch(() => undefined);
                  }}
                >
                  {t("compliance.exportSummaryPdfDay")}
                </button>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    if (!token?.trim()) return;
                    if (!window.confirm(t("compliance.exportConfirmSummaryPdf"))) return;
                    downloadComplianceExport(
                      token,
                      "/summary/export/pdf?period=week",
                      "summary-week.pdf",
                      locale,
                    ).catch(() => undefined);
                  }}
                >
                  {t("compliance.exportSummaryPdfWeek")}
                </button>
              </div>
            </div>
          ) : null}
          <p
            className="admin-app__card-text data-table__muted"
            style={{ marginBottom: "1rem" }}
          >
            {t("tenantLoyalty.growth.periodNote", {
              funnelDays: data.funnel.periodDays,
              rewardDays: data.rewardUsage.periodDays,
            })}
          </p>

          <section className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantLoyalty.growth.funnelTitle")}</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("tenantLoyalty.growth.columns.step")}</th>
                    <th className="data-table__num">{t("tenantLoyalty.growth.columns.uniqueCustomers")}</th>
                    <th className="data-table__num">{t("tenantLoyalty.growth.columns.eventsApprox")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.steps.map((row) => (
                    <tr key={row.step}>
                      <td>{stepLabel(row.step)}</td>
                      <td className="data-table__num">{formatCount(row.uniqueCustomers, locale)}</td>
                      <td className="data-table__num">{formatCount(row.eventsApprox, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3
              className="admin-app__card-title"
              style={{ marginTop: "1.25rem", fontSize: "1rem" }}
            >
              {t("tenantLoyalty.growth.transitionsTitle")}
            </h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("tenantLoyalty.growth.columns.transition")}</th>
                    <th className="data-table__num">{t("tenantLoyalty.growth.columns.sequentialUsers")}</th>
                    <th className="data-table__num">{t("tenantLoyalty.growth.columns.conversion")}</th>
                    <th className="data-table__num">{t("tenantLoyalty.growth.columns.dropOff")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.stepToStep.map((row) => (
                    <tr key={`${row.from}-${row.to}`}>
                      <td>
                        {stepLabel(row.from)} → {stepLabel(row.to)}
                      </td>
                      <td className="data-table__num">{formatCount(row.sequentialUsers, locale)}</td>
                      <td className="data-table__num">{formatPercent(row.rate, locale)}</td>
                      <td className="data-table__num">{formatPercent(row.dropOff, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.funnel.biggestDropOff && (
              <p className="admin-app__card-text" style={{ marginTop: "1rem" }}>
                <strong>{t("tenantLoyalty.growth.biggestDropOff")}</strong>{" "}
                {stepLabel(data.funnel.biggestDropOff.from)} →{" "}
                {stepLabel(data.funnel.biggestDropOff.to)} (
                {formatPercent(data.funnel.biggestDropOff.dropOff, locale)})
              </p>
            )}
          </section>

          <section
            className="admin-app__card admin-app__card--wide"
            style={{ marginTop: "1rem" }}
          >
            <h2 className="admin-app__card-title">{t("tenantLoyalty.growth.retentionTitle")}</h2>
            <p className="admin-app__card-text data-table__muted">{data.retention.definition}</p>
            <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.25rem" }}>
              <li>
                {t("tenantLoyalty.growth.cohortSize")}: {formatCount(data.retention.cohortSize, locale)}
              </li>
              <li>D1: {formatPercent(data.retention.day1Rate, locale)}</li>
              <li>D3: {formatPercent(data.retention.day3Rate, locale)}</li>
              <li>D7: {formatPercent(data.retention.day7Rate, locale)}</li>
            </ul>
            <p className="admin-app__card-text data-table__muted" style={{ marginTop: "0.75rem" }}>
              {t("tenantLoyalty.common.utcNote")}
            </p>
          </section>

          <section
            className="admin-app__card admin-app__card--wide"
            style={{ marginTop: "1rem" }}
          >
            <h2 className="admin-app__card-title">{t("tenantLoyalty.growth.rewardTitle")}</h2>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
              <li>
                {t("tenantLoyalty.growth.redemptionCompleted")}:{" "}
                {formatCount(data.rewardUsage.redemptionCompletedCount, locale)}
              </li>
              <li>
                {t("tenantLoyalty.growth.rewardClaimedEvents")}:{" "}
                {formatCount(data.rewardUsage.rewardClaimedEvents, locale)}
              </li>
              <li>
                {t("tenantLoyalty.growth.rewardViewedEvents")}:{" "}
                {formatCount(data.rewardUsage.rewardViewedEvents, locale)}
              </li>
              <li>
                {t("tenantLoyalty.growth.claimPerView")}:{" "}
                {data.rewardUsage.claimPerViewApprox === null
                  ? "—"
                  : formatCurrencyValue(data.rewardUsage.claimPerViewApprox, locale)}
              </li>
            </ul>
          </section>

          <section
            className="admin-app__card admin-app__card--wide"
            style={{ marginTop: "1rem" }}
          >
            <h2 className="admin-app__card-title">{t("tenantLoyalty.growth.insightsTitle")}</h2>
            <p className="admin-app__card-text">{data.insights.summary}</p>
            {data.insights.suggestions.length > 0 && (
              <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.25rem" }}>
                {data.insights.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
