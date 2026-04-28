import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { deriveAdvisorWorkload } from "../lib/aiCompliancePresentation";

export function AdvisorPortalOperationsPage() {
  const { bootstrap } = useAdminDataContext();
  const systems = bootstrap?.moduleOperations.aiCompliance.systems ?? [];
  const workload = deriveAdvisorWorkload(systems, bootstrap?.users ?? []);

  return (
    <PageShell
      eyebrow="Products / Advisor Portal"
      title="Advisor Workload Monitoring"
      description="Operational balancing across advisor-linked organizations and compliance workloads."
    >
      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Advisor distribution</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Assigned organizations</th>
                <th>Active reviews</th>
                <th>Overdue obligations</th>
                <th>Escalated systems</th>
                <th>Response pressure</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr key={row.advisorId}>
                  <td>{row.advisorName}</td>
                  <td>{row.assignedOrganizations}</td>
                  <td>{row.activeReviews}</td>
                  <td>{row.overdueObligations}</td>
                  <td>{row.escalatedSystems}</td>
                  <td>
                    <Badge
                      tone={
                        row.responsePressure === "High"
                          ? "danger"
                          : row.responsePressure === "Elevated"
                            ? "warning"
                            : "success"
                      }
                    >
                      {row.responsePressure}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

