import type { SubscriptionDto } from "../hooks/useAdminData";

export function presentRoleLabel(input: {
  platformAdmin: boolean;
  appRole: string;
  hasAdvisorMembership?: boolean;
}): string {
  if (input.platformAdmin) return "Platform Admin";
  if (input.hasAdvisorMembership) return "Advisor";
  if (input.appRole === "tenant_operator") return "Organization Admin";
  if (input.appRole === "member") return "Member";
  if (input.appRole === "viewer") return "Viewer";
  return input.appRole.replaceAll("_", " ");
}

export function presentModuleLabel(moduleName: string): string {
  const labels: Record<string, string> = {
    ai_act: "AI Compliance",
    cafe: "Loyalty",
    advisor_dashboard: "Advisor Portal",
    ai_document_intelligence: "Document Intelligence",
  };
  return labels[moduleName] ?? moduleName.replaceAll("_", " ");
}

export function presentAuditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    seed: "Initial platform seed",
    subscription_update: "Subscription updated",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

export function presentSubscriptionHealth(row: SubscriptionDto): {
  label: "Active" | "Trial" | "Suspended" | "Expiring Soon";
  tone: "success" | "info" | "warning";
} {
  if (row.status === "trialing") return { label: "Trial", tone: "info" };
  if (row.status === "past_due") return { label: "Suspended", tone: "warning" };
  if (row.renewsAt) {
    const renewalDate = new Date(row.renewsAt).getTime();
    const now = Date.now();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    if (renewalDate > now && renewalDate - now <= tenDaysMs) {
      return { label: "Expiring Soon", tone: "warning" };
    }
  }
  return { label: "Active", tone: "success" };
}

export type OperationalHealth = "Healthy" | "Attention Needed" | "At Risk" | "Blocked";
export type OnboardingStage =
  | "Provisioning"
  | "Active"
  | "Expanding"
  | "Operational"
  | "Attention Needed";
export type ActivitySeverity =
  | "success"
  | "info"
  | "warning"
  | "risk"
  | "escalation"
  | "overdue";
export type ActivityType =
  | "compliance"
  | "billing"
  | "advisor"
  | "loyalty"
  | "onboarding"
  | "subscription_lifecycle";

export function deriveOrganizationSegmentation(input: {
  modules: Set<string>;
  planName: string | null;
  tenantType?: string;
}): string[] {
  const out: string[] = [];
  const hasAi = input.modules.has("ai_act");
  const hasLoyalty = input.modules.has("cafe");
  const hasAdvisor = input.tenantType === "ADVISOR" || input.modules.has("advisor_dashboard");
  if (hasAi && !hasLoyalty) out.push("AI-first");
  if (hasLoyalty && !hasAi) out.push("Retail");
  if (hasAdvisor) out.push("Advisory");
  if (hasAi && hasLoyalty) out.push("Multi-product");
  if ((input.planName ?? "").toLowerCase().includes("business")) out.push("Growth");
  return out.length > 0 ? out : ["Core"];
}

export function deriveOrganizationHealth(input: {
  subscription: SubscriptionDto | null;
  modules: Set<string>;
  hasRecentActivity: boolean;
  hasAdvisorLink: boolean;
}): OperationalHealth {
  if (!input.subscription || input.subscription.status === "past_due") return "At Risk";
  if (!input.hasRecentActivity) return "Attention Needed";
  if (input.modules.has("ai_act") && !input.hasAdvisorLink) return "Attention Needed";
  return "Healthy";
}

export function deriveOnboardingStage(input: {
  onboardingStep?: number;
  onboardingCompletedAt?: string | null;
  health: OperationalHealth;
  modules: Set<string>;
}): OnboardingStage {
  if (input.health === "At Risk") return "Attention Needed";
  if (!input.onboardingCompletedAt || (input.onboardingStep ?? 0) < 3) return "Provisioning";
  if ((input.onboardingStep ?? 0) < 6) return "Active";
  if (input.modules.size >= 2) return "Expanding";
  return "Operational";
}

export function presentHealthTone(health: OperationalHealth): "success" | "warning" | "danger" {
  if (health === "Healthy") return "success";
  if (health === "Attention Needed") return "warning";
  return "danger";
}

export function presentOnboardingTone(stage: OnboardingStage): "info" | "success" | "warning" {
  if (stage === "Operational") return "success";
  if (stage === "Attention Needed") return "warning";
  return "info";
}

export function presentActivitySeverityTone(
  severity: ActivitySeverity,
): "success" | "info" | "warning" | "danger" {
  if (severity === "risk" || severity === "escalation" || severity === "overdue") {
    return "danger";
  }
  return severity;
}

export function presentActivitySeverityLabel(severity: ActivitySeverity): string {
  const labels: Record<ActivitySeverity, string> = {
    success: "Stable",
    info: "Update",
    warning: "Watch",
    risk: "Risk",
    escalation: "Escalation",
    overdue: "Overdue",
  };
  return labels[severity];
}

export function presentActivitySeverityIcon(severity: ActivitySeverity): string {
  const icons: Record<ActivitySeverity, string> = {
    success: "OK",
    info: "INFO",
    warning: "WARN",
    risk: "RISK",
    escalation: "ESC",
    overdue: "LATE",
  };
  return icons[severity];
}

export type AssessmentWorkflowState =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Escalated";
export type ObligationWorkflowState =
  | "Open"
  | "In Progress"
  | "Awaiting Evidence"
  | "Completed"
  | "Overdue";

export function deriveAssessmentWorkflowState(input: {
  assessmentStatus: string | null;
  riskLevel: string | null;
  openObligations: number;
  ageDays: number;
}): AssessmentWorkflowState {
  if (!input.assessmentStatus || input.assessmentStatus === "DRAFT") return "Draft";
  if (input.assessmentStatus === "COMPLETED" && input.riskLevel === "HIGH") return "Escalated";
  if (input.assessmentStatus === "COMPLETED" && input.openObligations > 0) return "Under Review";
  if (input.assessmentStatus === "COMPLETED" && input.ageDays <= 3) return "Submitted";
  return "Approved";
}

export function deriveObligationWorkflowState(input: {
  status: string;
  ageDays: number;
  hasEvidence: boolean;
}): ObligationWorkflowState {
  if (input.status === "COMPLETED" || input.status === "NOT_APPLICABLE") return "Completed";
  if ((input.status === "PENDING" || input.status === "IN_PROGRESS") && input.ageDays > 14) {
    return "Overdue";
  }
  if (!input.hasEvidence) return "Awaiting Evidence";
  if (input.status === "IN_PROGRESS") return "In Progress";
  return "Open";
}

export function deriveUserAccessScope(input: {
  platformAdmin: boolean;
  memberships: Array<{ role: string; tenant: { slug: string; name: string } }>;
}): string {
  if (input.platformAdmin) return "Platform";
  if (input.memberships.length === 0) return "Pending invite";
  if (input.memberships.length === 1) return input.memberships[0].tenant.name;
  return `${input.memberships.length} organizations`;
}

export function deriveUserInvitationStatus(input: {
  platformAdmin: boolean;
  memberships: Array<{ role: string; tenant: { slug: string; name: string } }>;
}): string {
  if (input.platformAdmin) return "Active this week";
  return input.memberships.length === 0 ? "Pending invite" : "Active this week";
}

