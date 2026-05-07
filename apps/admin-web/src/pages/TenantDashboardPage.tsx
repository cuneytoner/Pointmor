import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { useAiComplianceOperations } from "../hooks/useAiComplianceOperations";
import { downloadComplianceExport } from "../lib/compliance-api";
import { formatCount, formatPoints } from "../lib/formatters";
import { getLoyaltySummary, type LoyaltySummary } from "../lib/tenant-loyalty-api";
import {
  activeTenantModules,
  canAccessAiActSurface,
  canAccessLoyaltySurface,
  isAdvisorTenant,
} from "../lib/tenant-module-access";

/** Kiracı — sadakat özeti (Phase 2). */
export function TenantDashboardPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const { auth, bootstrap } = useAdminDataContext();
  const { data: aiOperations } = useAiComplianceOperations(token, 0);
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const tenantId = auth?.tenant?.id;
  const tenantName = auth?.tenant?.name ?? "";
  const modules = activeTenantModules(bootstrap, tenantId);
  const loyaltyActive = canAccessLoyaltySurface(auth, bootstrap);
  const aiActActive = canAccessAiActSurface(auth, bootstrap);
  const advisorTenant = isAdvisorTenant(auth, bootstrap);
  const aiOps = aiOperations?.aiCompliance;
  const tenantAiSystems = (aiOps?.systems ?? []).filter((system) => system.tenant.id === tenantId);
  const tenantOpenObligations = tenantAiSystems.reduce((sum, system) => {
    return sum + system.obligations.filter((obligation: any) => obligation.status !== "COMPLETED").length;
  }, 0);

  const sub = useMemo(() => {
    if (!bootstrap?.subscriptions || !tenantId) return null;
    return bootstrap.subscriptions.find((s) => s.tenant.id === tenantId) ?? null;
  }, [bootstrap?.subscriptions, tenantId]);

  const complianceLevel = bootstrap?.entitlements?.compliance?.level ?? "none";
  const canComplianceSummary = complianceLevel !== "none";
  const canComplianceFull = complianceLevel === "full";
  const canViewLoyaltySummary = loyaltyActive && hasPermission("customers.view");
  const dashboardVariant = loyaltyActive
    ? "loyalty"
    : advisorTenant
        ? "advisor"
        : aiActActive
          ? "ai_act"
          : "organization";
  const pageEyebrow = advisorTenant
    ? "Advisor"
    : loyaltyActive
      ? t("tenantLoyalty.dash.eyebrow")
      : aiActActive
        ? "AI Compliance"
        : "Organization";
  const pageTitle = advisorTenant
    ? `${tenantName} — advisor overview`
    : loyaltyActive
      ? t("tenantLoyalty.dash.title", { name: tenantName })
      : aiActActive
        ? `${tenantName} — AI compliance overview`
        : `${tenantName} — overview`;
  const pageDescription = advisorTenant
    ? "Advisor operations and client workload overview."
    : loyaltyActive
      ? t("tenantLoyalty.dash.description")
      : aiActActive
        ? "AI systems, assessments, and obligations status."
        : "Organization operational overview.";
  const heroTitle = advisorTenant
    ? "Advisor command center"
    : loyaltyActive
      ? t("tenantDashboard.hero.title")
      : aiActActive
        ? "AI compliance command center"
        : "Organization command center";
  const heroSubtitle = advisorTenant
    ? "Track client workload, pending reviews, and advisor actions."
    : loyaltyActive
      ? t("tenantDashboard.hero.subtitle")
      : aiActActive
        ? "Monitor AI systems, assessments, and open obligations."
        : "Review active modules and operational status.";

  useEffect(() => {
    if (!canViewLoyaltySummary) {
      setLoading(false);
      setLoadError(false);
      setSummary(null);
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
  }, [token, canViewLoyaltySummary]);

  const metrics = summary
    ? [
        {
          k: t("tenantLoyalty.dash.totalCustomers"),
          v: formatCount(summary.totalCustomers, locale),
        },
        {
          k: t("tenantLoyalty.dash.visitsToday"),
          v: formatCount(summary.visitsToday, locale),
        },
        {
          k: t("tenantLoyalty.dash.pointsIssuedToday"),
          v: formatPoints(summary.pointsIssuedToday, locale),
        },
        {
          k: t("tenantLoyalty.dash.redemptionsToday"),
          v: formatCount(summary.redemptionsToday, locale),
        },
        {
          k: t("tenantLoyalty.dash.activeCampaigns"),
          v: formatCount(summary.activeCampaigns, locale),
        },
      ]
    : [];

  return (
    <PageShell
      eyebrow={pageEyebrow}
      title={pageTitle}
      description={pageDescription}
    >
      {dashboardVariant === "loyalty" ? (
        <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "1rem" }}>
          {t("tenantLoyalty.common.utcNote")}
        </p>
      ) : null}

      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__title">{heroTitle}</h2>
          <p className="dashboard-hero__sub">{heroSubtitle}</p>
        </div>
        {sub?.status === "trialing" && (
          <Badge tone="warning">{t("tenantDashboard.badgeTrialing")}</Badge>
        )}
      </div>

      {dashboardVariant === "loyalty" ? (
        !canViewLoyaltySummary ? (
          <p className="admin-app__card-text">{t("tenantAudit.forbidden")}</p>
        ) : loading ? (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        ) : loadError ? (
          <p className="admin-app__card-text">{t("tenantLoyalty.dash.loadError")}</p>
        ) : (
          <div className="metric-grid metric-grid--4">
            {metrics.map((m) => (
              <div key={m.k} className="metric-card">
                <div className="metric-card__label">{m.k}</div>
                <div className="metric-card__value metric-card__value--num">{m.v}</div>
              </div>
            ))}
          </div>
        )
      ) : dashboardVariant === "advisor" ? (
        <div className="metric-grid metric-grid--4">
          <div className="metric-card">
            <div className="metric-card__label">Client organizations</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(bootstrap?.moduleOperations.advisorPortal.linkedClientOrganizations ?? 0, locale)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">Pending advisor actions</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(bootstrap?.moduleOperations.advisorPortal.pendingAdvisorActions ?? 0, locale)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">AI review workload</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(aiOps?.advisorWorkload ?? 0, locale)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">AI systems monitored</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(aiOps?.systems.length ?? 0, locale)}
            </div>
          </div>
        </div>
      ) : dashboardVariant === "ai_act" ? (
        <div className="metric-grid metric-grid--4">
          <div className="metric-card">
            <div className="metric-card__label">AI systems</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(tenantAiSystems.length, locale)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">Pending reviews</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(
                tenantAiSystems.filter(
                  (system) =>
                    system.currentAssessment?.status === "SUBMITTED" ||
                    system.currentAssessment?.status === "UNDER_REVIEW",
                ).length,
                locale,
              )}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">Open obligations</div>
            <div className="metric-card__value metric-card__value--num">
              {formatCount(tenantOpenObligations, locale)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-card__label">AI compliance</div>
            <div className="metric-card__value">
              <Link to="/app/ai-act" className="admin-secondary-btn">
                Open AI Act workspace
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-title">No active product modules</p>
          <p className="admin-app__card-text">
            This organization currently has no enabled product modules. Enable a module to unlock
            product-specific workflows.
          </p>
          <p className="admin-app__card-text data-table__muted">
            Detected modules: {Array.from(modules).join(", ") || "none"}
          </p>
        </div>
      )}

      {sub ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.25rem" }}>
          <div className="metric-grid metric-grid--3">
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantDashboard.metrics.plan")}</div>
              <div className="metric-card__value">{sub.plan.name}</div>
              <div className="metric-card__hint">
                Subscription and billing details for this workspace.
              </div>
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

      {hasPermission("summary.export") ||
        hasPermission("audit.export") ||
        hasPermission("anomaly.export") ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.5rem" }}>
          <p className="admin-app__card-title">{t("tenantDashboard.complianceExports")}</p>
          <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "0.75rem" }}>
            {t("compliance.exportsHint")}
          </p>
          {complianceLevel === "none" ? (
            <p className="admin-app__card-text">
              {t("compliance.upgradeUnlockFullPack")}{" "}
              <Link to="/app/admin/billing" className="admin-secondary-btn">
                {t("compliancePack.ctaPlans")}
              </Link>
            </p>
          ) : null}
          <div className="metric-grid metric-grid--3" style={{ alignItems: "end" }}>
            {hasPermission("summary.export") ? (
              <>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  disabled={!canComplianceSummary}
                  title={!canComplianceSummary ? t("compliance.upgradeUnlockFullPack") : undefined}
                  onClick={() => {
                    if (!canComplianceSummary) return;
                    if (!window.confirm(t("compliance.exportConfirmSummaryPdf"))) return;
                    downloadComplianceExport(
                      token,
                      "/summary/export/pdf?period=day",
                      "summary-day.pdf",
                      locale,
                    ).catch(
                      () => undefined,
                    );
                  }}
                >
                  {t("compliance.exportSummaryPdfDay")}
                </button>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  disabled={!canComplianceSummary}
                  title={!canComplianceSummary ? t("compliance.upgradeUnlockFullPack") : undefined}
                  onClick={() => {
                    if (!canComplianceSummary) return;
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
              </>
            ) : null}
            {hasPermission("audit.export") ? (
              <>
                <button
                  type="button"
                  className="admin-primary-btn"
                  disabled={!canComplianceFull}
                  title={!canComplianceFull ? t("compliance.upgradeUnlockFullPack") : undefined}
                  onClick={() => {
                    if (!canComplianceFull) return;
                    if (!window.confirm(t("compliance.exportConfirmAuditCsv"))) return;
                    downloadComplianceExport(
                      token,
                      "/audit/export/csv",
                      "audit-export.csv",
                      locale,
                    ).catch(
                      () => undefined,
                    );
                  }}
                >
                  {t("compliance.exportAuditCsv")}
                </button>
                <button
                  type="button"
                  className="admin-secondary-btn"
                  disabled={!canComplianceFull}
                  title={!canComplianceFull ? t("compliance.upgradeUnlockFullPack") : undefined}
                  onClick={() => {
                    if (!canComplianceFull) return;
                    if (!window.confirm(t("compliance.exportConfirmAuditPdf"))) return;
                    downloadComplianceExport(
                      token,
                      "/audit/export/pdf",
                      "audit-summary.pdf",
                      locale,
                    ).catch(
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
                disabled={!canComplianceFull}
                title={!canComplianceFull ? t("compliance.upgradeUnlockFullPack") : undefined}
                onClick={() => {
                  if (!canComplianceFull) return;
                  if (!window.confirm(t("compliance.exportConfirmAnomalyPdf"))) return;
                  downloadComplianceExport(
                    token,
                    "/anomalies/export/pdf",
                    "anomalies.pdf",
                    locale,
                  ).catch(
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
