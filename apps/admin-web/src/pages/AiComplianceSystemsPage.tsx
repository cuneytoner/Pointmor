import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  deriveEvidenceFreshness,
  deriveOpenObligationCount,
  derivePriorityReasons,
  derivePriorityScore,
  deriveReviewStatus,
  deriveSlaState,
  deriveSystemCategory,
  deriveSystemHealth,
  formatOperationalAge,
  presentEvidenceFreshnessTone,
  presentRiskLabel,
  presentSlaReason,
  presentSlaTone,
} from "../lib/aiCompliancePresentation";
import { presentHealthTone } from "../lib/platformPresentation";

export function AiComplianceSystemsPage() {
  const { bootstrap } = useAdminDataContext();
  const systems = bootstrap?.moduleOperations.aiCompliance.systems ?? [];

  return (
    <PageShell
      eyebrow="Products / AI Compliance"
      title="AI Systems Registry"
      description="Cross-organization compliance operations queue and governance registry."
    >
      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>System</th>
                <th>Risk / review</th>
                <th>Obligations</th>
                <th>Owner</th>
                <th>SLA / priority</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => {
                const health = deriveSystemHealth(system);
                return (
                  <tr key={system.id}>
                    <td className="ai-registry-system-cell">
                      <Link to={`/platform/products/ai-compliance/systems/${encodeURIComponent(system.id)}`}>
                        {system.name}
                      </Link>
                      <div className="data-table__muted">{system.tenant.name}</div>
                      <div className="data-table__muted">{deriveSystemCategory(system)}</div>
                    </td>
                    <td>
                      <strong>{presentRiskLabel(system.currentAssessment?.riskLevel ?? null)}</strong>
                      <div className="data-table__muted">{deriveReviewStatus(system)}</div>
                    </td>
                    <td>
                      <strong>{deriveOpenObligationCount(system)}</strong>
                      <div className="data-table__muted">
                        {system.currentAssessment
                          ? formatOperationalAge(system.currentAssessment.updatedAt)
                          : "No assessment"}
                      </div>
                    </td>
                    <td>{system.createdBy?.name ?? system.createdBy?.email ?? "Unassigned"}</td>
                    <td title={presentSlaReason(system)}>
                      <div className="ai-registry-badge-stack">
                        <Badge tone={presentSlaTone(deriveSlaState(system))}>
                          {deriveSlaState(system)}
                        </Badge>
                        <Badge tone={presentEvidenceFreshnessTone(deriveEvidenceFreshness(system))}>
                          {deriveEvidenceFreshness(system)}
                        </Badge>
                        <Badge tone={derivePriorityScore(system) >= 70 ? "danger" : "info"}>
                          {`Priority ${derivePriorityScore(system)}`}
                        </Badge>
                      </div>
                      <div className="data-table__muted ai-registry-reasons">
                        {derivePriorityReasons(system).join("; ")}
                      </div>
                    </td>
                    <td>
                      <Badge tone={presentHealthTone(health)}>{health}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Link to="/platform/products/ai-compliance" className="admin-secondary-btn">
        Back to AI Compliance operations
      </Link>
    </PageShell>
  );
}
