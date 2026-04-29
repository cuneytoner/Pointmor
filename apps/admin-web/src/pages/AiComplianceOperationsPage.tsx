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
  buildOperationsTimeline,
  buildTodayActionQueue,
  deriveAdvisorWorkload,
  deriveEvidenceFreshness,
  derivePriorityScore,
  deriveReviewStatus,
  deriveSlaState,
  presentSlaTone,
} from "../lib/aiCompliancePresentation";
import {
  type ActivitySeverity,
  presentActivitySeverityLabel,
  presentActivitySeverityTone,
} from "../lib/platformPresentation";

export function AiComplianceOperationsPage() {
  const { bootstrap } = useAdminDataContext();
  const aiOps = bootstrap?.moduleOperations.aiCompliance;
  const systems = aiOps?.systems ?? [];
  const reviewQueue = buildReviewQueueIntelligence(systems);
  const advisorWorkload = deriveAdvisorWorkload(systems, bootstrap?.users ?? []);
  const todayActionQueue = buildTodayActionQueue(systems, bootstrap?.users ?? []);
  const timelineItems: PlatformActivityItem[] = buildOperationsTimeline(
    systems,
    bootstrap?.users ?? [],
  );
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
          <p className="admin-app__card-title">Today's Action Queue</p>
          <Badge tone={todayActionQueue.length > 0 ? "warning" : "success"}>
            {todayActionQueue.length > 0 ? `${todayActionQueue.length} items need attention` : "No urgent actions"}
          </Badge>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Organization</th>
                <th>AI system</th>
                <th>Severity</th>
                <th>SLA</th>
                <th>Reason</th>
                <th>Suggested next action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {todayActionQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="data-table__muted">
                    No overdue obligations, blocked reviews, stale evidence, or high-priority systems.
                  </td>
                </tr>
              ) : (
                todayActionQueue.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.organization}</td>
                    <td>{item.system}</td>
                    <td>
                      <Badge tone={presentActivitySeverityTone(item.severity)}>
                        {presentActivitySeverityLabel(item.severity)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={presentSlaTone(item.slaState)}>{item.slaState}</Badge>
                    </td>
                    <td className="data-table__muted">{item.reason}</td>
                    <td className="data-table__muted">{item.suggestedNextAction}</td>
                    <td>
                      <Link to={item.targetRoute} className="admin-secondary-btn">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <th>SLA state</th>
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
                  <td>
                    <Badge tone={presentSlaTone(deriveSlaState(system))}>
                      {deriveSlaState(system)}
                    </Badge>
                  </td>
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
      <Badge tone={tone}>Derived from current records</Badge>
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
