import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useAuth } from "../contexts/AuthContext";
import {
  useAiComplianceOperations,
} from "../hooks/useAiComplianceOperations";
import {
  buildReviewQueueIntelligence,
  buildOperationsTimeline,
  buildTodayActionQueue,
  deriveAdvisorWorkload,
  deriveEvidenceFreshness,
  derivePriorityReasons,
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
  const { token, refreshKey } = useAuth();

  // Primary data source: dedicated AI Compliance endpoint
  const {
    loading: opsLoading,
    error: opsError,
    data: opsData,
  } = useAiComplianceOperations(token, refreshKey);

  // Note: Operations page requires full systems data, bootstrap only provides counts
  // No fallback available - operations page needs dedicated endpoint data
  const aiOps = opsData?.aiCompliance;
  const systems = aiOps?.systems ?? [];

  // Loading state: show loading only when fetching, not when using fallback
  const isLoading = opsLoading && !aiOps;
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

  // Error display
  if (opsError && !aiOps) {
    return (
      <PageShell
        eyebrow="Products / AI Compliance"
        title="AI Compliance Command Center"
        description="Operational control surface for review lifecycle, obligations, and ownership."
      >
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-title">Error loading AI Compliance data</p>
          <p className="admin-app__card-text">
            {opsError === "forbidden" && "Access denied. You do not have permission to access AI Compliance operations."}
            {opsError === "permission_denied" && "You do not have permission to access AI Compliance operations."}
            {opsError === "module_not_active" && "AI Compliance module is not active for this tenant."}
            {opsError === "tenant_context_required" && "Tenant context is required."}
            {opsError === "unauthorized" && "Session expired. Please log in again."}
            {!["unauthorized", "forbidden", "permission_denied", "module_not_active", "tenant_context_required"].includes(opsError ?? "") &&
              `Failed to load data: ${opsError}`}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Products / AI Compliance"
      title="AI Compliance Command Center"
      description="Operational control surface for review lifecycle, obligations, and ownership."
    >
      {isLoading && (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text">Loading AI Compliance operations...</p>
        </div>
      )}
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
        <div className="ops-action-list">
          {todayActionQueue.length === 0 ? (
            <p className="admin-app__card-text data-table__muted">
              No overdue obligations, blocked reviews, stale evidence, or high-priority systems.
            </p>
          ) : (
            todayActionQueue.map((item) => (
              <article className="ops-action-card" key={item.id}>
                <div className="ops-action-card__main">
                  <div>
                    <p className="ops-action-card__title">{item.primaryAction}</p>
                    <p className="ops-action-card__meta">
                      {`${item.organization} - ${item.system}`}
                    </p>
                  </div>
                  <div className="ops-action-card__badges">
                    <Badge tone={presentActivitySeverityTone(item.severity)}>
                      {presentActivitySeverityLabel(item.severity)}
                    </Badge>
                    <Badge tone={presentSlaTone(item.slaState)}>{item.slaState}</Badge>
                  </div>
                </div>
                <p className="admin-app__card-text">{item.reason}</p>
                <p className="admin-app__card-text data-table__muted">
                  {item.suggestedNextAction}
                </p>
                <div className="ops-action-card__footer">
                  <div className="ops-action-card__context">
                    <span>{item.actionCategory}</span>
                    <span>{item.secondaryContext}</span>
                    <span>{`Priority ${item.priorityScore}: ${item.priorityReasons.join("; ")}`}</span>
                  </div>
                  <Link to={item.targetRoute} className="admin-secondary-btn">
                    {item.actionLabel}
                  </Link>
                </div>
              </article>
            ))
          )}
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
        <div className="ops-queue-grid">
          {systems.slice(0, 8).map((system) => (
            <Link
              key={system.id}
              to={`/platform/products/ai-compliance/systems/${encodeURIComponent(system.id)}`}
              className="ops-queue-item"
            >
              <span>
                <strong>{system.name}</strong>
                <small>{system.tenant.name}</small>
              </span>
              <Badge tone={derivePriorityScore(system) >= 70 ? "danger" : "info"}>
                {`Priority ${derivePriorityScore(system)}`}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Top priority systems</p>
        <div className="ops-compact-list">
          {topPrioritySystems.map((system) => (
            <article className="ops-compact-row ops-compact-row--priority" key={system.id}>
              <div>
                <p className="ops-action-card__title">{system.name}</p>
                <p className="ops-action-card__meta">{system.tenant.name}</p>
              </div>
              <div className="ops-compact-row__status">
                <Badge tone="neutral">{deriveReviewStatus(system)}</Badge>
                <Badge tone={presentSlaTone(deriveSlaState(system))}>
                  {deriveSlaState(system)}
                </Badge>
                <Badge tone={derivePriorityScore(system) >= 70 ? "danger" : "info"}>
                  {`Priority ${derivePriorityScore(system)}`}
                </Badge>
              </div>
              <p className="admin-app__card-text data-table__muted">
                {derivePriorityReasons(system).join("; ")}
              </p>
            </article>
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
