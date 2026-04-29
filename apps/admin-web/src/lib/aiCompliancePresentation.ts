import type { ModuleOperationsDto } from "../hooks/useAdminData";
import {
  deriveAssessmentWorkflowState,
  deriveObligationWorkflowState,
  type OperationalHealth,
  type ActivitySeverity,
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

export type AiComplianceSlaState =
  | "On track"
  | "Due soon"
  | "Overdue"
  | "Blocked"
  | "Stale evidence";

export type AiComplianceActionItem = {
  id: string;
  type:
    | "overdue_obligation"
    | "escalated_assessment"
    | "stale_evidence"
    | "blocked_review"
    | "advisor_waiting"
    | "high_priority_system";
  title: string;
  organization: string;
  system: string;
  severity: ActivitySeverity;
  reason: string;
  suggestedNextAction: string;
  targetRoute: string;
  slaState: AiComplianceSlaState;
};

export type AiComplianceTimelineItem = {
  id: string;
  title: string;
  when: string;
  type: "compliance" | "advisor" | "onboarding";
  severity: ActivitySeverity;
  organization: string;
  actor: string;
  source: string;
  relatedObject: string;
  reason: string;
  aging?: string;
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

export function deriveSlaState(row: AiComplianceSystemDto): AiComplianceSlaState {
  if (!row.currentAssessment) return "Blocked";
  if (deriveEvidenceFreshness(row) === "Critical" || deriveEvidenceFreshness(row) === "Stale") {
    return "Stale evidence";
  }
  if (hasOverdueObligation(row)) return "Overdue";
  if (hasDueSoonObligation(row) || deriveReviewStatus(row) === "Under Review") return "Due soon";
  return "On track";
}

export function presentSlaTone(
  state: AiComplianceSlaState,
): "success" | "info" | "warning" | "danger" {
  if (state === "On track") return "success";
  if (state === "Due soon") return "warning";
  if (state === "Overdue" || state === "Blocked" || state === "Stale evidence") return "danger";
  return "info";
}

export function presentSlaReason(row: AiComplianceSystemDto): string {
  const state = deriveSlaState(row);
  if (state === "Blocked") return "No current assessment is available.";
  if (state === "Stale evidence") {
    const ageDays = row.currentAssessment ? ageInDays(row.currentAssessment.updatedAt) : ageInDays(row.updatedAt);
    return `Evidence is stale because the latest assessment signal is ${ageDays} days old.`;
  }
  if (state === "Overdue") return "At least one open obligation is older than 14 days.";
  if (state === "Due soon") return "Open review or obligation work is approaching the 14-day SLA.";
  return "No overdue obligations or stale evidence detected.";
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

export function buildTodayActionQueue(
  systems: AiComplianceSystemDto[],
  users: UserDto[],
): AiComplianceActionItem[] {
  const actions: AiComplianceActionItem[] = [];

  for (const system of systems) {
    const people = deriveSystemPeople(system, users);
    const targetRoute = `/platform/products/ai-compliance/systems/${encodeURIComponent(system.id)}`;
    const reviewStatus = deriveReviewStatus(system);
    const evidenceFreshness = deriveEvidenceFreshness(system);
    const slaState = deriveSlaState(system);
    const priorityScore = derivePriorityScore(system);

    for (const obligation of system.obligations) {
      if (!isOpenObligation(obligation.status)) continue;
      const obligationAge = ageInDays(obligation.createdAt);
      if (deriveObligationWorkflowState({
        status: obligation.status,
        ageDays: obligationAge,
        hasEvidence: system.evidencesCount > 0,
      }) === "Overdue") {
        actions.push({
          id: `${system.id}-${obligation.id}-overdue`,
          type: "overdue_obligation",
          title: "Obligation overdue",
          organization: system.tenant.name,
          system: system.name,
          severity: "overdue",
          reason: `${obligation.obligationType} has been open for ${obligationAge} days.`,
          suggestedNextAction: "Assign an owner and request updated evidence.",
          targetRoute,
          slaState,
        });
      }
    }

    if (reviewStatus === "Escalated") {
      actions.push({
        id: `${system.id}-escalated-assessment`,
        type: "escalated_assessment",
        title: "Assessment requires follow-up",
        organization: system.tenant.name,
        system: system.name,
        severity: "escalation",
        reason: `${presentRiskLabel(system.currentAssessment?.riskLevel ?? null)} risk assessment has open obligations.`,
        suggestedNextAction: "Review the assessment outcome and confirm mitigation ownership.",
        targetRoute,
        slaState,
      });
    }

    if (evidenceFreshness === "Critical" || evidenceFreshness === "Stale") {
      actions.push({
        id: `${system.id}-stale-evidence`,
        type: "stale_evidence",
        title: evidenceFreshness === "Critical" ? "Evidence missing" : "Evidence stale",
        organization: system.tenant.name,
        system: system.name,
        severity: evidenceFreshness === "Critical" ? "overdue" : "risk",
        reason:
          system.evidencesCount === 0
            ? "No evidence is linked to the current assessment."
            : presentSlaReason(system),
        suggestedNextAction: "Request current policy, vendor, or control evidence from the owner.",
        targetRoute,
        slaState,
      });
    }

    if (!system.currentAssessment || reviewStatus === "Draft") {
      actions.push({
        id: `${system.id}-blocked-review`,
        type: "blocked_review",
        title: "Review waiting on client",
        organization: system.tenant.name,
        system: system.name,
        severity: "warning",
        reason: system.currentAssessment
          ? "Assessment is still in draft."
          : "System has no current assessment.",
        suggestedNextAction: "Ask the client owner to complete the assessment.",
        targetRoute,
        slaState,
      });
    }

    if (reviewStatus !== "Approved" && people.advisorReviewer) {
      actions.push({
        id: `${system.id}-advisor-waiting`,
        type: "advisor_waiting",
        title: "Needs advisor review",
        organization: system.tenant.name,
        system: system.name,
        severity: "warning",
        reason: `${people.advisorReviewer} is linked as advisor and review status is ${reviewStatus}.`,
        suggestedNextAction: "Confirm the advisor review owner and next response date.",
        targetRoute,
        slaState,
      });
    }

    if (priorityScore >= 70) {
      actions.push({
        id: `${system.id}-high-priority`,
        type: "high_priority_system",
        title: "High priority AI system",
        organization: system.tenant.name,
        system: system.name,
        severity: "risk",
        reason: `Priority score ${priorityScore} from risk, evidence age, review state, and open obligations.`,
        suggestedNextAction: "Triage this system before lower-priority registry work.",
        targetRoute,
        slaState,
      });
    }
  }

  return dedupeActions(actions)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 12);
}

export function buildSystemTimeline(
  system: AiComplianceSystemDto,
  users: UserDto[],
): AiComplianceTimelineItem[] {
  const people = deriveSystemPeople(system, users);
  const items: AiComplianceTimelineItem[] = [];
  const assessment = system.currentAssessment;

  if (assessment) {
    items.push({
      id: `${system.id}-assessment-${assessment.id}`,
      title: "Assessment submitted",
      when: formatDateTime(assessment.updatedAt),
      type: "compliance",
      severity: deriveReviewStatus(system) === "Escalated" ? "escalation" : "info",
      organization: system.tenant.name,
      actor: displayActor(assessment.createdBy) ?? people.complianceOwner ?? "Unknown operator",
      source: "Assessment record",
      relatedObject: `Assessment ${assessment.id.slice(0, 8)}`,
      reason: `${presentRiskLabel(assessment.riskLevel)} risk assessment is ${deriveReviewStatus(system).toLowerCase()}.`,
      aging: `${ageInDays(assessment.updatedAt)} days since update`,
    });
  } else {
    items.push({
      id: `${system.id}-assessment-missing`,
      title: "Assessment not started",
      when: formatDateTime(system.updatedAt),
      type: "compliance",
      severity: "warning",
      organization: system.tenant.name,
      actor: people.complianceOwner ?? displayActor(system.createdBy) ?? "Unknown operator",
      source: "Derived signal",
      relatedObject: system.name,
      reason: "No current assessment exists for this AI system.",
      aging: `${ageInDays(system.updatedAt)} days since system update`,
    });
  }

  for (const obligation of system.obligations.slice(0, 4)) {
    const state = deriveObligationWorkflowState({
      status: obligation.status,
      ageDays: ageInDays(obligation.createdAt),
      hasEvidence: system.evidencesCount > 0,
    });
    items.push({
      id: `${system.id}-obligation-${obligation.id}`,
      title: state === "Overdue" ? "Obligation overdue" : "Obligation created",
      when: formatDateTime(obligation.createdAt),
      type: "compliance",
      severity: state === "Overdue" ? "overdue" : state === "Awaiting Evidence" ? "warning" : "info",
      organization: system.tenant.name,
      actor: displayActor(assessment?.createdBy) ?? people.complianceOwner ?? "Derived signal",
      source: "Obligation record",
      relatedObject: obligation.obligationType,
      reason:
        state === "Overdue"
          ? `${obligation.obligationType} is open after ${ageInDays(obligation.createdAt)} days.`
          : `Created from ${presentRiskLabel(assessment?.riskLevel ?? null)} risk assessment.`,
      aging: state,
    });
  }

  items.push({
    id: `${system.id}-evidence-freshness`,
    title: deriveEvidenceFreshness(system) === "Fresh" ? "Evidence current" : "Evidence needs attention",
    when: assessment ? formatDateTime(assessment.updatedAt) : formatDateTime(system.updatedAt),
    type: "compliance",
    severity:
      deriveEvidenceFreshness(system) === "Critical"
        ? "overdue"
        : deriveEvidenceFreshness(system) === "Stale"
          ? "risk"
          : "info",
    organization: system.tenant.name,
    actor: displayActor(system.createdBy) ?? people.complianceOwner ?? "Derived signal",
    source: "Derived signal",
    relatedObject: `${system.evidencesCount} evidence item${system.evidencesCount === 1 ? "" : "s"}`,
    reason: presentSlaReason(system),
    aging: deriveEvidenceFreshness(system),
  });

  if (people.advisorReviewer) {
    items.push({
      id: `${system.id}-advisor-review`,
      title: "Needs advisor review",
      when: assessment ? formatDateTime(assessment.updatedAt) : formatDateTime(system.updatedAt),
      type: "advisor",
      severity: deriveReviewStatus(system) === "Approved" ? "success" : "warning",
      organization: system.tenant.name,
      actor: people.advisorReviewer,
      source: "Membership context",
      relatedObject: system.name,
      reason:
        deriveReviewStatus(system) === "Approved"
          ? "Advisor membership exists and current review is approved."
          : "Advisor membership exists and review is still open.",
      aging: deriveReviewStatus(system),
    });
  }

  return items.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
}

export function buildOperationsTimeline(
  systems: AiComplianceSystemDto[],
  users: UserDto[],
): AiComplianceTimelineItem[] {
  return systems
    .flatMap((system) => buildSystemTimeline(system, users).slice(0, 3))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 12);
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

function deriveSystemPeople(system: AiComplianceSystemDto, users: UserDto[]): {
  complianceOwner: string | null;
  advisorReviewer: string | null;
} {
  const members = users.filter((user) =>
    user.memberships?.some((membership) => membership.tenant.slug === system.tenant.slug),
  );
  const owner = members.find((user) =>
    user.memberships?.some(
      (membership) => membership.tenant.slug === system.tenant.slug && membership.role === "ADMIN",
    ),
  );
  const advisor = members.find((user) =>
    user.memberships?.some(
      (membership) => membership.tenant.slug === system.tenant.slug && membership.role === "ADVISOR",
    ),
  );
  return {
    complianceOwner: owner ? owner.name || owner.email : null,
    advisorReviewer: advisor ? advisor.name || advisor.email : null,
  };
}

function displayActor(actor: { name: string | null; email: string } | null | undefined): string | null {
  if (!actor) return null;
  return actor.name || actor.email;
}

function isOpenObligation(status: string): boolean {
  return status === "PENDING" || status === "IN_PROGRESS";
}

function hasOverdueObligation(system: AiComplianceSystemDto): boolean {
  return system.obligations.some((obligation) => {
    if (!isOpenObligation(obligation.status)) return false;
    return (
      deriveObligationWorkflowState({
        status: obligation.status,
        ageDays: ageInDays(obligation.createdAt),
        hasEvidence: system.evidencesCount > 0,
      }) === "Overdue"
    );
  });
}

function hasDueSoonObligation(system: AiComplianceSystemDto): boolean {
  return system.obligations.some((obligation) => {
    if (!isOpenObligation(obligation.status)) return false;
    const age = ageInDays(obligation.createdAt);
    return age >= 10 && age <= 14;
  });
}

function ageInDays(value: string): number {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toISOString();
}

function severityRank(severity: ActivitySeverity): number {
  const ranks: Record<ActivitySeverity, number> = {
    overdue: 6,
    escalation: 5,
    risk: 4,
    warning: 3,
    info: 2,
    success: 1,
  };
  return ranks[severity];
}

function dedupeActions(actions: AiComplianceActionItem[]): AiComplianceActionItem[] {
  const seen = new Set<string>();
  const out: AiComplianceActionItem[] = [];
  for (const action of actions) {
    const key = `${action.type}:${action.organization}:${action.system}:${action.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}
