import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import {
  getGrowthOverview,
  type GrowthOverview,
  type ProductAnalyticsEventType,
} from "../lib/tenant-product-analytics-api";

function pct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

export function TenantGrowthPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
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
                    <th>{t("tenantLoyalty.growth.columns.uniqueCustomers")}</th>
                    <th>{t("tenantLoyalty.growth.columns.eventsApprox")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.steps.map((row) => (
                    <tr key={row.step}>
                      <td>{stepLabel(row.step)}</td>
                      <td>{row.uniqueCustomers}</td>
                      <td>{row.eventsApprox}</td>
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
                    <th>{t("tenantLoyalty.growth.columns.sequentialUsers")}</th>
                    <th>{t("tenantLoyalty.growth.columns.conversion")}</th>
                    <th>{t("tenantLoyalty.growth.columns.dropOff")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.stepToStep.map((row) => (
                    <tr key={`${row.from}-${row.to}`}>
                      <td>
                        {stepLabel(row.from)} → {stepLabel(row.to)}
                      </td>
                      <td>{row.sequentialUsers}</td>
                      <td>{pct(row.rate)}</td>
                      <td>{pct(row.dropOff)}</td>
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
                {pct(data.funnel.biggestDropOff.dropOff)})
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
                {t("tenantLoyalty.growth.cohortSize")}: {data.retention.cohortSize}
              </li>
              <li>D1: {pct(data.retention.day1Rate)}</li>
              <li>D3: {pct(data.retention.day3Rate)}</li>
              <li>D7: {pct(data.retention.day7Rate)}</li>
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
                {data.rewardUsage.redemptionCompletedCount}
              </li>
              <li>
                {t("tenantLoyalty.growth.rewardClaimedEvents")}:{" "}
                {data.rewardUsage.rewardClaimedEvents}
              </li>
              <li>
                {t("tenantLoyalty.growth.rewardViewedEvents")}:{" "}
                {data.rewardUsage.rewardViewedEvents}
              </li>
              <li>
                {t("tenantLoyalty.growth.claimPerView")}:{" "}
                {data.rewardUsage.claimPerViewApprox ?? "—"}
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
