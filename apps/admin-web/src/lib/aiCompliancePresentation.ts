import type { ModuleOperationsDto } from "../hooks/useAdminData";
import {
  deriveAssessmentWorkflowState,
  deriveObligationWorkflowState,
  type OperationalHealth,
} from "./platformPresentation";

export type AiComplianceSystemDto = ModuleOperationsDto["aiCompliance"]["systems"][number];
type UserDto = {
  id: string;
  name: string;
  email: string;
  platformAdmin: boolean;
  role: string;
  memberships?: Array<{ role: string; tenant: { slug: string; name: string } }>;
};

export function presentRiskLabel(riskLevel: string | null): string {
  if (!riskLevel) return "Not assessed";
  if (riskLevel === "HIGH" || riskLevel === "UNACCEPTABLE" || riskLevel === "PROHIBITED") {
    return "High";
  }
  if (riskLevel === "LIMITED" || riskLevel === "MEDIUM") return "Limited";
  if (riskLevel === "MINIMAL" || riskLevel === "LOW") return "Minimal";
  return riskLevel;
}

export function deriveSystemCategory(row: AiComplianceSystemDto): string {
  const source = `${row.name} ${row.purpose ?? ""}`.toLowerCase();
  if (source.includes("invoice") || source.includes("extract")) return "Document Intelligence";
  if (source.includes("support") || source.includes("copilot")) return "Customer Operations";
  if (source.includes("recommend")) return "Decision Support";
  if (source.includes("contract")) return "Legal Operations";
  return row.providerType === "EXTERNAL" ? "External AI Service" : "Internal AI Service";
}

export function deriveLifecycleStage(row: AiComplianceSystemDto): string {
  if (row.status === "DRAFT") return "Design";
  if (row.status === "ARCHIVED") return "Retired";
  if (row.currentAssessment?.status === "DRAFT") return "Validation";
  return "Production";
}

export function deriveReviewStatus(row: AiComplianceSystemDto): string {
  const now = Date.now();
  const ageDays = row.currentAssessment
    ? Math.floor((now - new Date(row.currentAssessment.updatedAt).getTime()) / (24 * 60 * 60 * 1000))
    : 0;
  const openObligations = row.obligations.filter((o) =>
    ["PENDING", "IN_PROGRESS"].includes(o.status),
  ).length;
  return deriveAssessmentWorkflowState({
    assessmentStatus: row.currentAssessment?.status ?? null,
    riskLevel: row.currentAssessment?.riskLevel ?? null,
    openObligations,
    ageDays,
  });
}

export function deriveSystemHealth(row: AiComplianceSystemDto): OperationalHealth {
  const now = Date.now();
  const overdue = row.obligations.some((o) => {
    const ageDays = Math.floor((now - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    return deriveObligationWorkflowState({
      status: o.status,
      ageDays,
      hasEvidence: row.evidencesCount > 0,
    }) === "Overdue";
  });
  if (overdue) return "At Risk";
  if (!row.currentAssessment) return "Blocked";
  if (deriveReviewStatus(row) === "Escalated") return "At Risk";
  if (deriveReviewStatus(row) === "Under Review") return "Attention Needed";
  return "Healthy";
}

export function deriveOpenObligationCount(row: AiComplianceSystemDto): number {
  return row.obligations.filter((o) => o.status === "PENDING" || o.status === "IN_PROGRESS").length;
}

export type EvidenceFreshness = "Fresh" | "Aging" | "Stale" | "Critical";
export type OrganizationRiskTrend =
  | "Stable"
  | "Improving"
  | "Expanding"
  | "Degrading"
  | "Critical Attention";

export function deriveEvidenceFreshness(row: AiComplianceSystemDto): EvidenceFreshness {
  if (!row.currentAssessment) return "Critical";
  const now = Date.now();
  const assessmentAgeDays = Math.floor(
    (now - new Date(row.currentAssessment.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
  );
  const systemAgeDays = Math.floor((now - new Date(row.updatedAt).getTime()) / (24 * 60 * 60 * 1000));
  if (row.evidencesCount === 0) return assessmentAgeDays > 14 ? "Critical" : "Stale";
  if (assessmentAgeDays <= 7 && systemAgeDays <= 10) return "Fresh";
  if (assessmentAgeDays <= 14) return "Aging";
  if (assessmentAgeDays <= 30) return "Stale";
  return "Critical";
}

export function presentEvidenceFreshnessTone(
  freshness: EvidenceFreshness,
): "success" | "info" | "warning" | "danger" {
  if (freshness === "Fresh") return "success";
  if (freshness === "Aging") return "info";
  if (freshness === "Stale") return "warning";
  return "danger";
}

export function derivePriorityScore(row: AiComplianceSystemDto): number {
  const risk = row.currentAssessment?.riskLevel;
  const riskWeight =
    risk === "HIGH" || risk === "UNACCEPTABLE" || risk === "PROHIBITED"
      ? 40
      : risk === "LIMITED" || risk === "MEDIUM"
        ? 22
        : risk === "MINIMAL" || risk === "LOW"
          ? 10
          : 16;
  const overdue = row.obligations.filter((o) => {
    const ageDays = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    return (
      deriveObligationWorkflowState({
        status: o.status,
        ageDays,
        hasEvidence: row.evidencesCount > 0,
      }) === "Overdue"
    );
  }).length;
  const staleEvidence = deriveEvidenceFreshness(row);
  const staleWeight = staleEvidence === "Critical" ? 26 : staleEvidence === "Stale" ? 14 : 4;
  const reviewWeight = deriveReviewStatus(row) === "Escalated" ? 24 : deriveReviewStatus(row) === "Under Review" ? 14 : 6;
  const openObligationsWeight = Math.min(20, deriveOpenObligationCount(row) * 4);
  return Math.min(100, riskWeight + overdue * 8 + staleWeight + reviewWeight + openObligationsWeight);
}

export function deriveOrganizationRiskTrend(systems: AiComplianceSystemDto[]): OrganizationRiskTrend {
  if (systems.length === 0) return "Stable";
  const overdue = systems.reduce((sum, row) => {
    const count = row.obligations.filter((o) => {
      const ageDays = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      return (
        deriveObligationWorkflowState({
          status: o.status,
          ageDays,
          hasEvidence: row.evidencesCount > 0,
        }) === "Overdue"
      );
    }).length;
    return sum + count;
  }, 0);
  const escalated = systems.filter((row) => deriveReviewStatus(row) === "Escalated").length;
  const stale = systems.filter((row) => {
    const freshness = deriveEvidenceFreshness(row);
    return freshness === "Stale" || freshness === "Critical";
  }).length;
  const pendingReview = systems.filter((row) => {
    const state = deriveReviewStatus(row);
    return state === "Draft" || state === "Under Review" || state === "Submitted";
  }).length;
  const pressure = overdue * 4 + escalated * 5 + stale * 3 + pendingReview * 2;
  if (pressure >= 18) return "Critical Attention";
  if (pressure >= 12) return "Degrading";
  if (pressure >= 8) return "Expanding";
  if (pressure >= 4) return "Improving";
  return "Stable";
}

export function presentTrendTone(
  trend: OrganizationRiskTrend,
): "success" | "info" | "warning" | "danger" {
  if (trend === "Stable") return "success";
  if (trend === "Improving" || trend === "Expanding") return "info";
  if (trend === "Degrading") return "warning";
  return "danger";
}

export function buildReviewQueueIntelligence(systems: AiComplianceSystemDto[]): Array<{
  key:
    | "needs_review"
    | "waiting_evidence"
    | "escalated"
    | "overdue_obligations"
    | "advisor_blocked";
  title: string;
  count: number;
  topOrganizations: string;
  oldestWaiting: string;
  riskSeverity: "success" | "warning" | "risk" | "escalation" | "overdue";
}> {
  const byKey = {
    needs_review: systems.filter((s) => {
      const state = deriveReviewStatus(s);
      return state === "Draft" || state === "Submitted" || state === "Under Review";
    }),
    waiting_evidence: systems.filter((s) => {
      const freshness = deriveEvidenceFreshness(s);
      return freshness === "Stale" || freshness === "Critical";
    }),
    escalated: systems.filter((s) => deriveReviewStatus(s) === "Escalated"),
    overdue_obligations: systems.filter((s) =>
      s.obligations.some((o) => {
        const ageDays = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        return (
          deriveObligationWorkflowState({
            status: o.status,
            ageDays,
            hasEvidence: s.evidencesCount > 0,
          }) === "Overdue"
        );
      }),
    ),
    advisor_blocked: systems.filter(
      (s) => deriveReviewStatus(s) !== "Approved" && !s.tasks.some((t) => t.assignedTo),
    ),
  } as const;

  const defs: Array<{
    key: keyof typeof byKey;
    title: string;
    severity: "success" | "warning" | "risk" | "escalation" | "overdue";
  }> = [
    { key: "needs_review", title: "Needs review", severity: "warning" },
    { key: "waiting_evidence", title: "Waiting evidence", severity: "risk" },
    { key: "escalated", title: "Escalated", severity: "escalation" },
    { key: "overdue_obligations", title: "Overdue obligations", severity: "overdue" },
    { key: "advisor_blocked", title: "Advisor blocked items", severity: "warning" },
  ];

  return defs.map((def) => {
    const list = byKey[def.key];
    const topOrganizations = topOrganizationsFromSystems(list);
    const oldestWaiting = oldestWaitingFromSystems(list);
    return {
      key: def.key,
      title: def.title,
      count: list.length,
      topOrganizations,
      oldestWaiting,
      riskSeverity: list.length === 0 ? "success" : def.severity,
    };
  });
}

export function deriveAdvisorWorkload(
  systems: AiComplianceSystemDto[],
  users: UserDto[],
): Array<{
  advisorId: string;
  advisorName: string;
  assignedOrganizations: number;
  activeReviews: number;
  overdueObligations: number;
  escalatedSystems: number;
  responsePressure: "Balanced" | "Elevated" | "High";
}> {
  const advisorUsers = users.filter((u) => u.memberships?.some((m) => m.role === "ADVISOR"));
  return advisorUsers.map((advisor) => {
    const advisorOrgs = new Set(
      advisor.memberships?.filter((m) => m.role === "ADVISOR").map((m) => m.tenant.slug) ?? [],
    );
    const relatedSystems = systems.filter((s) => advisorOrgs.has(s.tenant.slug));
    const activeReviews = relatedSystems.filter((s) => deriveReviewStatus(s) !== "Approved").length;
    const escalatedSystems = relatedSystems.filter((s) => deriveReviewStatus(s) === "Escalated").length;
    const overdueObligations = relatedSystems.reduce(
      (sum, s) =>
        sum +
        s.obligations.filter((o) => {
          const ageDays = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (24 * 60 * 60 * 1000));
          return (
            deriveObligationWorkflowState({
              status: o.status,
              ageDays,
              hasEvidence: s.evidencesCount > 0,
            }) === "Overdue"
          );
        }).length,
      0,
    );
    const pressureScore = activeReviews * 2 + overdueObligations * 3 + escalatedSystems * 4;
    return {
      advisorId: advisor.id,
      advisorName: advisor.name || advisor.email,
      assignedOrganizations: advisorOrgs.size,
      activeReviews,
      overdueObligations,
      escalatedSystems,
      responsePressure:
        pressureScore >= 12 ? "High" : pressureScore >= 6 ? "Elevated" : "Balanced",
    };
  });
}

function topOrganizationsFromSystems(systems: AiComplianceSystemDto[]): string {
  if (systems.length === 0) return "None";
  const count = new Map<string, number>();
  for (const row of systems) {
    count.set(row.tenant.name, (count.get(row.tenant.name) ?? 0) + 1);
  }
  return Array.from(count.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name)
    .join(", ");
}

function oldestWaitingFromSystems(systems: AiComplianceSystemDto[]): string {
  if (systems.length === 0) return "No backlog";
  const oldest = systems
    .map((row) => ({
      name: row.name,
      at: row.currentAssessment?.updatedAt ?? row.updatedAt,
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0];
  return `${oldest.name} (${new Date(oldest.at).toLocaleDateString()})`;
}

