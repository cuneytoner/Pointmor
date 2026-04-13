import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const rows = bootstrap?.subscriptions ?? [];

  const statusTone = (s: string) => {
    if (s === "active") return "success";
    if (s === "trialing") return "info";
    if (s === "past_due") return "warning";
    return "neutral";
  };

  const statusLabel = (s: string) => {
    const k = `subscriptions.status.${s}`;
    const v = t(k);
    return v === k ? s : v;
  };

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("subscriptions.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("subscriptions.eyebrow")}
      title={t("subscriptions.title")}
      description={t("subscriptions.description")}
    >
      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("common.id")}</th>
                <th>{t("subscriptions.columns.workspace")}</th>
                <th>{t("subscriptions.columns.plan")}</th>
                <th>{t("subscriptions.columns.status")}</th>
                <th>{t("subscriptions.columns.renews")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="data-table__mono">{r.id}</td>
                  <td>{r.tenant.name}</td>
                  <td>{r.plan.name}</td>
                  <td>
                    <Badge tone={statusTone(r.status)}>
                      {statusLabel(r.status)}
                    </Badge>
                  </td>
                  <td className="data-table__muted">
                    {r.renewsAt
                      ? new Date(r.renewsAt).toISOString().slice(0, 10)
                      : "—"}
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
