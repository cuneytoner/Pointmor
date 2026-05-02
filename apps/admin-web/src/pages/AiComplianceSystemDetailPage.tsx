import { Link, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PlatformActivityTimeline } from "../components/PlatformActivityTimeline";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useAuth } from "../contexts/AuthContext";
import { useAiComplianceOperations } from "../hooks/useAiComplianceOperations";
import type { AiComplianceOperationsFullDto } from "../hooks/useAdminData";
import {
  buildSystemTimeline,
  deriveEvidenceFreshness,
  deriveLifecycleStage,
  deriveOperationalFriction,
  derivePriorityReasons,
  derivePriorityScore,
  deriveReviewStatus,
  deriveSlaState,
  deriveSystemCategory,
  deriveSystemHealth,
  formatObligationDueDate,
  presentEvidenceFreshnessTone,
  presentRiskLabel,
  presentSlaReason,
  presentSlaTone,
} from "../lib/aiCompliancePresentation";
import {
  deriveObligationWorkflowState,
  presentHealthTone,
  presentRoleLabel,
} from "../lib/platformPresentation";

export function AiComplianceSystemDetailPage() {
  const { systemId = "" } = useParams();
  const { bootstrap } = useAdminDataContext();
  const { token } = useAuth();
  const { loading, error, data } = useAiComplianceOperations(token, 0);

  let systems: AiComplianceOperationsFullDto["systems"] = [];
  let showEmptyState = false;
  let errorMessage: string | null = null;

  if (loading) {
    // Show loading state
  } else if (error) {
    // Handle different error types according to fallback rules
    if (error === "unauthorized" || error === "permission_denied") {
      // Don't use fallback for auth/security errors - show honest error state
      errorMessage = error === "unauthorized" ? "Authentication required" : "Access denied";
      showEmptyState = true;
    } else if (error === "module_not_active" || error === "tenant_context_required") {
      // Don't use fallback for module/tenant errors - show honest empty state
      errorMessage = error === "module_not_active" ? "AI Compliance module not active" : "Tenant context required";
      showEmptyState = true;
    } else {
      // No fallback available - bootstrap only provides counts, not systems
      errorMessage = "Unable to load AI systems data";
      showEmptyState = true;
    }
  } else if (data) {
    // Use authoritative endpoint data
    systems = data.aiCompliance.systems;
  } else {
    // No data and no error - no fallback available
    errorMessage = "Unable to load AI systems data";
    showEmptyState = true;
  }

  const system = systems.find((s) => s.id === systemId);

  if (loading) {
    return (
      <PageShell
        eyebrow="Products / AI Compliance / System"
        title="Loading..."
        description="Operational workflow, lifecycle, and obligation tracking for AI governance."
      >
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text">Loading AI system details...</p>
        </div>
      </PageShell>
    );
  }

  if (showEmptyState || !system) {
    return (
      <PageShell
        eyebrow="Products / AI Compliance / System"
        title="System Not Found"
        description="Operational workflow, lifecycle, and obligation tracking for AI governance."
      >
        <div className="admin-app__card admin-app__card--wide">
          <EmptyState
            title={errorMessage || "AI system not found"}
            description={errorMessage ? "Please check your permissions and try again." : "The requested AI system could not be found or may have been removed."}
          />
        </div>
        <Link to="/platform/products/ai-compliance/systems" className="admin-secondary-btn">
          Back to AI systems
        </Link>
      </PageShell>
    );
  }

  const membershipUsers = (bootstrap?.users ?? []).filter((user) =>
    user.memberships?.some((m) => m.tenant.slug === system.tenant.slug),
  );
  const complianceOwner = membershipUsers.find((u) =>
    u.memberships?.some((m) => m.tenant.slug === system.tenant.slug && m.role === "ADMIN"),
  );
  const advisorReviewer = membershipUsers.find((u) =>
    u.memberships?.some((m) => m.tenant.slug === system.tenant.slug && m.role === "ADVISOR"),
  );
  const lastOperator = system.currentAssessment?.createdBy ?? system.createdBy;
  const health = deriveSystemHealth(system);
  const evidenceFreshness = deriveEvidenceFreshness(system);
  const priorityScore = derivePriorityScore(system);
  const priorityReasons = derivePriorityReasons(system);
  const frictionSignals = deriveOperationalFriction(system, bootstrap?.users ?? []);
  const reviewStatus = deriveReviewStatus(system);
  const slaState = deriveSlaState(system);
  const now = Date.now();
  const timelineItems = buildSystemTimeline(system, bootstrap?.users ?? []);

  return (
    <PageShell
      eyebrow="Products / AI Compliance / System"
      title={system.name}
      description="Operational workflow, lifecycle, and obligation tracking for AI governance."
    >
      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Overview</p>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          <Badge tone="info">{deriveSystemCategory(system)}</Badge>
          <Badge tone="neutral">{`Risk: ${presentRiskLabel(system.currentAssessment?.riskLevel ?? null)}`}</Badge>
          <Badge tone="neutral">{`Lifecycle: ${deriveLifecycleStage(system)}`}</Badge>
          <Badge tone={presentHealthTone(health)}>{`Health: ${health}`}</Badge>
          <Badge tone={presentEvidenceFreshnessTone(evidenceFreshness)}>
            {`Evidence: ${evidenceFreshness}`}
          </Badge>
          <Badge tone={priorityScore >= 70 ? "danger" : "info"}>
            {`Priority: ${priorityScore}`}
          </Badge>
          <Badge tone={presentSlaTone(slaState)}>{`SLA: ${slaState}`}</Badge>
        </div>
        <p className="admin-app__card-text">{`Organization: ${system.tenant.name}`}</p>
        <p className="admin-app__card-text">{`Owner: ${complianceOwner?.name ?? system.createdBy?.name ?? "Unassigned"}`}</p>
        <p className="admin-app__card-text">{`Advisor reviewer: ${advisorReviewer?.name ?? "Not assigned"}`}</p>
        <p className="admin-app__card-text">{`Last operator: ${lastOperator?.name ?? lastOperator?.email ?? "Unknown"}`}</p>
        <p className="admin-app__card-text">{`Review summary: ${reviewStatus}`}</p>
        <p className="admin-app__card-text">{`Priority drivers: ${priorityReasons.join("; ")}`}</p>
        <p className="admin-app__card-text">
          {`Operational friction: ${frictionSignals.length > 0 ? frictionSignals.join("; ") : "No derived friction signals"}`}
        </p>
        <p className="admin-app__card-text">{`SLA reason: ${presentSlaReason(system)}`}</p>
      </div>

      <PlatformActivityTimeline
        title="Assessment timeline"
        items={timelineItems}
        emptyText="No assessment, obligation, evidence, or advisor signals yet."
      />

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Obligations</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Obligation</th>
                <th>Owner</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {system.obligations.map((obligation: AiComplianceOperationsFullDto["systems"][0]["obligations"][0]) => {
                const ageDays = Math.floor((now - new Date(obligation.createdAt).getTime()) / (24 * 60 * 60 * 1000));
                const state = deriveObligationWorkflowState({
                  status: obligation.status,
                  ageDays,
                  hasEvidence: system.evidencesCount > 0,
                });
                return (
                  <tr key={obligation.id}>
                    <td>{obligation.obligationType}</td>
                    <td>{complianceOwner?.name ?? "Compliance owner"}</td>
                    <td className="data-table__muted">{formatObligationDueDate(obligation.createdAt)}</td>
                    <td>{state}</td>
                    <td>
                      <Badge
                        tone={
                          state === "Overdue" ? "danger" : state === "Awaiting Evidence" ? "warning" : "info"
                        }
                      >
                        {state === "Overdue"
                          ? "overdue"
                          : state === "Awaiting Evidence"
                            ? "needs evidence"
                            : "operational"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">Review summary</p>
        <div className="chip-row">
          <Badge tone={reviewStatus === "Approved" ? "success" : "info"}>
            {reviewStatus === "Approved" ? "approved" : "pending review"}
          </Badge>
          <Badge tone={system.evidencesCount === 0 ? "warning" : "info"}>
            {system.evidencesCount === 0 ? "needs evidence" : "evidence available"}
          </Badge>
          <Badge tone={reviewStatus === "Escalated" ? "danger" : "neutral"}>
            {reviewStatus === "Escalated" ? "escalated" : "no escalation"}
          </Badge>
          <Badge tone="neutral">
            {presentRoleLabel({
              platformAdmin: Boolean(complianceOwner?.platformAdmin),
              appRole: complianceOwner?.role ?? "member",
              hasAdvisorMembership: false,
            })}
          </Badge>
        </div>
      </div>

      <Link to="/platform/products/ai-compliance/systems" className="admin-secondary-btn">
        Back to AI systems
      </Link>
    </PageShell>
  );
}
