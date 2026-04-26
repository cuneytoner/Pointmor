import type {
  AiClassificationSource,
  AiRiskLevel,
  AiSystem,
  Prisma,
} from "../generated/prisma/client.js";

export const AI_ACT_QUESTION_KEYS = [
  "q_ai_used",
  "q_ai_purpose",
  "q_personal_data",
  "q_sensitive_data",
  "q_automated_decision",
  "q_human_oversight",
  "q_employment_context",
  "q_biometric_identification",
  "q_safety_critical",
  "q_provider_documentation",
] as const;

export type AiActQuestionKey = (typeof AI_ACT_QUESTION_KEYS)[number];

export const AI_ACT_PURPOSE_VALUES = [
  "customer_support",
  "employee_performance",
  "other",
] as const;

export type AiActAnswerMap = Record<AiActQuestionKey, Prisma.InputJsonValue>;

const QUESTION_TYPE_BY_KEY: Record<AiActQuestionKey, "boolean" | "enum"> = {
  q_ai_used: "boolean",
  q_ai_purpose: "enum",
  q_personal_data: "boolean",
  q_sensitive_data: "boolean",
  q_automated_decision: "boolean",
  q_human_oversight: "boolean",
  q_employment_context: "boolean",
  q_biometric_identification: "boolean",
  q_safety_critical: "boolean",
  q_provider_documentation: "boolean",
};

export function normalizeQuestionnaire(raw: Record<string, unknown>): {
  ok: true;
  answers: AiActAnswerMap;
} | { ok: false; error: string } {
  const keys = Object.keys(raw);
  if (keys.length !== AI_ACT_QUESTION_KEYS.length) {
    return { ok: false, error: "invalid_answer_format" };
  }
  for (const key of keys) {
    if (!AI_ACT_QUESTION_KEYS.includes(key as AiActQuestionKey)) {
      return { ok: false, error: "invalid_answer_format" };
    }
  }
  const answers = {} as AiActAnswerMap;
  for (const key of AI_ACT_QUESTION_KEYS) {
    const val = raw[key];
    if (val === undefined || val === null) {
      return { ok: false, error: "invalid_answer_format" };
    }
    const expectedType = QUESTION_TYPE_BY_KEY[key];
    if (expectedType === "boolean" && typeof val !== "boolean") {
      return { ok: false, error: "invalid_answer_format" };
    }
    if (
      expectedType === "enum" &&
      (typeof val !== "string" ||
        !AI_ACT_PURPOSE_VALUES.includes(val as (typeof AI_ACT_PURPOSE_VALUES)[number]))
    ) {
      return { ok: false, error: "invalid_answer_format" };
    }
    answers[key] = val as Prisma.InputJsonValue;
  }
  return { ok: true, answers };
}

function isYes(value: Prisma.InputJsonValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "yes" || v === "true" || v === "1";
  }
  return false;
}

export function classifyRisk(answers: AiActAnswerMap): {
  riskLevel: AiRiskLevel;
  classificationSource: AiClassificationSource;
  confidence: number;
  rationale: string;
} {
  if (!isYes(answers.q_ai_used)) {
    return {
      riskLevel: "MINIMAL",
      classificationSource: "HYBRID",
      confidence: 0.9,
      rationale: "AI not used in target workflow.",
    };
  }
  const biometric = isYes(answers.q_biometric_identification);
  const employment = isYes(answers.q_employment_context);
  const automatedDecision = isYes(answers.q_automated_decision);
  const safetyCritical = isYes(answers.q_safety_critical);
  const sensitiveData = isYes(answers.q_sensitive_data);

  if (biometric) {
    return {
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.86,
      rationale: "Biometric identification trigger.",
    };
  }
  if (employment && automatedDecision) {
    return {
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.82,
      rationale: "Employment context with automated decision trigger.",
    };
  }
  if (safetyCritical) {
    return {
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.83,
      rationale: "Safety critical trigger.",
    };
  }
  if (sensitiveData && automatedDecision) {
    return {
      riskLevel: "HIGH",
      classificationSource: "HYBRID",
      confidence: 0.78,
      rationale: "Sensitive data and automated decision trigger.",
    };
  }
  return {
    riskLevel: "LIMITED",
    classificationSource: "HYBRID",
    confidence: 0.74,
    rationale: "Default limited-risk suggestion for AI-enabled flow.",
  };
}

export function obligationsForRisk(
  riskLevel: AiRiskLevel,
  answers: AiActAnswerMap,
): Array<{ obligationType: string; title: string; priority: "LOW" | "MEDIUM" | "HIGH" }> {
  if (riskLevel === "LIMITED") {
    return [
      {
        obligationType: "transparency_notice",
        title: "Add transparency notice",
        priority: "MEDIUM",
      },
      {
        obligationType: "user_information",
        title: "Publish user information summary",
        priority: "MEDIUM",
      },
    ];
  }
  if (riskLevel === "HIGH") {
    const list = [
      {
        obligationType: "risk_management",
        title: "Define risk management process",
        priority: "HIGH" as const,
      },
      {
        obligationType: "human_oversight",
        title: "Define human oversight process",
        priority: "HIGH" as const,
      },
      {
        obligationType: "logging",
        title: "Enable decision logging controls",
        priority: "MEDIUM" as const,
      },
      {
        obligationType: "data_governance",
        title: "Review data governance controls",
        priority: "HIGH" as const,
      },
    ];
    if (!isYes(answers.q_provider_documentation)) {
      list.push({
        obligationType: "provider_documentation",
        title: "Collect provider documentation",
        priority: "MEDIUM",
      });
    }
    return list;
  }
  return [];
}

export function systemScopedWhere(tenantId: string, id: string): Prisma.AiSystemWhereInput {
  return { id, tenantId };
}

export function makeAssessmentVersion(system: AiSystem, previousVersion: number | null): number {
  void system;
  return (previousVersion ?? 0) + 1;
}
