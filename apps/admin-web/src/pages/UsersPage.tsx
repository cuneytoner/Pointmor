import { useMemo, useState } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";

export function UsersPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const [role, setRole] = useState<string>("all");

  const rows = useMemo(() => {
    const source = bootstrap?.users ?? [];
    if (role === "all") return source;
    return source.filter((u) => u.role === role);
  }, [bootstrap?.users, role]);

  const roleLabel = (r: string) => {
    const k = `users.roles.${r}`;
    const v = t(k);
    return v === k ? r : v;
  };

  const roleTone = (
    r: string,
  ): "danger" | "info" | "neutral" =>
    r === "platform_admin" ? "danger" : r === "tenant_operator" ? "info" : "neutral";

  const roles = ["platform_admin", "tenant_operator", "viewer"];

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("users.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("users.eyebrow")}
      title={t("users.title")}
      description={t("users.description")}
    >
      <div
        className="chip-row"
        role="group"
        aria-label={t("users.filterAria")}
      >
        <button
          type="button"
          className={`chip${role === "all" ? " chip--on" : ""}`}
          onClick={() => setRole("all")}
        >
          {t("users.filterAll")}
        </button>
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            className={`chip${role === r ? " chip--on" : ""}`}
            onClick={() => setRole(r)}
          >
            {roleLabel(r)}
          </button>
        ))}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <EmptyState
              title={t("users.emptyTitle")}
              description={t("users.emptyDescription")}
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("common.email")}</th>
                  <th>{t("users.columns.role")}</th>
                  <th>{t("users.columns.workspace")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="data-table__mono">{u.email}</td>
                    <td>
                      <Badge tone={roleTone(u.role)}>{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="data-table__muted">
                      {u.tenant ? `${u.tenant.name} (${u.tenant.slug})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageShell>
  );
}
