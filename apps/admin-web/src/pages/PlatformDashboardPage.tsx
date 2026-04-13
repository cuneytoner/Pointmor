import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";

type ActivityStatus = "success" | "info" | "warning";

type DemoRow = {
  workspaceKey: string;
  eventKey: string;
  whenKey: string;
  status: ActivityStatus;
};

/** SaaS operatörü — global metrikler ve operasyon özeti. */
export function PlatformDashboardPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();

  const tc = bootstrap?.tenants.length ?? 0;
  const uc = bootstrap?.users.length ?? 0;
  const sc = bootstrap?.subscriptions.length ?? 0;
  const trialing =
    bootstrap?.subscriptions.filter((s) => s.status === "trialing").length ?? 0;

  const metrics = [
    {
      k: t("dashboard.metrics.workspaces"),
      v: String(tc),
      hint: t("dashboard.metrics.workspacesHint"),
    },
    {
      k: t("dashboard.metrics.users"),
      v: String(uc),
      hint: t("dashboard.metrics.usersHint"),
    },
    {
      k: t("dashboard.metrics.subscriptions"),
      v: String(sc),
      hint: t("dashboard.metrics.subscriptionsHint"),
    },
    {
      k: t("dashboard.metrics.trialing"),
      v: String(trialing),
      hint: t("dashboard.metrics.trialingHint"),
    },
  ];

  const demoRows: DemoRow[] = [
    {
      workspaceKey: "dashboard.activity.demo.row1.workspace",
      eventKey: "dashboard.events.provision",
      whenKey: "dashboard.activity.demo.row1.when",
      status: "success",
    },
    {
      workspaceKey: "dashboard.activity.demo.row2.workspace",
      eventKey: "dashboard.events.invite_sent",
      whenKey: "dashboard.activity.demo.row2.when",
      status: "info",
    },
    {
      workspaceKey: "dashboard.activity.demo.row3.workspace",
      eventKey: "dashboard.events.subscription_hold",
      whenKey: "dashboard.activity.demo.row3.when",
      status: "warning",
    },
  ];

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
            <div className="metric-card__value">{m.v}</div>
            <div className="metric-card__hint">{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="card-head">
          <p className="admin-app__card-title">{t("dashboard.activity.title")}</p>
          <span className="card-head__meta">{t("dashboard.activity.badgeDemo")}</span>
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
                <tr key={row.workspaceKey}>
                  <td>{t(row.workspaceKey)}</td>
                  <td>{t(row.eventKey)}</td>
                  <td className="data-table__muted">{t(row.whenKey)}</td>
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
