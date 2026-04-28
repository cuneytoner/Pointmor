import { useMemo, useState } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";

export function TenantsPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const [q, setQ] = useState("");
  const moduleMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of bootstrap?.tenantModules ?? []) {
      if (!row.isActive) continue;
      const existing = map.get(row.tenantId) ?? new Set<string>();
      existing.add(row.module.name);
      map.set(row.tenantId, existing);
    }
    return map;
  }, [bootstrap?.tenantModules]);

  const rows = useMemo(() => {
    const source = bootstrap?.tenants ?? [];
    const qq = q.trim().toLowerCase();
    if (!qq) return source;
    return source.filter(
      (r) =>
        r.name.toLowerCase().includes(qq) || r.slug.toLowerCase().includes(qq),
    );
  }, [bootstrap?.tenants, q]);

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("workspaces.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("workspaces.eyebrow")}
      title={t("workspaces.title")}
      description={t("workspaces.description")}
    >
      <div className="toolbar">
        <input
          className="toolbar__search"
          type="search"
          placeholder={t("workspaces.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("workspaces.searchAria")}
        />
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <EmptyState
              title={t("workspaces.emptyTitle")}
              description={t("workspaces.emptyDescription")}
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("workspaces.columns.name")}</th>
                  <th>{t("workspaces.columns.products")}</th>
                  <th>{t("common.slug")}</th>
                  <th>{t("common.id")}</th>
                  <th>{t("workspaces.columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <div className="chip-row">
                        {toProductLabels(moduleMap.get(r.id)).map((label) => (
                          <Badge key={`${r.id}-${label}`} tone="info">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="data-table__mono">{r.slug}</td>
                    <td className="data-table__mono data-table__muted">
                      {r.id.slice(0, 12)}…
                    </td>
                    <td>
                      <Badge tone="success">{t("workspaces.statusActive")}</Badge>
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

function toProductLabels(modules: Set<string> | undefined): string[] {
  const active = modules ?? new Set<string>();
  const labels: string[] = [];
  if (active.has("ai_act")) labels.push("AI Compliance");
  if (active.has("cafe")) labels.push("Loyalty");
  if (active.has("ai_document_intelligence")) labels.push("Document Intelligence");
  if (active.has("ai_act") && !active.has("cafe")) labels.push("Advisor Access");
  if (labels.length === 0) labels.push("Core Platform");
  return labels;
}
