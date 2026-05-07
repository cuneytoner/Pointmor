import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import { formatCount, formatDateTimeLabel, formatPoints } from "../lib/formatters";
import {
  fetchHqDashboard,
  type HqDashboardPayload,
} from "../lib/hq-dashboard-api";
import {
  dismissHqAiInsight,
  executeHqAiInsight,
  fetchHqAiInsights,
  type HqAiInsightRow,
} from "../lib/hq-insights-api";
import {
  approveAutomationAction,
  fetchAutomationSummary,
  rejectAutomationAction,
  type AutomationSummaryPayload,
} from "../lib/tenant-automation-api";

function fmtPct(n: number | null, locale: string): string {
  if (n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n)}%`;
}

function TrendBars(props: {
  label: string;
  values: number[];
  dates: string[];
  color: string;
}) {
  const { label, values, dates, color } = props;
  const max = Math.max(1, ...values);
  return (
    <div className="hq-trend-block">
      <p className="hq-trend-block__label">{label}</p>
      <div className="hq-trend-bars" role="img" aria-label={label}>
        {values.map((v, i) => (
          <div key={dates[i]} className="hq-trend-bars__col" title={`${dates[i]}: ${v}`}>
            <div
              className="hq-trend-bars__fill"
              style={{
                height: `${Math.round((v / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ctaLabelForActionKind(
  t: (k: string) => string,
  actionKind: string,
): string {
  switch (actionKind) {
    case "create_campaign":
      return t("hq.aiInsights.ctaCreateCampaign");
    case "open_messaging":
      return t("hq.aiInsights.ctaMessaging");
    case "open_audit":
      return t("hq.aiInsights.ctaAudit");
    case "open_campaigns":
      return t("hq.aiInsights.ctaCampaigns");
    case "open_growth":
      return t("hq.aiInsights.ctaGrowth");
    case "open_anomalies":
      return t("hq.aiInsights.ctaAnomalies");
    case "none":
      return "";
    default:
      return t("hq.aiInsights.cta");
  }
}

export function TenantHqDashboardPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const ent = bootstrap?.entitlements;
  const [data, setData] = useState<HqDashboardPayload | null>(null);
  const [error, setError] = useState(false);
  const [days] = useState(28);
  const [aiInsights, setAiInsights] = useState<HqAiInsightRow[] | null>(null);
  const [aiError, setAiError] = useState(false);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [autoSummary, setAutoSummary] = useState<AutomationSummaryPayload | null>(null);
  const [autoError, setAutoError] = useState(false);
  const [autoBusyId, setAutoBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (ent && !ent.features.includes("hq_dashboard")) return;
    let c = false;
    setError(false);
    fetchHqDashboard(token, days)
      .then((d) => {
        if (!c) setData(d);
      })
      .catch(() => {
        if (!c) {
          setError(true);
          setData(null);
        }
      });
    return () => {
      c = true;
    };
  }, [token, days, ent]);

  useEffect(() => {
    if (!ent?.features.includes("hq_ai_insights")) return;
    let c = false;
    setAiError(false);
    fetchHqAiInsights(token)
      .then((rows) => {
        if (!c) setAiInsights(rows);
      })
      .catch(() => {
        if (!c) {
          setAiError(true);
          setAiInsights(null);
        }
      });
    return () => {
      c = true;
    };
  }, [token, ent]);

  useEffect(() => {
    if (!ent?.features.includes("hq_automation")) return;
    let c = false;
    setAutoError(false);
    fetchAutomationSummary(token)
      .then((s) => {
        if (!c) setAutoSummary(s);
      })
      .catch(() => {
        if (!c) {
          setAutoError(true);
          setAutoSummary(null);
        }
      });
    return () => {
      c = true;
    };
  }, [token, ent]);

  const onApproveAuto = useCallback(
    async (id: string) => {
      setAutoBusyId(id);
      try {
        await approveAutomationAction(token, id);
        const s = await fetchAutomationSummary(token);
        setAutoSummary(s);
      } finally {
        setAutoBusyId(null);
      }
    },
    [token],
  );

  const onRejectAuto = useCallback(
    async (id: string) => {
      setAutoBusyId(id);
      try {
        await rejectAutomationAction(token, id);
        const s = await fetchAutomationSummary(token);
        setAutoSummary(s);
      } finally {
        setAutoBusyId(null);
      }
    },
    [token],
  );

  const onDismissAi = useCallback(
    async (id: string) => {
      setAiBusyId(id);
      try {
        await dismissHqAiInsight(token, id);
        setAiInsights((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
      } finally {
        setAiBusyId(null);
      }
    },
    [token],
  );

  const onExecuteAi = useCallback(
    async (id: string) => {
      setAiBusyId(id);
      try {
        const out = await executeHqAiInsight(token, id);
        if (out.result === "navigate") {
          navigate(out.path);
        } else if (out.result === "campaign_created") {
          navigate("/app/campaigns");
        }
      } finally {
        setAiBusyId(null);
      }
    },
    [token, navigate],
  );

  const trendMeta = useMemo(() => {
    const tdays = data?.trends?.days;
    if (!tdays?.length) return null;
    return {
      dates: tdays.map((x) => x.date),
      visits: tdays.map((x) => x.visits),
      points: tdays.map((x) => x.points),
      reds: tdays.map((x) => x.redemptions),
    };
  }, [data?.trends]);

  if (!ent) {
    return (
      <PageShell eyebrow={t("hq.eyebrow")} title={t("hq.title")} description="">
        <p className="admin-app__card-text">{t("plan.gate.loadingEntitlements")}</p>
      </PageShell>
    );
  }

  if (!ent.features.includes("hq_dashboard")) {
    return (
      <PageShell eyebrow={t("hq.eyebrow")} title={t("plan.gate.hqTitle")} description={t("plan.gate.hqLead")}>
        <div className="feature-plan-gate">
          <p className="admin-app__card-text">{t("plan.gate.hqBody")}</p>
          <Link to="/app/admin/billing" className="admin-primary-btn">
            {t("plan.gate.ctaBilling")}
          </Link>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell eyebrow={t("hq.eyebrow")} title={t("hq.title")} description={t("hq.description")}>
        <p className="admin-app__card-text">{t("hq.loadError")}</p>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell eyebrow={t("hq.eyebrow")} title={t("hq.title")} description={t("hq.description")}>
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      </PageShell>
    );
  }

  const full = data.tier === "full";

  return (
    <PageShell eyebrow={t("hq.eyebrow")} title={t("hq.title")} description={t("hq.description")}>
      {!full ? (
        <p className="admin-app__card-text loyalty-form-hint" style={{ marginBottom: "1rem" }}>
          {t("hq.basicNote")}
        </p>
      ) : null}

      <div className="hq-summary-grid">
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.visits")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.globalSummary.totalVisits, locale)}
          </div>
          <div className="hq-card__delta">{fmtPct(data.globalSummary.deltaVisitsVsPrevPeriod, locale)}</div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.points")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatPoints(data.globalSummary.totalPointsIssued, locale)}
          </div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.redemptions")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.globalSummary.totalRedemptions, locale)}
          </div>
          <div className="hq-card__delta">{fmtPct(data.globalSummary.deltaRedemptionsVsPrevPeriod, locale)}</div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.campaigns")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.globalSummary.activeCampaigns, locale)}
          </div>
        </div>
      </div>

      {ent.features.includes("hq_ai_insights") ? (
        <div className="admin-app__card admin-app__card--wide hq-section hq-ai-section">
          <h2 className="admin-app__card-title">{t("hq.aiInsights.title")}</h2>
          <p className="admin-app__card-text loyalty-form-hint">{t("hq.aiInsights.subtitle")}</p>
          {aiError ? (
            <p className="admin-app__card-text">{t("hq.aiInsights.loadError")}</p>
          ) : aiInsights === null ? (
            <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
          ) : aiInsights.length === 0 ? (
            <p className="admin-app__card-text">{t("hq.aiInsights.empty")}</p>
          ) : (
            <div className="hq-ai-grid">
              {aiInsights.map((row) => {
                const sev =
                  row.severity === "critical" || row.severity === "warn" || row.severity === "info"
                    ? row.severity
                    : "info";
                const cta = ctaLabelForActionKind(t, row.actionKind);
                return (
                  <div
                    key={row.id}
                    className={`admin-app__card hq-ai-card hq-ai-card--${sev}`}
                  >
                    <div className="hq-ai-card__head">
                      <span
                        className={`hq-pill hq-pill--${sev === "critical" ? "high" : sev === "warn" ? "medium" : "low"}`}
                      >
                        {row.type}
                      </span>
                    </div>
                    <p className="hq-ai-card__message">{row.message}</p>
                    <p className="hq-ai-card__hint">{row.suggestedAction}</p>
                    <div className="hq-ai-card__actions">
                      {row.actionKind !== "none" && cta ? (
                        <button
                          type="button"
                          className="admin-primary-btn"
                          disabled={aiBusyId === row.id}
                          onClick={() => void onExecuteAi(row.id)}
                        >
                          {cta}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        disabled={aiBusyId === row.id}
                        onClick={() => void onDismissAi(row.id)}
                      >
                        {t("hq.aiInsights.dismiss")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {ent.features.includes("hq_automation") ? (
        <div className="admin-app__card admin-app__card--wide hq-section hq-automation-section">
          <h2 className="admin-app__card-title">{t("hq.automation.title")}</h2>
          <p className="admin-app__card-text loyalty-form-hint">{t("hq.automation.subtitle")}</p>
          {autoError ? (
            <p className="admin-app__card-text">{t("hq.automation.loadError")}</p>
          ) : autoSummary === null ? (
            <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
          ) : (
            <>
              <p className="admin-app__card-text" style={{ marginBottom: "0.75rem" }}>
                <strong>{t("hq.automation.mode")}:</strong> {autoSummary.settings.mode} ·{" "}
                <strong>{t("hq.automation.maxDay")}:</strong>{" "}
                {formatCount(autoSummary.settings.maxActionsPerDay, locale)} ·{" "}
                <strong>{t("hq.automation.cooldown")}:</strong>{" "}
                {formatCount(autoSummary.settings.cooldownMinutes, locale)}
              </p>
              <h3 className="admin-app__card-title" style={{ fontSize: "1rem" }}>
                {t("hq.automation.pendingTitle")}
              </h3>
              {autoSummary.pending.length === 0 ? (
                <p className="admin-app__card-text">{t("hq.automation.emptyPending")}</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("hq.automation.colRule")}</th>
                        <th>{t("hq.automation.colAction")}</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {autoSummary.pending.map((row) => (
                        <tr key={row.id}>
                          <td>{row.ruleKey}</td>
                          <td>{row.actionType}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className="admin-primary-btn"
                              style={{ marginRight: "0.35rem", padding: "0.35rem 0.65rem", fontSize: "0.8125rem" }}
                              disabled={autoBusyId === row.id}
                              onClick={() => void onApproveAuto(row.id)}
                            >
                              {t("hq.automation.approve")}
                            </button>
                            <button
                              type="button"
                              className="admin-secondary-btn"
                              style={{ padding: "0.35rem 0.65rem", fontSize: "0.8125rem" }}
                              disabled={autoBusyId === row.id}
                              onClick={() => void onRejectAuto(row.id)}
                            >
                              {t("hq.automation.reject")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <h3
                className="admin-app__card-title"
                style={{ fontSize: "1rem", marginTop: "1.25rem" }}
              >
                {t("hq.automation.recentTitle")}
              </h3>
              {autoSummary.recent.length === 0 ? (
                <p className="admin-app__card-text">{t("hq.automation.emptyRecent")}</p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t("hq.automation.colRule")}</th>
                        <th>{t("hq.automation.colStatus")}</th>
                        <th>{t("hq.automation.colAction")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoSummary.recent.map((row) => (
                        <tr key={row.id}>
                          <td>{row.ruleKey}</td>
                          <td>{row.status}</td>
                          <td>{row.actionType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      <div className="admin-app__card admin-app__card--wide hq-section">
        <h2 className="admin-app__card-title">{t("hq.leaderboard.title")}</h2>
        <p className="admin-app__card-text loyalty-form-hint">{t("hq.leaderboard.hint")}</p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("hq.leaderboard.colBranch")}</th>
                <th className="data-table__num">{t("hq.leaderboard.colVisits")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.rows.map((row) => (
                <tr key={row.branchId ?? "x"}>
                  <td className="data-table__num">{formatCount(row.rank, locale)}</td>
                  <td>
                    {row.branchId ? (
                      <Link to={`/app/hq/locations/${encodeURIComponent(row.branchId)}`}>{row.name}</Link>
                    ) : (
                      row.name
                    )}
                    {data.leaderboard.bestBranchId === row.branchId ? (
                      <span className="hq-badge hq-badge--best">{t("hq.badge.best")}</span>
                    ) : null}
                    {data.leaderboard.worstBranchId === row.branchId ? (
                      <span className="hq-badge hq-badge--watch">{t("hq.badge.watch")}</span>
                    ) : null}
                  </td>
                  <td className="data-table__num">{formatCount(row.visits, locale)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {full && trendMeta ? (
        <div className="admin-app__card admin-app__card--wide hq-section">
          <h2 className="admin-app__card-title">{t("hq.trends.title")}</h2>
          <div className="hq-trend-grid">
            <TrendBars
              label={t("hq.trends.visits")}
              dates={trendMeta.dates}
              values={trendMeta.visits}
              color="#2563eb"
            />
            <TrendBars
              label={t("hq.trends.points")}
              dates={trendMeta.dates}
              values={trendMeta.points}
              color="#059669"
            />
            <TrendBars
              label={t("hq.trends.redemptions")}
              dates={trendMeta.dates}
              values={trendMeta.reds}
              color="#d97706"
            />
          </div>
        </div>
      ) : null}

      {data.insights.length > 0 ? (
        <div className="admin-app__card admin-app__card--wide hq-section">
          <h2 className="admin-app__card-title">{t("hq.insights.title")}</h2>
          <ul className="hq-insight-list">
            {data.insights.map((i) => (
              <li key={i.id} className={`hq-insight hq-insight--${i.severity}`}>
                <span className="hq-insight__dot" aria-hidden />
                <span>
                  {t(`hq.insight.${i.code}`, { name: i.detail ?? "" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.anomalies.length > 0 ? (
        <div className="admin-app__card admin-app__card--wide hq-section">
          <h2 className="admin-app__card-title">{t("hq.anomalies.title")}</h2>
          <ul className="hq-anomaly-list">
            {data.anomalies.map((a) => (
              <li key={a.id} className="hq-anomaly">
                <span className={`hq-pill hq-pill--${a.severity}`}>{a.severity}</span>
                <code className="hq-anomaly__type">{a.type}</code>
                <span className="data-table__muted">{formatDateTimeLabel(a.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="admin-app__card admin-app__card--wide hq-section">
        <h2 className="admin-app__card-title">{t("hq.campaigns.title")}</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("hq.campaigns.colName")}</th>
                <th>{t("hq.campaigns.colScope")}</th>
                <th className="data-table__num">{t("hq.campaigns.colBonus")}</th>
                <th className="data-table__num">{t("hq.campaigns.colApps")}</th>
              </tr>
            </thead>
            <tbody>
              {data.campaignPerformance.map((c) => (
                <tr key={c.campaignId}>
                  <td>{c.name}</td>
                  <td>{c.branchScope ? t("hq.campaigns.branchOnly") : t("hq.campaigns.allBranches")}</td>
                  <td className="data-table__num">{formatPoints(c.bonusPoints, locale)}</td>
                  <td className="data-table__num">{formatCount(c.applications, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {full && data.campaignByLocation && data.campaignByLocation.length > 0 ? (
        <div className="admin-app__card admin-app__card--wide hq-section">
          <h2 className="admin-app__card-title">{t("hq.campaigns.byLocation")}</h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("hq.campaigns.colName")}</th>
                  <th>{t("hq.campaigns.colLocation")}</th>
                  <th className="data-table__num">{t("hq.campaigns.colApps")}</th>
                </tr>
              </thead>
              <tbody>
                {data.campaignByLocation.map((r, idx) => (
                  <tr key={`${r.campaignId}-${r.branchId ?? "n"}-${idx}`}>
                    <td>{r.name}</td>
                    <td>{r.branchName}</td>
                    <td className="data-table__num">{formatCount(r.applications, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
