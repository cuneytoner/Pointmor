import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  buildReviewQueueIntelligence,
  deriveAdvisorWorkload,
  deriveEvidenceFreshness,
  derivePriorityScore,
  deriveReviewStatus,
} from "../lib/aiCompliancePresentation";
import {
  type ActivitySeverity,
  presentActivitySeverityTone,
} from "../lib/platformPresentation";

export function AiComplianceOperationsPage() {
  const { bootstrap } = useAdminDataContext();
  const aiOps = bootstrap?.moduleOperations.aiCompliance;
  const systems = aiOps?.systems ?? [];
  const reviewQueue = buildReviewQueueIntelligence(systems);
  const advisorWorkload = deriveAdvisorWorkload(systems, bootstrap?.users ?? []);
  const topPrioritySystems = [...systems]
    .sort((a, b) => derivePriorityScore(b) - derivePriorityScore(a))
    .slice(0, 5);
  const organizationsAtRisk = Array.from(
    new Set(
      systems
        .filter((system) => derivePriorityScore(system) >= 70)
        .map((system) => system.tenant.name),
    ),
  );
  const expiringEvidence = systems.filter((system) => {
    const freshness = deriveEvidenceFreshness(system);
    return freshness === "Stale" || freshness === "Critical";
  });

  const timelineItems: PlatformActivityItem[] = [
    {
      id: "ops-review",
      title: "Systems needing review monitored",
      when: `${aiOps?.systemsNeedingReview ?? 0} systems`,
      aging: "Queue cycle",
      chain: "Review Queue",
      type: "compliance",
      severity: (aiOps?.systemsNeedingReview ?? 0) > 0 ? "warning" : "success",
    },
    {
      id: "ops-overdue",
      title: "Overdue obligations detected",
      when: `${aiOps?.overdueObligations ?? 0} overdue`,
      aging: "14d+",
      chain: "Obligation Chain",
      type: "compliance",
      severity: (aiOps?.overdueObligations ?? 0) > 0 ? "overdue" : "success",
    },
    {
      id: "ops-escalated",
      title: "Escalated assessments triaged",
      when: `${aiOps?.escalatedAssessments ?? 0} escalated`,
      aging: "7d+",
      chain: "Escalation Chain",
      type: "compliance",
      severity: (aiOps?.escalatedAssessments ?? 0) > 0 ? "escalation" : "info",
    },
    {
      id: "ops-advisor",
      title: "Advisor workload synchronized",
      when: `${aiOps?.advisorWorkload ?? 0} open actions`,
      aging: "Current",
      chain: "Advisor Chain",
      type: "advisor",
      severity: (aiOps?.advisorWorkload ?? 0) > 0 ? "warning" : "info",
    },
    {
      id: "ops-evidence",
      title: "Evidence backlog checkpoint",
      when: `${aiOps?.evidenceBacklog ?? 0} evidence records`,
      aging: "Evidence window",
      chain: "Evidence Chain",
      type: "compliance",
      severity: (aiOps?.evidenceBacklog ?? 0) === 0 ? "risk" : "info",
    },
    {
      id: "ops-reassign",
      title: "Review reassigned",
      when: `${reviewQueue.find((q) => q.key === "advisor_blocked")?.count ?? 0} blocked systems`,
      aging: "Current",
      chain: "Advisor Chain",
      type: "advisor",
      severity: (reviewQueue.find((q) => q.key === "advisor_blocked")?.count ?? 0) > 0 ? "warning" : "info",
    },
    {
      id: "ops-evidence-expired",
      title: "Evidence expired",
      when: `${expiringEvidence.length} stale systems`,
      aging: "30d+",
      chain: "Evidence Chain",
      type: "compliance",
      severity: expiringEvidence.length > 0 ? "overdue" : "success",
    },
    {
      id: "ops-escalation-triggered",
      title: "Escalation triggered",
      when: `${reviewQueue.find((q) => q.key === "escalated")?.count ?? 0} systems`,
      aging: "Escalation SLA",
      chain: "Escalation Chain",
      type: "compliance",
      severity: (reviewQueue.find((q) => q.key === "escalated")?.count ?? 0) > 0 ? "escalation" : "info",
    },
    {
      id: "ops-advisor-assigned",
      title: "Advisor assigned",
      when: `${advisorWorkload.length} advisors on rotation`,
      aging: "Current",
      chain: "Advisor Chain",
      type: "advisor",
      severity: "info",
    },
    {
      id: "ops-overdue-reminder",
      title: "Overdue reminder generated",
      when: `${reviewQueue.find((q) => q.key === "overdue_obligations")?.count ?? 0} queues`,
      aging: "14d+",
      chain: "Obligation Chain",
      type: "compliance",
      severity:
        (reviewQueue.find((q) => q.key === "overdue_obligations")?.count ?? 0) > 0
          ? "overdue"
          : "success",
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
        <p className="admin-app__card-title">Operational heatmap</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {([
                {
                  area: "Review throughput",
                  status:
                    (reviewQueue.find((q) => q.key === "needs_review")?.count ?? 0) > 3
                      ? "Warning"
                      : "Healthy",
                  severity:
                    (reviewQueue.find((q) => q.key === "needs_review")?.count ?? 0) > 3
                      ? "warning"
                      : "success",
                },
                {
                  area: "Evidence freshness",
                  status: expiringEvidence.length > 0 ? "Warning" : "Healthy",
                  severity: expiringEvidence.length > 0 ? "warning" : "success",
                },
                {
                  area: "Advisor workload",
                  status: advisorWorkload.some((w) => w.responsePressure === "High")
                    ? "High"
                    : "Balanced",
                  severity: advisorWorkload.some((w) => w.responsePressure === "High")
                    ? "risk"
                    : "info",
                },
                {
                  area: "Escalation rate",
                  status:
                    (reviewQueue.find((q) => q.key === "escalated")?.count ?? 0) > 0
                      ? "Elevated"
                      : "Stable",
                  severity:
                    (reviewQueue.find((q) => q.key === "escalated")?.count ?? 0) > 0
                      ? "escalation"
                      : "success",
                },
              ] as HeatmapRow[]).map((row) => (
                <tr key={row.area}>
                  <td>{row.area}</td>
                  <td>
                    <Badge tone={presentActivitySeverityTone(row.severity)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Review queue intelligence</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Count</th>
                <th>Top impacted organizations</th>
                <th>Oldest waiting item</th>
                <th>Risk severity</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((row) => (
                <tr key={row.key}>
                  <td>{row.title}</td>
                  <td>{row.count}</td>
                  <td className="data-table__muted">{row.topOrganizations}</td>
                  <td className="data-table__muted">{row.oldestWaiting}</td>
                  <td>
                    <Badge tone={presentActivitySeverityTone(row.riskSeverity)}>{row.riskSeverity}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="plan-grid">
        <ActionWidget
          title="Needs action"
          description={`${reviewQueue.reduce((sum, row) => sum + row.count, 0)} items in active queues`}
          tone="warning"
        />
        <ActionWidget
          title="Review bottlenecks"
          description={`${reviewQueue.find((row) => row.key === "needs_review")?.count ?? 0} systems waiting review`}
          tone="info"
        />
        <ActionWidget
          title="Organizations at risk"
          description={organizationsAtRisk.length > 0 ? organizationsAtRisk.join(", ") : "No organizations at risk"}
          tone={organizationsAtRisk.length > 0 ? "danger" : "success"}
        />
        <ActionWidget
          title="Evidence expiring soon"
          description={`${expiringEvidence.length} systems with stale evidence`}
          tone={expiringEvidence.length > 0 ? "warning" : "success"}
        />
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
            <Badge
              key={system.id}
              tone={derivePriorityScore(system) >= 70 ? "danger" : "info"}
            >
              {`${system.name} (${system.tenant.slug}) • P${derivePriorityScore(system)}`}
            </Badge>
          ))}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Top priority systems</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>System</th>
                <th>Organization</th>
                <th>Priority score</th>
                <th>Review status</th>
                <th>Evidence freshness</th>
              </tr>
            </thead>
            <tbody>
              {topPrioritySystems.map((system) => (
                <tr key={system.id}>
                  <td>{system.name}</td>
                  <td>{system.tenant.name}</td>
                  <td>{derivePriorityScore(system)}</td>
                  <td>{deriveReviewStatus(system)}</td>
                  <td>{deriveEvidenceFreshness(system)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

type HeatmapRow = {
  area: string;
  status: string;
  severity: ActivitySeverity;
};

function ActionWidget({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  return (
    <div className="admin-app__card">
      <p className="admin-app__card-title">{title}</p>
      <p className="admin-app__card-text">{description}</p>
      <Badge tone={tone}>Action oriented</Badge>
    </div>
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

