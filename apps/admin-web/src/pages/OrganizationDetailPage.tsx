import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import {
  deriveEvidenceFreshness,
  deriveOrganizationRiskTrend,
  derivePriorityScore,
  presentTrendTone,
} from "../lib/aiCompliancePresentation";
import {
  deriveOnboardingStage,
  deriveOrganizationHealth,
  deriveOrganizationSegmentation,
  presentHealthTone,
  presentModuleLabel,
  presentOnboardingTone,
  presentRoleLabel,
  presentSubscriptionHealth,
} from "../lib/platformPresentation";

export function OrganizationDetailPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId ?? "";

  const organization = useMemo(
    () => (bootstrap?.tenants ?? []).find((tenant) => tenant.id === organizationId),
    [bootstrap?.tenants, organizationId],
  );
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
  const subscription = useMemo(
    () => (bootstrap?.subscriptions ?? []).find((row) => row.tenant.id === organizationId),
    [bootstrap?.subscriptions, organizationId],
  );
  const primaryContacts = useMemo(() => {
    const users = bootstrap?.users ?? [];
    return users.filter((user) => {
      const primaryOrganization = user.memberships?.[0]?.tenant ?? user.tenant;
      return primaryOrganization?.slug === organization?.slug;
    });
  }, [bootstrap?.users, organization?.slug]);
  const advisorContacts = useMemo(() => {
    const users = bootstrap?.users ?? [];
    return users.filter((user) =>
      user.memberships?.some(
        (membership) => membership.tenant.slug === organization?.slug && membership.role === "ADVISOR",
      ),
    );
  }, [bootstrap?.users, organization?.slug]);

  if (!bootstrap) {
    return (
      <PageShell eyebrow={t("common.ellipsis")} title={t("organizationDetail.title")} description="">
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  if (!organization) {
    return <Navigate to="/platform/organizations" replace />;
  }

  const productLabels = toProductLabels(moduleMap.get(organization.id));
  const subscriptionHealth = subscription ? presentSubscriptionHealth(subscription) : null;
  const activeModules = moduleMap.get(organization.id) ?? new Set<string>();
  const hasAdvisorLink = advisorContacts.length > 0;
  const health = deriveOrganizationHealth({
    subscription: subscription ?? null,
    modules: activeModules,
    hasRecentActivity: true,
    hasAdvisorLink,
  });
  const onboardingStage = deriveOnboardingStage({
    onboardingStep: organization.onboardingStep,
    onboardingCompletedAt: organization.onboardingCompletedAt,
    health,
    modules: activeModules,
  });
  const segmentation = deriveOrganizationSegmentation({
    modules: activeModules,
    planName: subscription?.plan.name ?? null,
    tenantType: organization.type,
  });
  const timelineItems: PlatformActivityItem[] = [
    {
      id: `${organization.id}-sub`,
      title: subscription ? "Subscription lifecycle synced" : "Subscription setup required",
      when: subscription?.renewsAt
        ? `Renews ${new Date(subscription.renewsAt).toLocaleDateString()}`
        : "No renewal date",
      type: "subscription_lifecycle",
      severity: subscription ? "info" : "warning",
      organization: organization.name,
    },
    {
      id: `${organization.id}-ai`,
      title: activeModules.has("ai_act")
        ? "Compliance queue actively monitored"
        : "Compliance module currently inactive",
      when: "Current cycle",
      type: "compliance",
      severity: activeModules.has("ai_act") ? "success" : "warning",
      organization: organization.name,
    },
    {
      id: `${organization.id}-ops`,
      title: activeModules.has("cafe")
        ? "Loyalty campaigns are in operational scope"
        : "Loyalty not enabled for this organization",
      when: "Current cycle",
      type: "loyalty",
      severity: activeModules.has("cafe") ? "info" : "warning",
      organization: organization.name,
    },
  ];
  const aiSystems = (bootstrap?.moduleOperations.aiCompliance.systems ?? []).filter(
    (row) => row.tenant.id === organization.id,
  );
  const aiOpenObligations = aiSystems.reduce(
    (sum, row) => sum + row.obligations.filter((o) => o.status === "PENDING" || o.status === "IN_PROGRESS").length,
    0,
  );
  const aiPendingReview = aiSystems.filter(
    (row) => !row.currentAssessment || row.currentAssessment.status === "DRAFT",
  ).length;
  const riskTrend = deriveOrganizationRiskTrend(aiSystems);
  const highPressureSystems = aiSystems.filter((row) => derivePriorityScore(row) >= 70).length;
  const staleEvidenceSystems = aiSystems.filter((row) => {
    const freshness = deriveEvidenceFreshness(row);
    return freshness === "Stale" || freshness === "Critical";
  }).length;
  const reviewVelocity =
    aiSystems.length === 0
      ? "N/A"
      : aiPendingReview === 0
        ? "High"
        : aiPendingReview <= Math.ceil(aiSystems.length / 2)
          ? "Medium"
          : "Low";
  const complianceMaturity =
    aiSystems.length === 0
      ? "Foundational"
      : highPressureSystems === 0 && staleEvidenceSystems === 0
        ? "Operational"
        : staleEvidenceSystems <= 1
          ? "Advancing"
          : "Needs Stabilization";

  return (
    <PageShell
      eyebrow={t("organizationDetail.eyebrow")}
      title={organization.name}
      description={t("organizationDetail.description")}
    >
      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">{t("organizationDetail.overviewTitle")}</p>
        <p className="admin-app__card-text data-table__muted">{organization.slug}</p>
        <div className="chip-row">
          <Badge tone="info">
            {subscription ? `${t("organizationDetail.activePlan")}: ${subscription.plan.name}` : t("organizationDetail.noPlan")}
          </Badge>
          <Badge tone="neutral">
            {t("organizationDetail.status")}: {t("workspaces.statusActive")}
          </Badge>
          <Badge tone={presentHealthTone(health)}>{`Health: ${health}`}</Badge>
          <Badge tone={presentOnboardingTone(onboardingStage)}>{`Stage: ${onboardingStage}`}</Badge>
          {subscriptionHealth ? (
            <Badge tone={subscriptionHealth.tone}>
              {`Renewal: ${subscriptionHealth.label}`}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Subscription status</p>
        <div className="chip-row">
          <Badge tone={subscription ? "success" : "warning"}>
            {subscription ? subscription.status : "No subscription"}
          </Badge>
          {subscription?.renewsAt ? (
            <Badge tone="neutral">{`Renews ${new Date(subscription.renewsAt).toLocaleDateString()}`}</Badge>
          ) : null}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">{t("organizationDetail.enabledProducts")}</p>
        <div className="chip-row">
          {productLabels.map((label) => (
            <Badge key={`${organization.id}-${label}`} tone="info">
              {label}
            </Badge>
          ))}
          {aiSystems.length > 0 ? <Badge tone="neutral">{`${aiSystems.length} AI systems`}</Badge> : null}
          {aiOpenObligations > 0 ? (
            <Badge tone="warning">{`${aiOpenObligations} open obligations`}</Badge>
          ) : null}
          {aiPendingReview > 0 ? <Badge tone="info">{`${aiPendingReview} pending review`}</Badge> : null}
          <Badge tone={presentTrendTone(riskTrend)}>{`Risk trend: ${riskTrend}`}</Badge>
        </div>
        <div className="chip-row" style={{ marginTop: 10 }}>
          {segmentation.map((segment) => (
            <Badge key={`${organization.id}-${segment}`} tone="neutral">
              {segment}
            </Badge>
          ))}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">{t("organizationDetail.primaryContacts")}</p>
        {primaryContacts.length === 0 ? (
          <EmptyState
            title={t("organizationDetail.noContactsTitle")}
            description={t("organizationDetail.noContactsDescription")}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("common.email")}</th>
                  <th>{t("users.columns.role")}</th>
                </tr>
              </thead>
              <tbody>
                {primaryContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td className="data-table__mono">{contact.email}</td>
                    <td className="data-table__muted">
                      {presentRoleLabel({
                        platformAdmin: contact.platformAdmin,
                        appRole: contact.role,
                        hasAdvisorMembership: Boolean(
                          contact.memberships?.some((m) => m.role === "ADVISOR"),
                        ),
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Advisor relationships</p>
        {advisorContacts.length === 0 ? (
          <p className="admin-app__card-text data-table__muted">No advisor relationships linked.</p>
        ) : (
          <div className="chip-row">
            {advisorContacts.map((advisor) => (
              <Badge key={advisor.id} tone="info">{`${advisor.name} (${advisor.email})`}</Badge>
            ))}
          </div>
        )}
      </div>

      <PlatformActivityTimeline
        title={t("organizationDetail.recentActivity")}
        items={timelineItems}
        emptyText="No recent operational events."
      />

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Compliance/activity highlights</p>
        <div className="chip-row">
          <Badge tone={productLabels.includes("AI Compliance") ? "success" : "neutral"}>
            {productLabels.includes("AI Compliance")
              ? "AI Compliance coverage active"
              : "AI Compliance coverage unavailable"}
          </Badge>
          <Badge tone={productLabels.includes("Document Intelligence") ? "info" : "neutral"}>
            {productLabels.includes("Document Intelligence")
              ? "Document Intelligence connected"
              : "Document Intelligence not enabled"}
          </Badge>
          <Badge tone={highPressureSystems > 0 ? "danger" : "success"}>
            {`Operational pressure: ${highPressureSystems > 0 ? `${highPressureSystems} high-priority systems` : "Balanced"}`}
          </Badge>
          <Badge tone={staleEvidenceSystems > 0 ? "warning" : "success"}>
            {`Evidence freshness: ${staleEvidenceSystems > 0 ? `${staleEvidenceSystems} stale systems` : "Fresh"}`}
          </Badge>
          <Badge tone={reviewVelocity === "Low" ? "warning" : reviewVelocity === "Medium" ? "info" : "success"}>
            {`Review velocity: ${reviewVelocity}`}
          </Badge>
          <Badge tone={complianceMaturity === "Needs Stabilization" ? "warning" : "info"}>
            {`Compliance maturity: ${complianceMaturity}`}
          </Badge>
        </div>
      </div>

      <Link to="/platform/organizations" className="admin-secondary-btn">
        {t("organizationDetail.backToOrganizations")}
      </Link>
    </PageShell>
  );
}

function toProductLabels(modules: Set<string> | undefined): string[] {
  const active = modules ?? new Set<string>();
  const labels: string[] = [];
  if (active.has("ai_act")) labels.push(presentModuleLabel("ai_act"));
  if (active.has("cafe")) labels.push(presentModuleLabel("cafe"));
  if (active.has("ai_document_intelligence")) labels.push(presentModuleLabel("ai_document_intelligence"));
  if (active.has("advisor_dashboard")) labels.push(presentModuleLabel("advisor_dashboard"));
  if (labels.length === 0) labels.push("Core Platform");
  return labels;
}
