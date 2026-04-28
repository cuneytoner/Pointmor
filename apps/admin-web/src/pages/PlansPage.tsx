import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import { formatCurrencyFromMinor } from "../lib/currency-format";
import { toIntlLocale } from "../lib/locale-intl";

export function PlansPage() {
  const { t, locale } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const plans = bootstrap?.plans ?? [];
  const intlLocale = toIntlLocale(locale);

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("plans.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("plans.eyebrow")}
      title={t("plans.title")}
      description={t("plans.description")}
    >
      <div className="plan-grid">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`plan-card${p.slug === "growth" ? " plan-card--highlight" : ""}`}
          >
            {p.slug === "growth" ? (
              <Badge tone="info">{t("plans.featured")}</Badge>
            ) : (
              <span className="plan-card__spacer" />
            )}
            <div className="plan-card__title-row">
              <h3 className="plan-card__name">
                {p.name}
              </h3>
              {p.planType === "free" || p.planType === "pro" || p.planType === "team" ? (
                <Badge tone="neutral">{t(`plans.planType.${p.planType}`)}</Badge>
              ) : null}
            </div>
            <p className="plan-card__price">
              <strong>
                {formatCurrencyFromMinor(p.priceCents, "EUR", intlLocale)}
              </strong>
              <span className="plan-card__cadence">
                {p.interval === "week_trial"
                  ? t("plans.cadence.weekQuota")
                  : t("plans.cadence.month")}
              </span>
            </p>
            {p.description ? (
              <p className="plans-intro plans-intro--in-card">
                {p.description}
              </p>
            ) : null}
            <ul className="plan-card__features">
              {p.featureTags.map((f) => (
                <li key={f}>{humanizeFeatureTag(f)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function humanizeFeatureTag(featureTag: string): string {
  const labels: Record<string, string> = {
    ai_act: "AI Compliance",
    ai_document_intelligence: "AI Document Intelligence",
    advisor_dashboard: "Advisor Workspace",
    customer_pwa: "Customer Mobile App",
    loyalty: "Loyalty",
    expense_capture: "Expense Capture",
    e_invoice: "E-Invoicing",
    campaigns: "Campaign Automation",
    growth_automation: "Growth Automation",
    manager_closing: "Manager Closing",
    multi_branch: "Multi-Branch Operations",
    webhooks: "Webhooks",
    product_analytics: "Product Analytics",
    hq_dashboard: "HQ Dashboard",
    hq_ai_insights: "HQ AI Insights",
    hq_automation: "HQ Automation",
  };
  return labels[featureTag] ?? featureTag.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
