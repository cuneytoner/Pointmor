import { Navigate } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";
import { defaultHomePath } from "../lib/access";
import { presentAuditActionLabel } from "../lib/platformPresentation";

export function PlatformAdminPage() {
  const locale = useLocale();
  const { t } = useTranslation();
  const data = useAdminDataContext();

  if (!data.auth?.user.platformAdmin) {
    return (
      <Navigate to={data.auth ? defaultHomePath(data.auth) : "/login"} replace />
    );
  }

  const logs = data.bootstrap?.auditLogs ?? [];

  return (
    <PageShell
      eyebrow={t("platform.eyebrow")}
      title={t("platform.title")}
      description={t("platform.description")}
    >
      <div className="admin-app__card admin-app__card--wide">
        <div className="card-head">
          <p className="admin-app__card-title">{t("platform.cardTitle")}</p>
          <Badge tone="neutral">{t("platform.badgeSource")}</Badge>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("common.id")}</th>
                <th>{t("platform.columns.time")}</th>
                <th>{t("platform.columns.actor")}</th>
                <th>{t("platform.columns.action")}</th>
                <th>{t("platform.columns.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="data-table__mono">{row.id.slice(0, 12)}…</td>
                  <td className="data-table__muted">
                    {new Date(row.createdAt).toLocaleString(toIntlLocale(locale))}
                  </td>
                  <td className="data-table__mono">{row.actorEmail ?? "—"}</td>
                  <td>{presentAuditActionLabel(row.action)}</td>
                  <td>{row.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
