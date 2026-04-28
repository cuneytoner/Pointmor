import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { formatCount } from "../lib/formatters";

type ActivityStatus = "success" | "info" | "warning";

type DemoRow = {
  workspace: string;
  eventKey: string;
  when: string;
  status: ActivityStatus;
};

/** SaaS operatörü — global metrikler ve operasyon özeti. */
export function PlatformDashboardPage() {
  const { t, locale } = useTranslation();
  const { bootstrap } = useAdminDataContext();

  const tc = bootstrap?.tenants.length ?? 0;
  const uc = bootstrap?.users.length ?? 0;
  const sc = bootstrap?.subscriptions.length ?? 0;
  const trialing =
    bootstrap?.subscriptions.filter((s) => s.status === "trialing").length ?? 0;

  const metrics = [
    {
      k: t("dashboard.metrics.workspaces"),
      v: formatCount(tc, locale),
      hint: t("dashboard.metrics.workspacesHint"),
    },
    {
      k: t("dashboard.metrics.users"),
      v: formatCount(uc, locale),
      hint: t("dashboard.metrics.usersHint"),
    },
    {
      k: t("dashboard.metrics.subscriptions"),
      v: formatCount(sc, locale),
      hint: t("dashboard.metrics.subscriptionsHint"),
    },
    {
      k: t("dashboard.metrics.trialing"),
      v: formatCount(trialing, locale),
      hint: t("dashboard.metrics.trialingHint"),
    },
  ];

  const moduleMap = new Map<string, Set<string>>();
  for (const row of bootstrap?.tenantModules ?? []) {
    if (!row.isActive) continue;
    const existing = moduleMap.get(row.tenantId) ?? new Set<string>();
    existing.add(row.module.name);
    moduleMap.set(row.tenantId, existing);
  }
  const subscriptionMap = new Map((bootstrap?.subscriptions ?? []).map((s) => [s.tenant.id, s]));

  const demoRows: DemoRow[] = (bootstrap?.tenants ?? [])
    .map((tenant) => {
      const activeModules = moduleMap.get(tenant.id) ?? new Set<string>();
      const hasAiAct = activeModules.has("ai_act");
      const hasLoyalty = activeModules.has("cafe");
      const hasSubscription = Boolean(subscriptionMap.get(tenant.id));

      let eventKey = "dashboard.events.workspace_synced";
      let status: ActivityStatus = hasSubscription ? "success" : "warning";

      if (tenant.slug === "acme-ai-solutions" || (hasAiAct && !hasLoyalty)) {
        eventKey = "dashboard.events.ai_risk_assessment_completed";
        status = "success";
      } else if (tenant.slug === "urban-coffee-group" || (!hasAiAct && hasLoyalty)) {
        eventKey = "dashboard.events.loyalty_campaign_activated";
        status = "success";
      } else if (tenant.slug === "retailcorp-eu" || (hasAiAct && hasLoyalty)) {
        eventKey = "dashboard.events.multi_product_onboarding_completed";
        status = "success";
      } else if (tenant.slug === "kanzlei-mueller-advisory") {
        eventKey = "dashboard.events.advisor_access_granted";
        status = "info";
      }

      return {
        workspace: tenant.name,
        eventKey,
        when: hasSubscription ? t("dashboard.activity.time.activeSubscription") : t("dashboard.activity.time.noSubscription"),
        status,
      };
    })
    .sort((a, b) => a.workspace.localeCompare(b.workspace, locale));

  const statusBadgeKey = (s: ActivityStatus) => {
    if (s === "success") return "dashboard.activity.statusBadge.success";
    if (s === "warning") return "dashboard.activity.statusBadge.warning";
    return "dashboard.activity.statusBadge.info";
  };

  return (
    <PageShell
      eyebrow={t("dashboardPlatform.eyebrow")}
      title={t("dashboardPlatform.title")}
      description={t("dashboardPlatform.description")}
    >
      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__title">{t("dashboardPlatform.hero.title")}</h2>
          <p className="dashboard-hero__sub">{t("dashboardPlatform.hero.subtitle")}</p>
        </div>
        <Badge tone="info">{t("dashboard.badgeLive")}</Badge>
      </div>

      <div className="metric-grid metric-grid--4">
        {metrics.map((m) => (
          <div key={m.k} className="metric-card">
            <div className="metric-card__label">{m.k}</div>
            <div className="metric-card__value metric-card__value--num">{m.v}</div>
            <div className="metric-card__hint">{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="card-head">
          <p className="admin-app__card-title">{t("dashboard.activity.title")}</p>
          <span className="card-head__meta">{t("dashboard.activity.badgeLive")}</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("dashboard.activity.columns.workspace")}</th>
                <th>{t("dashboard.activity.columns.event")}</th>
                <th>{t("dashboard.activity.columns.time")}</th>
                <th>{t("dashboard.activity.columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {demoRows.map((row) => (
                <tr key={row.workspace}>
                  <td>{row.workspace}</td>
                  <td>{t(row.eventKey)}</td>
                  <td className="data-table__muted">{row.when}</td>
                  <td>
                    <Badge tone={row.status}>
                      {t(statusBadgeKey(row.status))}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
