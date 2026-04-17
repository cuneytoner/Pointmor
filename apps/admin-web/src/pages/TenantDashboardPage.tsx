import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { downloadComplianceExport } from "../lib/compliance-api";
import { getLoyaltySummary, type LoyaltySummary } from "../lib/tenant-loyalty-api";

/** Kiracı — sadakat özeti (Phase 2). */
export function TenantDashboardPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const { auth, bootstrap } = useAdminDataContext();
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const tenantId = auth?.tenant?.id;
  const tenantName = auth?.tenant?.name ?? "";

  const sub = useMemo(() => {
    if (!bootstrap?.subscriptions || !tenantId) return null;
    return bootstrap.subscriptions.find((s) => s.tenant.id === tenantId) ?? null;
  }, [bootstrap?.subscriptions, tenantId]);

  useEffect(() => {
    if (!token?.trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getLoyaltySummary(token)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const metrics = summary
    ? [
        {
          k: t("tenantLoyalty.dash.totalCustomers"),
          v: String(summary.totalCustomers),
        },
        {
          k: t("tenantLoyalty.dash.visitsToday"),
          v: String(summary.visitsToday),
        },
        {
          k: t("tenantLoyalty.dash.pointsIssuedToday"),
          v: String(summary.pointsIssuedToday),
        },
        {
          k: t("tenantLoyalty.dash.redemptionsToday"),
          v: String(summary.redemptionsToday),
        },
        {
          k: t("tenantLoyalty.dash.activeCampaigns"),
          v: String(summary.activeCampaigns),
        },
      ]
    : [];

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.dash.eyebrow")}
      title={t("tenantLoyalty.dash.title", { name: tenantName })}
      description={t("tenantLoyalty.dash.description")}
    >
      <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "1rem" }}>
        {t("tenantLoyalty.common.utcNote")}
      </p>

      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__title">{t("tenantDashboard.hero.title")}</h2>
          <p className="dashboard-hero__sub">{t("tenantDashboard.hero.subtitle")}</p>
        </div>
        {sub?.status === "trialing" && (
          <Badge tone="warning">{t("tenantDashboard.badgeTrialing")}</Badge>
        )}
      </div>

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : loadError ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.dash.loadError")}</p>
      ) : (
        <div className="metric-grid metric-grid--4">
          {metrics.map((m) => (
            <div key={m.k} className="metric-card">
              <div className="metric-card__label">{m.k}</div>
              <div className="metric-card__value">{m.v}</div>
            </div>
          ))}
        </div>
      )}

      {sub ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.25rem" }}>
          <div className="metric-grid metric-grid--3">
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantDashboard.metrics.plan")}</div>
              <div className="metric-card__value">{sub.plan.name}</div>
              <div className="metric-card__hint">{t("tenantLoyalty.dash.subscriptionHint")}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantDashboard.metrics.subscription")}</div>
              <div className="metric-card__value">{sub.status}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("usage.upgradeCta")}</div>
              <div className="metric-card__value">
                <Link to="/pricing" className="admin-secondary-btn">
                  {t("usage.upgradeCta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {token?.trim() &&
      (hasPermission("summary.export") ||
        hasPermission("audit.export") ||
        hasPermission("anomaly.export")) ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.5rem" }}>
          <p className="admin-app__card-title">{t("tenantDashboard.complianceExports")}</p>
          <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "0.75rem" }}>
            {t("compliance.exportsHint")}
          </p>
          <div className="metric-grid metric-grid--3" style={{ alignItems: "end" }}>
            {hasPermission("summary.export") ? (
              <>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    if (!token?.trim()) return;
                    if (!window.confirm(t("compliance.exportConfirmSummaryPdf"))) return;
                    downloadComplianceExport(token, "/summary/export/pdf?period=day", "summary-day.pdf").catch(
                      () => undefined,
                    );
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
                    ).catch(() => undefined);
                  }}
                >
                  {t("compliance.exportSummaryPdfWeek")}
                </button>
              </>
            ) : null}
            {hasPermission("audit.export") ? (
              <>
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => {
                    if (!token?.trim()) return;
                    if (!window.confirm(t("compliance.exportConfirmAuditCsv"))) return;
                    downloadComplianceExport(token, "/audit/export/csv", "audit-export.csv").catch(
                      () => undefined,
                    );
                  }}
                >
                  {t("compliance.exportAuditCsv")}
                </button>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    if (!token?.trim()) return;
                    if (!window.confirm(t("compliance.exportConfirmAuditPdf"))) return;
                    downloadComplianceExport(token, "/audit/export/pdf", "audit-summary.pdf").catch(
                      () => undefined,
                    );
                  }}
                >
                  {t("compliance.exportAuditPdf")}
                </button>
              </>
            ) : null}
            {hasPermission("anomaly.export") ? (
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => {
                  if (!token?.trim()) return;
                  if (!window.confirm(t("compliance.exportConfirmAnomalyPdf"))) return;
                  downloadComplianceExport(token, "/anomalies/export/pdf", "anomalies.pdf").catch(
                    () => undefined,
                  );
                }}
              >
                {t("compliance.exportAnomalyPdf")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
