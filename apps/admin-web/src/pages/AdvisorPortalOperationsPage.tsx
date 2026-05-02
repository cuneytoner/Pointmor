import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useAuth } from "../contexts/AuthContext";
import { useAiComplianceOperations } from "../hooks/useAiComplianceOperations";
import { deriveAdvisorWorkload } from "../lib/aiCompliancePresentation";

export function AdvisorPortalOperationsPage() {
  const { bootstrap } = useAdminDataContext();
  const { token } = useAuth();
  const { data: aiOperations } = useAiComplianceOperations(token, 0);
  const systems = aiOperations?.aiCompliance.systems ?? [];
  const workload = deriveAdvisorWorkload(systems, bootstrap?.users ?? []);

  return (
    <PageShell
      eyebrow="Products / Advisor Portal"
      title="Advisor Workload Monitoring"
      description="Operational balancing across advisor-linked organizations and compliance workloads."
    >
      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Advisor distribution</p>
        <div className="advisor-workload-grid">
          {workload.map((row) => (
            <article className="advisor-workload-card" key={row.advisorId}>
              <div className="card-head">
                <p className="admin-app__card-title">{row.advisorName}</p>
                <Badge tone={advisorPressureTone(row.responsePressure)}>
                  {row.responsePressure}
                </Badge>
              </div>
              <div className="advisor-workload-card__metrics">
                <MetricPill label="Assigned orgs" value={row.assignedOrganizations} />
                <MetricPill label="Active reviews" value={row.activeReviews} />
                <MetricPill label="Escalations" value={row.escalatedSystems} />
              </div>
              <p className="admin-app__card-text">
                {`${row.overdueObligations} overdue obligations across assigned work.`}
              </p>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function advisorPressureTone(pressure: string): "danger" | "warning" | "success" {
  return pressure === "High" ? "danger" : pressure === "Elevated" ? "warning" : "success";
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="advisor-workload-card__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
