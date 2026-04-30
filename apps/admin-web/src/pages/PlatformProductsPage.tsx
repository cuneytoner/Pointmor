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
        <div className="operation-row-list">
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
              <article className="operation-row" key={tenant.id}>
                <div className="operation-row__identity">
                  <Link to={`/platform/organizations/${encodeURIComponent(tenant.id)}`}>
                    {tenant.name}
                  </Link>
                  <p>{subscription?.plan.name ?? "No active plan"}</p>
                </div>
                <div className="operation-row__products">
                  {moduleBadge(activeModules, "ai_act")}
                  {moduleBadge(activeModules, "cafe")}
                  {moduleBadge(activeModules, "advisor_dashboard")}
                  {moduleBadge(activeModules, "ai_document_intelligence")}
                  {activeModules.has("ai_act") ? (
                    <>
                      <Badge tone="warning">
                        {`${aiStatsByTenant.get(tenant.id)?.openObligations ?? 0} open obligations`}
                      </Badge>
                      <Badge tone="info">
                        {`${aiStatsByTenant.get(tenant.id)?.pendingReview ?? 0} pending review`}
                      </Badge>
                    </>
                  ) : null}
                </div>
                <div className="operation-row__state">
                  {segments.map((segment) => (
                    <Badge key={`${tenant.id}-${segment}`} tone="neutral">
                      {segment}
                    </Badge>
                  ))}
                  <Badge tone={presentOnboardingTone(stage)}>{stage}</Badge>
                  <Badge tone={presentHealthTone(health)}>{health}</Badge>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

function moduleBadge(activeModules: Set<string>, moduleName: string) {
  const isActive = activeModules.has(moduleName);
  return (
    <Badge tone={isActive ? "success" : "neutral"}>
      {isActive ? presentModuleLabel(moduleName) : `${presentModuleLabel(moduleName)} off`}
    </Badge>
  );
}
