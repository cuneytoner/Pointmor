/**
 * Insight → otomasyon adayı (hardcoded kurallar; ileride DB config).
 */

export type AutomationCandidate = {
  triggerType: "visit_drop" | "low_activity" | "retention_gap" | "anomaly";
  ruleKey: string;
  actionType: "create_campaign" | "messaging_send" | "config_update";
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export function mapHqInsightToAutomationCandidate(insight: {
  id: string;
  type: string;
  branchId: string | null;
  message: string;
}): AutomationCandidate | null {
  const baseKey = `syncInsight:${insight.id}`;
  const t = insight.type;

  if (t === "visit_drop_tenant" || t === "visit_drop_vs_moving_avg") {
    return {
      triggerType: "visit_drop",
      ruleKey: "recover_traffic_bonus_campaign",
      actionType: "create_campaign",
      idempotencyKey: baseKey,
      payload: { insightType: t, message: insight.message },
    };
  }
  if (t === "visit_drop_branch") {
    return {
      triggerType: "visit_drop",
      ruleKey: "branch_recover_campaign",
      actionType: "create_campaign",
      idempotencyKey: baseKey,
      payload: { insightType: t, branchId: insight.branchId, message: insight.message },
    };
  }
  if (t === "opportunity_quiet_hour") {
    return {
      triggerType: "low_activity",
      ruleKey: "off_peak_messaging",
      actionType: "messaging_send",
      idempotencyKey: baseKey,
      payload: { insightType: t },
    };
  }
  if (t === "opportunity_low_retention") {
    return {
      triggerType: "retention_gap",
      ruleKey: "winback_messaging",
      actionType: "messaging_send",
      idempotencyKey: baseKey,
      payload: { insightType: t },
    };
  }
  if (t.startsWith("anomaly_")) {
    return {
      triggerType: "anomaly",
      ruleKey: "review_compliance_signals",
      actionType: "config_update",
      idempotencyKey: baseKey,
      payload: { insightType: t },
    };
  }
  return null;
}
