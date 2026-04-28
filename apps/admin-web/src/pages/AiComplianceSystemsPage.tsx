import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import {
  deriveEvidenceFreshness,
  deriveOpenObligationCount,
  derivePriorityScore,
  deriveReviewStatus,
  deriveSystemCategory,
  deriveSystemHealth,
  presentEvidenceFreshnessTone,
  presentRiskLabel,
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
                <th>System name</th>
                <th>Organization</th>
                <th>Category</th>
                <th>Risk level</th>
                <th>Review status</th>
                <th>Open obligations</th>
                <th>Last assessment</th>
                <th>Owner</th>
                <th>Evidence freshness</th>
                <th>Priority</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => {
                const health = deriveSystemHealth(system);
                return (
                  <tr key={system.id}>
                    <td>
                      <Link to={`/platform/products/ai-compliance/systems/${encodeURIComponent(system.id)}`}>
                        {system.name}
                      </Link>
                    </td>
                    <td>{system.tenant.name}</td>
                    <td className="data-table__muted">{deriveSystemCategory(system)}</td>
                    <td>{presentRiskLabel(system.currentAssessment?.riskLevel ?? null)}</td>
                    <td>{deriveReviewStatus(system)}</td>
                    <td>{deriveOpenObligationCount(system)}</td>
                    <td className="data-table__muted">
                      {system.currentAssessment
                        ? new Date(system.currentAssessment.updatedAt).toLocaleDateString()
                        : "No assessment"}
                    </td>
                    <td>{system.createdBy?.name ?? system.createdBy?.email ?? "Unassigned"}</td>
                    <td>
                      <Badge tone={presentEvidenceFreshnessTone(deriveEvidenceFreshness(system))}>
                        {deriveEvidenceFreshness(system)}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={derivePriorityScore(system) >= 70 ? "danger" : "info"}>
                        {derivePriorityScore(system)}
                      </Badge>
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

