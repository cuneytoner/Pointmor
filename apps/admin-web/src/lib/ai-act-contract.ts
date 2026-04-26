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

export type AiActPurposeValue = (typeof AI_ACT_PURPOSE_VALUES)[number];

export const AI_ACT_QUESTION_TYPE: Record<AiActQuestionKey, "boolean" | "enum"> = {
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
