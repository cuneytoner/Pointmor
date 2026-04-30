import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { formatDateLabel } from "../lib/formatters";
import { patchSubscription } from "../lib/platform-api";
import type { PlanDto, SubscriptionDto } from "../hooks/useAdminData";
import { presentSubscriptionHealth } from "../lib/platformPresentation";

export function SubscriptionsPage() {
  const { t, locale } = useTranslation();
  const { token, bumpRefresh } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const rows = bootstrap?.subscriptions ?? [];
  const plans = bootstrap?.plans ?? [];

  const [draftBySub, setDraftBySub] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashErr, setFlashErr] = useState<string | null>(null);

  useEffect(() => {
    setDraftBySub((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (next[r.id] === undefined) next[r.id] = r.plan.id;
      }
      return next;
    });
  }, [rows]);

  const statusTone = (s: string) => {
    if (s === "active") return "success";
    if (s === "trialing") return "info";
    if (s === "past_due") return "warning";
    return "neutral";
  };

  const statusLabel = (s: string) => {
    const k = `subscriptions.status.${s}`;
    const v = t(k);
    return v === k ? s : v;
  };

  const applyPlan = async (row: SubscriptionDto) => {
    const tok = token?.trim();
    if (!tok) return;
    const nextPlanId = draftBySub[row.id] ?? row.plan.id;
    if (nextPlanId === row.plan.id) return;
    setBusyId(row.id);
    setFlashOk(null);
    setFlashErr(null);
    try {
      await patchSubscription(tok, row.id, { planId: nextPlanId });
      setFlashOk(t("subscriptions.applySuccess"));
      bumpRefresh();
    } catch {
      setFlashErr(t("subscriptions.applyError"));
    } finally {
      setBusyId(null);
    }
  };

  const planLabel = (p: PlanDto) => p.name;

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("subscriptions.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("subscriptions.eyebrow")}
      title={t("subscriptions.title")}
      description={t("subscriptions.description")}
    >
      {flashOk ? (
        <p className="admin-app__card-text subscriptions-flash subscriptions-flash--ok" role="status">
          {flashOk}
        </p>
      ) : null}
      {flashErr ? (
        <p className="admin-app__card-text subscriptions-flash subscriptions-flash--err" role="alert">
          {flashErr}
        </p>
      ) : null}
      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          <table className="data-table subscriptions-table">
            <thead>
              <tr>
                <th>{t("common.id")}</th>
                <th>{t("subscriptions.columns.workspace")}</th>
                <th>{t("subscriptions.columns.plan")}</th>
                <th>{t("subscriptions.columns.status")}</th>
                <th>{t("subscriptions.columns.renews")}</th>
                <th>{t("subscriptions.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const selected = draftBySub[r.id] ?? r.plan.id;
                const dirty = selected !== r.plan.id;
                const busy = busyId === r.id;
                const health = presentSubscriptionHealth(r);
                return (
                  <tr key={r.id}>
                    <td className="data-table__mono" data-label={t("common.id")}>{r.id}</td>
                    <td data-label={t("subscriptions.columns.workspace")}>{r.tenant.name}</td>
                    <td data-label={t("subscriptions.columns.plan")}>
                      <div className="chip-row">
                        <span>{r.plan.name}</span>
                        <Badge tone={r.plan.planType === "free" ? "neutral" : "info"}>
                          {r.plan.planType === "free"
                            ? "Starter"
                            : r.plan.planType === "team"
                              ? "Team"
                              : "Business"}
                        </Badge>
                      </div>
                    </td>
                    <td data-label={t("subscriptions.columns.status")}>
                      <div className="chip-row">
                        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                        <Badge tone={health.tone}>{health.label}</Badge>
                      </div>
                    </td>
                    <td className="data-table__muted" data-label={t("subscriptions.columns.renews")}>
                      {r.renewsAt ? formatDateLabel(r.renewsAt, locale) : "—"}
                    </td>
                    <td data-label={t("subscriptions.columns.actions")}>
                      <div className="subscriptions-plan-cell">
                        <label className="subscriptions-plan-label">
                          <span className="sr-only">{t("subscriptions.changePlan")}</span>
                          <select
                            className="subscriptions-plan-select"
                            value={selected}
                            disabled={busy || plans.length === 0}
                            onChange={(e) =>
                              setDraftBySub((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {planLabel(p)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="admin-primary-btn subscriptions-apply-btn"
                          disabled={!dirty || busy}
                          onClick={() => void applyPlan(r)}
                        >
                          {busy ? t("subscriptions.applying") : t("subscriptions.applyPlan")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
