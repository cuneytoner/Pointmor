import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import { PageShell } from "../components/PageShell";
import { FORM_FIELD_GRID_FULL_CLASS, FormField, FormFieldGrid, FormSection, SelectField } from "../components/form";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";
import { postDemoPlanSwitch } from "../lib/entitlements-api";
import type { EntitlementsPayload } from "../lib/entitlements-api";

function formatCap(n: number | null): string {
  if (n === null) return "∞";
  return String(n);
}

function UsageRow({
  label,
  used,
  cap,
  t,
}: {
  label: string;
  used: number;
  cap: number | null;
  t: (k: string, params?: Record<string, string | number>) => string;
}) {
  const pct = cap !== null && cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const over = cap !== null && used > cap;
  return (
    <div className="usage-row">
      <div className="usage-row__head">
        <span className="usage-row__label">{label}</span>
        <span className="usage-row__nums">
          {used} / {formatCap(cap)}{" "}
          {cap !== null && !over ? t("billing.usage.remainingSuffix", { n: Math.max(0, cap - used) }) : null}
        </span>
      </div>
      {cap !== null ? (
        <div className="usage-row__bar" aria-hidden>
          <div
            className={`usage-row__fill${over ? " usage-row__fill--over" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function FeatureList({ ent }: { ent: EntitlementsPayload }) {
  const { t } = useTranslation();
  const labels: Array<{ tag: string; labelKey: string }> = [
    { tag: "customer_pwa", labelKey: "plan.features.customer_pwa" },
    { tag: "campaigns", labelKey: "plan.features.campaigns" },
    { tag: "growth_automation", labelKey: "plan.features.growth_automation" },
    { tag: "product_analytics", labelKey: "plan.features.product_analytics" },
    { tag: "manager_closing", labelKey: "plan.features.manager_closing" },
    { tag: "multi_branch", labelKey: "plan.features.multi_branch" },
    { tag: "webhooks", labelKey: "plan.features.webhooks" },
  ];
  const set = new Set(ent.features);
  return (
    <ul className="plan-feature-list">
      {labels.map(({ tag, labelKey }) => (
        <li key={tag} className={set.has(tag) ? "plan-feature-list__on" : "plan-feature-list__off"}>
          {set.has(tag) ? "✓" : "—"} {t(labelKey)}
        </li>
      ))}
    </ul>
  );
}

export type TenantBillingPageProps = {
  embedded?: boolean;
};

export function TenantBillingPage({ embedded }: TenantBillingPageProps = {}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { auth, bootstrap } = useAdminDataContext();
  const { token, bumpRefresh } = useAuth();
  const tenantId = auth?.tenant?.id ?? null;

  const sub = useMemo(() => {
    if (!bootstrap?.subscriptions || !tenantId) return null;
    return bootstrap.subscriptions.find((s) => s.tenant.id === tenantId) ?? null;
  }, [bootstrap?.subscriptions, tenantId]);

  const ent = bootstrap?.entitlements ?? null;

  const renewsLabel = useMemo(() => {
    const raw = sub?.renewsAt;
    if (!raw) return t("billing.renewsUnknown");
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return t("billing.renewsUnknown");
    return d.toLocaleDateString(toIntlLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [sub?.renewsAt, locale, t]);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pickSlug, setPickSlug] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const planChoices = useMemo(() => bootstrap?.plans ?? [], [bootstrap?.plans]);

  const runDemoUpgrade = async () => {
    const slug = pickSlug.trim();
    if (!token?.trim() || !slug) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await postDemoPlanSwitch(token, slug);
      setMsg(t("plan.upgrade.success"));
      setUpgradeOpen(false);
      bumpRefresh();
    } catch (e) {
      const body = (e as { body?: { error?: string } }).body;
      if (body?.error === "demo_plan_switch_disabled") {
        setErr(t("plan.upgrade.disabledEnv"));
      } else {
        setErr(t("plan.upgrade.error"));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!bootstrap || !tenantId) {
    const loadingInner = <p className="admin-app__card-text">{t("common.loadingBody")}</p>;
    if (embedded) {
      return <PageShell embedded>{loadingInner}</PageShell>;
    }
    return (
      <PageShell eyebrow={t("billing.eyebrow")} title={t("billing.title")} description="">
        {loadingInner}
      </PageShell>
    );
  }

  const body = (
    <>
      {msg ? (
        <p className="admin-app__card-text billing-flash billing-flash--ok" role="status">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="admin-app__card-text billing-flash billing-flash--err" role="alert">
          {err}
        </p>
      ) : null}

      <div className="billing-page-stack">
        <div className="admin-app__card admin-app__card--wide billing-summary">
          <h2 className="admin-app__card-title">{t("billing.sectionSubscription")}</h2>
          {!sub ? (
            <p className="admin-app__card-text">{t("billing.empty")}</p>
          ) : (
            <div className="metric-grid metric-grid--3">
              <div className="metric-card">
                <div className="metric-card__label">{t("billing.plan")}</div>
                <div className="metric-card__value">{sub.plan.name}</div>
                <div className="metric-card__hint">{t("billing.planCode", { code: sub.plan.slug })}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">{t("billing.status")}</div>
                <div className="metric-card__value">{sub.status}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">{t("billing.renews")}</div>
                <div className="metric-card__value">{renewsLabel}</div>
              </div>
            </div>
          )}
        </div>

        {ent ? (
          <>
            <div className="admin-app__card admin-app__card--wide">
              <h2 className="admin-app__card-title">{t("billing.sectionUsage")}</h2>
              <div className="usage-stack">
                <UsageRow
                  label={t("billing.usage.customers")}
                  used={ent.usage.customerCount}
                  cap={ent.limits.maxCustomers}
                  t={t}
                />
                <UsageRow
                  label={t("billing.usage.campaignsActive")}
                  used={ent.usage.activeCampaignCount}
                  cap={ent.limits.maxActiveCampaigns}
                  t={t}
                />
                <UsageRow
                  label={t("billing.usage.visitsMonth")}
                  used={ent.usage.monthlyVisitCount}
                  cap={ent.limits.maxVisitsPerMonth}
                  t={t}
                />
                <UsageRow
                  label={t("billing.usage.staff")}
                  used={ent.usage.staffUserCount}
                  cap={ent.limits.maxStaffUsers}
                  t={t}
                />
              </div>
            </div>

            <div className="admin-app__card admin-app__card--wide">
              <h2 className="admin-app__card-title">{t("billing.sectionFeatures")}</h2>
              <FeatureList ent={ent} />
            </div>

            <div className="admin-app__card admin-app__card--wide">
              <h2 className="admin-app__card-title">{t("billing.sectionPlanActions")}</h2>
              <p className="admin-app__card-text">{t("billing.planActionsLead")}</p>
              <div className="billing-actions">
                <button
                  type="button"
                  className="admin-primary-btn"
                  onClick={() => {
                    setPickSlug(planChoices[0]?.slug ?? "");
                    setUpgradeOpen(true);
                  }}
                >
                  {t("plan.upgrade.cta")}
                </button>
                <Link to="/pricing" className="admin-secondary-btn">
                  {t("usage.upgradeCta")}
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="admin-app__card admin-app__card--wide">
            <p className="admin-app__card-text">{t("billing.entitlementsLoadHint")}</p>
          </div>
        )}
      </div>

      {upgradeOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => !busy && setUpgradeOpen(false)}>
          <div
            className="modal-card modal-card--form"
            role="dialog"
            aria-labelledby="upgrade-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-card__head">
              <h2 id="upgrade-title" className="billing-h2">
                {t("plan.upgrade.modalTitle")}
              </h2>
              <p className="admin-app__card-text">{t("plan.upgrade.modalHint")}</p>
            </div>
            <div className="modal-card__body">
              <FormSection title={t("plan.upgrade.sectionPlan")}>
                <FormFieldGrid>
                  <FormField
                    id="billing-upgrade-plan"
                    className={FORM_FIELD_GRID_FULL_CLASS}
                    label={t("plan.upgrade.pickPlan")}
                  >
                    <SelectField
                      id="billing-upgrade-plan"
                      value={pickSlug}
                      onChange={(e) => setPickSlug(e.target.value)}
                      disabled={busy}
                    >
                      {planChoices.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name} ({p.slug})
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </FormFieldGrid>
              </FormSection>
            </div>
            <div className="modal-card__footer billing-modal-actions">
              <button type="button" className="admin-secondary-btn" onClick={() => setUpgradeOpen(false)} disabled={busy}>
                {t("common.cancel")}
              </button>
              <button type="button" className="admin-primary-btn" onClick={() => void runDemoUpgrade()} disabled={busy}>
                {busy ? t("common.loadingBody") : t("plan.upgrade.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <PageShell embedded>{body}</PageShell>;
  }

  return (
    <PageShell
      eyebrow={t("billing.eyebrow")}
      title={t("billing.title")}
      description={t("billing.pageIntro")}
    >
      {body}
    </PageShell>
  );
}
