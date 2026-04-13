import { useMemo } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";

/** Kiracı yöneticisi — çalışma alanı özeti. */
export function TenantDashboardPage() {
  const { t } = useTranslation();
  const { auth, bootstrap } = useAdminDataContext();

  const tenantId = auth?.tenant?.id;
  const tenantRow = useMemo(() => {
    if (!bootstrap?.tenants || !tenantId) return null;
    return bootstrap.tenants.find((tn) => tn.id === tenantId) ?? null;
  }, [bootstrap?.tenants, tenantId]);

  const sub = useMemo(() => {
    if (!bootstrap?.subscriptions || !tenantId) return null;
    return bootstrap.subscriptions.find((s) => s.tenant.id === tenantId) ?? null;
  }, [bootstrap?.subscriptions, tenantId]);

  const teamCount = useMemo(() => {
    if (!bootstrap?.users || !tenantId) return 0;
    return bootstrap.users.filter((u) => u.tenantId === tenantId).length;
  }, [bootstrap?.users, tenantId]);

  const metrics = [
    {
      k: t("tenantDashboard.metrics.team"),
      v: String(teamCount),
      hint: t("tenantDashboard.metrics.teamHint"),
    },
    {
      k: t("tenantDashboard.metrics.plan"),
      v: sub?.plan.name ?? "—",
      hint: t("tenantDashboard.metrics.planHint"),
    },
    {
      k: t("tenantDashboard.metrics.subscription"),
      v: sub?.status ?? "—",
      hint: t("tenantDashboard.metrics.subscriptionHint"),
    },
  ];

  return (
    <PageShell
      eyebrow={t("tenantDashboard.eyebrow")}
      title={t("tenantDashboard.title", { name: auth?.tenant?.name ?? "" })}
      description={t("tenantDashboard.description")}
    >
      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__title">{t("tenantDashboard.hero.title")}</h2>
          <p className="dashboard-hero__sub">{t("tenantDashboard.hero.subtitle")}</p>
        </div>
        {sub?.status === "trialing" && (
          <Badge tone="warning">{t("tenantDashboard.badgeTrialing")}</Badge>
        )}
      </div>

      <div className="metric-grid metric-grid--3">
        {metrics.map((m) => (
          <div key={m.k} className="metric-card">
            <div className="metric-card__label">{m.k}</div>
            <div className="metric-card__value">{m.v}</div>
            <div className="metric-card__hint">{m.hint}</div>
          </div>
        ))}
      </div>

      {tenantRow?.onboardingCompletedAt ? null : (
        <p className="admin-app__card-text">{t("tenantDashboard.onboardingHint")}</p>
      )}
    </PageShell>
  );
}
