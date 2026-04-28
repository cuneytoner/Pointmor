import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import {
  deriveOnboardingStage,
  deriveOrganizationHealth,
  deriveOrganizationSegmentation,
  presentHealthTone,
  presentOnboardingTone,
} from "../lib/platformPresentation";

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
  const subscriptionMap = useMemo(
    () => new Map((bootstrap?.subscriptions ?? []).map((row) => [row.tenant.id, row])),
    [bootstrap?.subscriptions],
  );
  const aiSystemByTenant = useMemo(() => {
    const map = new Map<string, { systems: number; openObligations: number; pendingReview: number }>();
    for (const system of bootstrap?.moduleOperations.aiCompliance.systems ?? []) {
      const existing = map.get(system.tenant.id) ?? { systems: 0, openObligations: 0, pendingReview: 0 };
      existing.systems += 1;
      existing.openObligations += system.obligations.filter(
        (o) => o.status === "PENDING" || o.status === "IN_PROGRESS",
      ).length;
      if (!system.currentAssessment || system.currentAssessment.status === "DRAFT") {
        existing.pendingReview += 1;
      }
      map.set(system.tenant.id, existing);
    }
    return map;
  }, [bootstrap?.moduleOperations.aiCompliance.systems]);

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
                  <th>Segment</th>
                  <th>Stage</th>
                  <th>{t("common.slug")}</th>
                  <th>{t("common.id")}</th>
                  <th>{t("workspaces.columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const modules = moduleMap.get(r.id) ?? new Set<string>();
                  const subscription = subscriptionMap.get(r.id) ?? null;
                  const health = deriveOrganizationHealth({
                    subscription,
                    modules,
                    hasRecentActivity: true,
                    hasAdvisorLink: Boolean(
                      (bootstrap?.users ?? []).some((u) =>
                        u.memberships?.some((m) => m.tenant.slug === r.slug && m.role === "ADVISOR"),
                      ),
                    ),
                  });
                  const stage = deriveOnboardingStage({
                    onboardingStep: r.onboardingStep,
                    onboardingCompletedAt: r.onboardingCompletedAt,
                    health,
                    modules,
                  });
                  const segments = deriveOrganizationSegmentation({
                    modules,
                    planName: subscription?.plan.name ?? null,
                    tenantType: r.type,
                  });
                  return (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/platform/organizations/${encodeURIComponent(r.id)}`}>{r.name}</Link>
                    </td>
                    <td>
                      <div className="chip-row">
                        {toProductLabels(moduleMap.get(r.id)).map((label) => (
                          <Badge key={`${r.id}-${label}`} tone="info">
                            {label}
                          </Badge>
                        ))}
                        {aiSystemByTenant.get(r.id)?.systems ? (
                          <Badge tone="neutral">
                            {`${aiSystemByTenant.get(r.id)?.systems} AI systems`}
                          </Badge>
                        ) : null}
                        {aiSystemByTenant.get(r.id)?.openObligations ? (
                          <Badge tone="warning">
                            {`${aiSystemByTenant.get(r.id)?.openObligations} open obligations`}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="chip-row">
                        {segments.map((segment) => (
                          <Badge key={`${r.id}-${segment}`} tone="neutral">
                            {segment}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge tone={presentOnboardingTone(stage)}>{stage}</Badge>
                    </td>
                    <td className="data-table__mono">{r.slug}</td>
                    <td className="data-table__mono data-table__muted">
                      {r.id.slice(0, 12)}…
                    </td>
                    <td>
                      <Badge tone={presentHealthTone(health)}>{health}</Badge>
                    </td>
                  </tr>
                  );
                })}
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
