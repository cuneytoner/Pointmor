import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  deriveOnboardingStage,
  deriveOrganizationHealth,
  deriveOrganizationSegmentation,
  presentHealthTone,
  presentModuleLabel,
  presentOnboardingTone,
} from "../lib/platformPresentation";

export function PlatformProductsPage() {
  const { bootstrap } = useAdminDataContext();

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
  const subscriptionMap = useMemo(
    () => new Map((bootstrap?.subscriptions ?? []).map((row) => [row.tenant.id, row])),
    [bootstrap?.subscriptions],
  );
  const aiStatsByTenant = useMemo(() => {
    const map = new Map<string, { pendingReview: number; openObligations: number }>();
    for (const system of bootstrap?.moduleOperations.aiCompliance.systems ?? []) {
      const existing = map.get(system.tenant.id) ?? { pendingReview: 0, openObligations: 0 };
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

  return (
    <PageShell
      eyebrow="Products"
      title="Product Operations"
      description="Operational module directory and organization activation matrix."
    >
      <div className="plan-grid">
        <div className="admin-app__card">
          <p className="admin-app__card-title">AI Compliance</p>
          <p className="admin-app__card-text">Assessments, obligations, and review health.</p>
          <Link className="admin-secondary-btn" to="/platform/products/ai-compliance">
            Open module
          </Link>
        </div>
        <div className="admin-app__card">
          <p className="admin-app__card-title">Loyalty</p>
          <p className="admin-app__card-text">Campaigns, customers, and engagement operations.</p>
          <Link className="admin-secondary-btn" to="/platform/products/loyalty">
            Open module
          </Link>
        </div>
        <div className="admin-app__card">
          <p className="admin-app__card-title">Advisor Portal</p>
          <p className="admin-app__card-text">Advisor-client linkage and shared workspace actions.</p>
          <Link className="admin-secondary-btn" to="/platform/products/advisor-portal">
            Open module
          </Link>
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Product Activation Matrix</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Active plan</th>
                <th>AI Compliance</th>
                <th>Loyalty</th>
                <th>Advisor Portal</th>
                <th>Document Intelligence</th>
                <th>Segment</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(bootstrap?.tenants ?? []).map((tenant) => {
                const activeModules = moduleMap.get(tenant.id) ?? new Set<string>();
                const subscription = subscriptionMap.get(tenant.id);
                const health = deriveOrganizationHealth({
                  subscription: subscription ?? null,
                  modules: activeModules,
                  hasRecentActivity: true,
                  hasAdvisorLink: Boolean(
                    (bootstrap?.users ?? []).some((u) =>
                      u.memberships?.some(
                        (m) => m.tenant.slug === tenant.slug && m.role === "ADVISOR",
                      ),
                    ),
                  ),
                });
                const stage = deriveOnboardingStage({
                  onboardingStep: tenant.onboardingStep,
                  onboardingCompletedAt: tenant.onboardingCompletedAt,
                  health,
                  modules: activeModules,
                });
                const segments = deriveOrganizationSegmentation({
                  modules: activeModules,
                  planName: subscription?.plan.name ?? null,
                  tenantType: tenant.type,
                });
                return (
                  <tr key={tenant.id}>
                    <td>
                      <Link to={`/platform/organizations/${encodeURIComponent(tenant.id)}`}>{tenant.name}</Link>
                    </td>
                    <td>{subscription?.plan.name ?? "—"}</td>
                    <td>
                      {moduleBadge(activeModules, "ai_act")}
                      {activeModules.has("ai_act") ? (
                        <div className="chip-row" style={{ marginTop: 6 }}>
                          <Badge tone="warning">
                            {`${aiStatsByTenant.get(tenant.id)?.openObligations ?? 0} open obligations`}
                          </Badge>
                          <Badge tone="info">
                            {`${aiStatsByTenant.get(tenant.id)?.pendingReview ?? 0} pending review`}
                          </Badge>
                        </div>
                      ) : null}
                    </td>
                    <td>{moduleBadge(activeModules, "cafe")}</td>
                    <td>{moduleBadge(activeModules, "advisor_dashboard")}</td>
                    <td>{moduleBadge(activeModules, "ai_document_intelligence")}</td>
                    <td>
                      <div className="chip-row">
                        {segments.map((segment) => (
                          <Badge key={`${tenant.id}-${segment}`} tone="neutral">
                            {segment}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge tone={presentOnboardingTone(stage)}>{stage}</Badge>
                    </td>
                    <td>
                      <Badge tone={presentHealthTone(health)}>
                        {health}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

function moduleBadge(activeModules: Set<string>, moduleName: string) {
  const isActive = activeModules.has(moduleName);
  return (
    <Badge tone={isActive ? "success" : "neutral"}>
      {isActive ? presentModuleLabel(moduleName) : "—"}
    </Badge>
  );
}

