import type { ModuleOperationsDto } from "../hooks/useAdminData";
import {
  deriveAssessmentWorkflowState,
  deriveObligationWorkflowState,
  type OperationalHealth,
} from "./platformPresentation";

export type AiComplianceSystemDto = ModuleOperationsDto["aiCompliance"]["systems"][number];

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

