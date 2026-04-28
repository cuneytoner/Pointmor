import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";

export function OrganizationDetailPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId ?? "";

  const organization = useMemo(
    () => (bootstrap?.tenants ?? []).find((tenant) => tenant.id === organizationId),
    [bootstrap?.tenants, organizationId],
  );
  const moduleMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of bootstrap?.tenantModules ?? []) {
      if (!row.isActive) continue;
      const existing = map.get(row.tenantId) ?? new Set<string>();
      existing.add(row.module.name);
      map.set(row.tenantId, existing);
    }
    return map;
  }, [bootstrap?.tenantModules]);
  const subscription = useMemo(
    () => (bootstrap?.subscriptions ?? []).find((row) => row.tenant.id === organizationId),
    [bootstrap?.subscriptions, organizationId],
  );
  const primaryContacts = useMemo(() => {
    const users = bootstrap?.users ?? [];
    return users.filter((user) => {
      const primaryOrganization = user.memberships?.[0]?.tenant ?? user.tenant;
      return primaryOrganization?.slug === organization?.slug;
    });
  }, [bootstrap?.users, organization?.slug]);

  if (!bootstrap) {
    return (
      <PageShell eyebrow={t("common.ellipsis")} title={t("organizationDetail.title")} description="">
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  if (!organization) {
    return <Navigate to="/platform/workspaces" replace />;
  }

  const productLabels = toProductLabels(moduleMap.get(organization.id));

  return (
    <PageShell
      eyebrow={t("organizationDetail.eyebrow")}
      title={`${organization.name} (${organization.slug})`}
      description={t("organizationDetail.description")}
    >
      <div className="admin-app__card">
        <p className="admin-app__card-title">{t("organizationDetail.overviewTitle")}</p>
        <div className="chip-row">
          <Badge tone="info">
            {subscription ? `${t("organizationDetail.activePlan")}: ${subscription.plan.name}` : t("organizationDetail.noPlan")}
          </Badge>
          <Badge tone="neutral">
            {t("organizationDetail.status")}: {t("workspaces.statusActive")}
          </Badge>
        </div>
      </div>

      <div className="admin-app__card">
        <p className="admin-app__card-title">{t("organizationDetail.enabledProducts")}</p>
        <div className="chip-row">
          {productLabels.map((label) => (
            <Badge key={`${organization.id}-${label}`} tone="info">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <p className="admin-app__card-title">{t("organizationDetail.primaryContacts")}</p>
        {primaryContacts.length === 0 ? (
          <EmptyState
            title={t("organizationDetail.noContactsTitle")}
            description={t("organizationDetail.noContactsDescription")}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("common.email")}</th>
                  <th>{t("users.columns.role")}</th>
                </tr>
              </thead>
              <tbody>
                {primaryContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td className="data-table__mono">{contact.email}</td>
                    <td className="data-table__muted">{contact.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-app__card">
        <p className="admin-app__card-title">{t("organizationDetail.recentActivity")}</p>
        <p className="admin-app__card-text">{t("organizationDetail.recentActivityPlaceholder")}</p>
      </div>

      <Link to="/platform/workspaces" className="admin-secondary-btn">
        {t("organizationDetail.backToOrganizations")}
      </Link>
    </PageShell>
  );
}

function toProductLabels(modules: Set<string> | undefined): string[] {
  const active = modules ?? new Set<string>();
  const labels: string[] = [];
  if (active.has("ai_act")) labels.push("AI Compliance");
  if (active.has("cafe")) labels.push("Loyalty");
  if (active.has("ai_document_intelligence")) labels.push("Document Intelligence");
  if (active.has("advisor_dashboard")) labels.push("Advisor Portal");
  if (labels.length === 0) labels.push("Core Platform");
  return labels;
}
