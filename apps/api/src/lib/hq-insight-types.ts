/** HQ AI insight türleri ve aksiyon eşlemesi (ML yok — kural motoru). */

export const HQ_INSIGHT_TYPE = {
  VISIT_DROP_TENANT: "visit_drop_tenant",
  VISIT_DROP_BRANCH: "visit_drop_branch",
  VISIT_DROP_VS_MA: "visit_drop_vs_moving_avg",
  TOP_BRANCH_GROWTH: "top_branch_growth",
  ANOMALY_HIGH_REDEMPTION_SHIFT: "anomaly_high_redemption_shift",
  ANOMALY_REPEAT_CLAIMS: "anomaly_repeat_claims",
  ANOMALY_DUPLICATE_PENDING: "anomaly_duplicate_pending",
  OPPORTUNITY_QUIET_HOUR: "opportunity_quiet_hour",
  OPPORTUNITY_LOW_RETENTION: "opportunity_low_retention",
} as const;

export type HqInsightTypeKey = (typeof HQ_INSIGHT_TYPE)[keyof typeof HQ_INSIGHT_TYPE];

export const HQ_INSIGHT_ACTION = {
  CREATE_CAMPAIGN: "create_campaign",
  OPEN_MESSAGING: "open_messaging",
  OPEN_ANOMALIES: "open_anomalies",
  OPEN_CAMPAIGNS: "open_campaigns",
  OPEN_GROWTH: "open_growth",
  OPEN_AUDIT: "open_audit",
  NONE: "none",
} as const;

export type HqInsightActionKind = (typeof HQ_INSIGHT_ACTION)[keyof typeof HQ_INSIGHT_ACTION];
