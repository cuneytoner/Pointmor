import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  PlatformActivityTimeline,
  type PlatformActivityItem,
} from "../components/PlatformActivityTimeline";
import { useTranslation } from "../hooks/useTranslation";
import { formatCount } from "../lib/formatters";

type ActivityStatus = "success" | "info" | "warning";

type DemoRow = {
  organization: string;
  eventKey: string;
  when: string;
  status: ActivityStatus;
};

/** SaaS operatörü — global metrikler ve operasyon özeti. */
export function PlatformDashboardPage() {
  const { t, locale } = useTranslation();
  const { bootstrap } = useAdminDataContext();

  const tc = bootstrap?.tenants.length ?? 0;
  const activeSubscriptions =
    bootstrap?.subscriptions.filter((s) => s.status === "active").length ?? 0;
  const activeProducts = bootstrap?.platformMetrics.activeProducts ?? 0;
  const moduleMap = new Map<string, Set<string>>();
  for (const row of bootstrap?.tenantModules ?? []) {
    if (!row.isActive) continue;
    const existing = moduleMap.get(row.tenantId) ?? new Set<string>();
    existing.add(row.module.name);
    moduleMap.set(row.tenantId, existing);
  }
  const aiComplianceOrganizations = (bootstrap?.tenants ?? []).filter((tenant) =>
    (moduleMap.get(tenant.id) ?? new Set<string>()).has("ai_act"),
  ).length;
  const loyaltyOrganizations = (bootstrap?.tenants ?? []).filter((tenant) =>
    (moduleMap.get(tenant.id) ?? new Set<string>()).has("cafe"),
  ).length;
  const advisorOrganizations = (bootstrap?.tenants ?? []).filter(
    (tenant) => tenant.type === "ADVISOR",
  ).length;

  const metrics = [
    {
      k: t("dashboard.metrics.organizations"),
      v: formatCount(tc, locale),
      hint: t("dashboard.metrics.organizationsHint"),
    },
    {
      k: t("dashboard.metrics.activeSubscriptions"),
      v: formatCount(activeSubscriptions, locale),
      hint: t("dashboard.metrics.activeSubscriptionsHint"),
    },
    {
      k: t("dashboard.metrics.activeProducts"),
      v: formatCount(activeProducts, locale),
      hint: t("dashboard.metrics.activeProductsHint"),
    },
    {
      k: t("dashboard.metrics.aiComplianceOrganizations"),
      v: formatCount(aiComplianceOrganizations, locale),
      hint: t("dashboard.metrics.aiComplianceOrganizationsHint"),
    },
    {
      k: t("dashboard.metrics.loyaltyOrganizations"),
      v: formatCount(loyaltyOrganizations, locale),
      hint: t("dashboard.metrics.loyaltyOrganizationsHint"),
    },
    {
      k: t("dashboard.metrics.advisorOrganizations"),
      v: formatCount(advisorOrganizations, locale),
      hint: t("dashboard.metrics.advisorOrganizationsHint"),
    },
  ];
  const subscriptionMap = new Map((bootstrap?.subscriptions ?? []).map((s) => [s.tenant.id, s]));

  const demoRows: DemoRow[] = (bootstrap?.tenants ?? [])
    .map((tenant) => {
      const activeModules = moduleMap.get(tenant.id) ?? new Set<string>();
      const hasAiAct = activeModules.has("ai_act");
      const hasLoyalty = activeModules.has("cafe");
      const hasSubscription = Boolean(subscriptionMap.get(tenant.id));

      let eventKey = "dashboard.events.organization_synced";
      let status: ActivityStatus = hasSubscription ? "success" : "warning";

      if (tenant.slug === "acme-ai-solutions" || (hasAiAct && !hasLoyalty)) {
        eventKey = "dashboard.events.ai_assessment_submitted";
        status = "success";
      } else if (tenant.slug === "urban-coffee-group" || (!hasAiAct && hasLoyalty)) {
        eventKey = "dashboard.events.campaign_published";
        status = "success";
      } else if (tenant.slug === "retailcorp-eu" || (hasAiAct && hasLoyalty)) {
        eventKey = "dashboard.events.compliance_review_completed";
        status = "success";
      } else if (tenant.slug === "kanzlei-mueller-advisory") {
        eventKey = "dashboard.events.advisor_invited";
        status = "info";
      } else if (hasSubscription) {
        eventKey = "dashboard.events.subscription_upgraded";
      }

      return {
        organization: tenant.name,
        eventKey,
        when: hasSubscription ? t("dashboard.activity.time.activeSubscription") : t("dashboard.activity.time.noSubscription"),
        status,
      };
    })
    .sort((a, b) => a.organization.localeCompare(b.organization, locale));

  const timelineItems: PlatformActivityItem[] = demoRows.map((row) => ({
    id: row.organization,
    title: t(row.eventKey),
    when: row.when,
    type:
      row.eventKey.includes("campaign")
        ? "loyalty"
        : row.eventKey.includes("advisor")
          ? "advisor"
          : row.eventKey.includes("subscription")
            ? "subscription_lifecycle"
            : "compliance",
    severity: row.status,
    organization: row.organization,
  }));

  return (
    <PageShell
      eyebrow={t("dashboardPlatform.eyebrow")}
      title={t("dashboardPlatform.title")}
      description={t("dashboardPlatform.description")}
    >
      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h2 className="dashboard-hero__title">{t("dashboardPlatform.hero.title")}</h2>
          <p className="dashboard-hero__sub">{t("dashboardPlatform.hero.subtitle")}</p>
        </div>
        <Badge tone="info">{t("dashboard.badgeLive")}</Badge>
      </div>

      <div className="metric-grid metric-grid--4">
        {metrics.map((m) => (
          <div key={m.k} className="metric-card">
            <div className="metric-card__label">{m.k}</div>
            <div className="metric-card__value metric-card__value--num">{m.v}</div>
            <div className="metric-card__hint">{m.hint}</div>
          </div>
        ))}
      </div>

      <PlatformActivityTimeline
        title={t("dashboard.activity.title")}
        items={timelineItems}
        emptyText="No operational activity yet."
      />
    </PageShell>
  );
}
