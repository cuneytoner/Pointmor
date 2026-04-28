import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";

export function AiComplianceOperationsPage() {
  const { bootstrap } = useAdminDataContext();
  const aiOps = bootstrap?.moduleOperations.aiCompliance;
  const systems = aiOps?.systems ?? [];

  const timelineItems: PlatformActivityItem[] = [
    {
      id: "ops-review",
      title: "Systems needing review monitored",
      when: `${aiOps?.systemsNeedingReview ?? 0} systems`,
      type: "compliance",
      severity: (aiOps?.systemsNeedingReview ?? 0) > 0 ? "warning" : "success",
    },
    {
      id: "ops-overdue",
      title: "Overdue obligations detected",
      when: `${aiOps?.overdueObligations ?? 0} overdue`,
      type: "compliance",
      severity: (aiOps?.overdueObligations ?? 0) > 0 ? "overdue" : "success",
    },
    {
      id: "ops-escalated",
      title: "Escalated assessments triaged",
      when: `${aiOps?.escalatedAssessments ?? 0} escalated`,
      type: "compliance",
      severity: (aiOps?.escalatedAssessments ?? 0) > 0 ? "escalation" : "info",
    },
    {
      id: "ops-advisor",
      title: "Advisor workload synchronized",
      when: `${aiOps?.advisorWorkload ?? 0} open actions`,
      type: "advisor",
      severity: (aiOps?.advisorWorkload ?? 0) > 0 ? "warning" : "info",
    },
    {
      id: "ops-evidence",
      title: "Evidence backlog checkpoint",
      when: `${aiOps?.evidenceBacklog ?? 0} evidence records`,
      type: "compliance",
      severity: (aiOps?.evidenceBacklog ?? 0) === 0 ? "risk" : "info",
    },
  ];

  return (
    <PageShell
      eyebrow="Products / AI Compliance"
      title="AI Compliance Command Center"
      description="Operational control surface for review lifecycle, obligations, and ownership."
    >
      <div className="plan-grid">
        <Metric label="Active organizations" value={aiOps?.activeOrganizations ?? 0} />
        <Metric label="Systems needing review" value={aiOps?.systemsNeedingReview ?? 0} />
        <Metric label="Overdue obligations" value={aiOps?.overdueObligations ?? 0} />
        <Metric label="Escalated assessments" value={aiOps?.escalatedAssessments ?? 0} />
        <Metric label="Advisor workload" value={aiOps?.advisorWorkload ?? 0} />
        <Metric label="Evidence backlog" value={aiOps?.evidenceBacklog ?? 0} />
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="card-head">
          <p className="admin-app__card-title">AI Systems queue</p>
          <Link to="/platform/products/ai-compliance/systems" className="admin-secondary-btn">
            Open systems registry
          </Link>
        </div>
        <div className="chip-row">
          {systems.slice(0, 8).map((system) => (
            <Badge key={system.id} tone="info">
              {`${system.name} (${system.tenant.slug})`}
            </Badge>
          ))}
        </div>
      </div>

      <PlatformActivityTimeline
        title="Compliance operational timeline"
        items={timelineItems}
        emptyText="No operational timeline events."
      />
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value metric-card__value--num">{value}</div>
    </div>
  );
}

