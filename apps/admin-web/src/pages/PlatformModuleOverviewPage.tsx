import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";

type ModuleKey = "ai-compliance" | "loyalty" | "advisor-portal";

export function PlatformModuleOverviewPage({ moduleKey }: { moduleKey: ModuleKey }) {
  const { bootstrap } = useAdminDataContext();
  const data = bootstrap?.moduleOperations;

  const title =
    moduleKey === "ai-compliance"
      ? "AI Compliance Operations"
      : moduleKey === "loyalty"
        ? "Loyalty Operations"
        : "Advisor Portal Operations";

  const description =
    moduleKey === "ai-compliance"
      ? "Cross-organization compliance flow health and workload."
      : moduleKey === "loyalty"
        ? "Campaign lifecycle and engagement across organizations."
        : "Advisor-client coordination and shared operational actions.";

  const metricRows = useMemo(() => {
    if (!data) return [];
    if (moduleKey === "ai-compliance") {
      return [
        { label: "Active organizations", value: data.aiCompliance.activeOrganizations },
        { label: "Assessments completed", value: data.aiCompliance.assessmentsCompleted },
        { label: "Pending reviews", value: data.aiCompliance.pendingReviews },
        { label: "Open obligations", value: data.aiCompliance.openObligations },
      ];
    }
    if (moduleKey === "loyalty") {
      return [
        { label: "Active organizations", value: data.loyalty.activeOrganizations },
        { label: "Active campaigns", value: data.loyalty.activeCampaigns },
        { label: "Enrolled customers", value: data.loyalty.enrolledCustomers },
        { label: "Campaign activity", value: data.loyalty.campaignActivity },
      ];
    }
    return [
      { label: "Advisor organizations", value: data.advisorPortal.advisorOrganizations },
      { label: "Linked client organizations", value: data.advisorPortal.linkedClientOrganizations },
      { label: "Pending advisor actions", value: data.advisorPortal.pendingAdvisorActions },
      { label: "Shared workspace activity", value: data.advisorPortal.sharedWorkspaceActivity },
    ];
  }, [data, moduleKey]);

  const timelineItems: PlatformActivityItem[] = useMemo(() => {
    if (!data) return [];
    if (moduleKey === "ai-compliance") {
      return [
        {
          id: "ai-compliance-1",
          title: "Assessment queue synchronized",
          type: "compliance",
          severity: data.aiCompliance.pendingReviews > 0 ? "warning" : "success",
          when: "Current cycle",
        },
        {
          id: "ai-compliance-2",
          title: "Obligation backlog evaluated",
          type: "compliance",
          severity: data.aiCompliance.openObligations > 0 ? "warning" : "info",
          when: "Current cycle",
        },
      ];
    }
    if (moduleKey === "loyalty") {
      return [
        {
          id: "loyalty-1",
          title: "Campaign activity stream updated",
          type: "loyalty",
          severity: data.loyalty.activeCampaigns > 0 ? "success" : "warning",
          when: "Current cycle",
        },
        {
          id: "loyalty-2",
          title: "Customer engagement baseline checked",
          type: "loyalty",
          severity: data.loyalty.enrolledCustomers > 0 ? "info" : "warning",
          when: "Current cycle",
        },
      ];
    }
    return [
      {
        id: "advisor-1",
        title: "Advisor linkage map refreshed",
        type: "advisor",
        severity: data.advisorPortal.linkedClientOrganizations > 0 ? "success" : "warning",
        when: "Current cycle",
      },
      {
        id: "advisor-2",
        title: "Pending advisor actions reviewed",
        type: "advisor",
        severity: data.advisorPortal.pendingAdvisorActions > 0 ? "warning" : "info",
        when: "Current cycle",
      },
    ];
  }, [data, moduleKey]);

  return (
    <PageShell eyebrow="Products" title={title} description={description}>
      <div className="plan-grid">
        {metricRows.map((row) => (
          <div className="metric-card" key={row.label}>
            <span className="metric-card__label">{row.label}</span>
            <strong className="metric-card__value">{row.value}</strong>
          </div>
        ))}
      </div>

      <PlatformActivityTimeline
        title="Recent module activity"
        items={timelineItems}
        emptyText="No module activity yet."
      />

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Coverage snapshot</p>
        <div className="chip-row">
          {(bootstrap?.tenants ?? []).map((tenant) => (
            <Badge key={`${moduleKey}-${tenant.id}`} tone="neutral">
              {tenant.name}
            </Badge>
          ))}
        </div>
      </div>

      <Link to="/platform/products" className="admin-secondary-btn">
        Back to product operations
      </Link>
    </PageShell>
  );
}

