import { useMemo, useState } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import {
  deriveUserAccessScope,
  deriveUserInvitationStatus,
  presentModuleLabel,
  presentRoleLabel,
} from "../lib/platformPresentation";

export function UsersPage() {
  const { t } = useTranslation();
  const { bootstrap } = useAdminDataContext();
  const [role, setRole] = useState<string>("all");

  const rows = useMemo(() => {
    const source = bootstrap?.users ?? [];
    if (role === "all") return source;
    return source.filter((u) => u.role === role);
  }, [bootstrap?.users, role]);
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

  const roleLabel = (u: (typeof rows)[number]) =>
    presentRoleLabel({
      platformAdmin: u.platformAdmin,
      appRole: u.role,
      hasAdvisorMembership: Boolean(u.memberships?.some((m) => m.role === "ADVISOR")),
    });

  const roleTone = (
    r: string,
  ): "danger" | "info" | "neutral" =>
    r === "platform_admin" ? "danger" : r === "tenant_operator" ? "info" : "neutral";

  const roles = ["platform_admin", "tenant_operator", "viewer"];

  if (!bootstrap) {
    return (
      <PageShell
        eyebrow={t("common.ellipsis")}
        title={t("users.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("users.eyebrow")}
      title={t("users.title")}
      description={t("users.description")}
    >
      <div
        className="chip-row"
        role="group"
        aria-label={t("users.filterAria")}
      >
        <button
          type="button"
          className={`chip${role === "all" ? " chip--on" : ""}`}
          onClick={() => setRole("all")}
        >
          {t("users.filterAll")}
        </button>
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            className={`chip${role === r ? " chip--on" : ""}`}
            onClick={() => setRole(r)}
          >
            {r === "platform_admin"
              ? "Platform Admin"
              : r === "tenant_operator"
                ? "Organization Admin"
                : "Viewer"}
          </button>
        ))}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <EmptyState
              title={t("users.emptyTitle")}
              description={t("users.emptyDescription")}
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Organization / access</th>
                  <th>Linked products</th>
                  <th>Activity state</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const primaryMembership =
                    u.memberships?.find((membership) => membership.role !== "ADVISOR") ??
                    u.memberships?.[0];
                  const primaryOrganization = primaryMembership?.tenant ?? u.tenant;
                  const linkedModules = primaryOrganization
                    ? moduleMap.get(
                        (bootstrap?.tenants ?? []).find((t) => t.slug === primaryOrganization.slug)?.id ??
                          "",
                      ) ?? new Set<string>()
                    : new Set<string>();
                  const products = Array.from(linkedModules).map((moduleName) =>
                    presentModuleLabel(moduleName),
                  );
                  return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <div className="data-table__mono data-table__muted">{u.email}</div>
                    </td>
                    <td>
                      <Badge tone={roleTone(u.role)}>{roleLabel(u)}</Badge>
                    </td>
                    <td className="data-table__muted">
                      <strong>
                        {u.platformAdmin
                          ? "Platform"
                          : primaryOrganization
                            ? `${primaryOrganization.name} (${primaryOrganization.slug})`
                            : "-"}
                      </strong>
                      <div>
                        {deriveUserAccessScope({
                          platformAdmin: u.platformAdmin,
                          memberships: u.memberships ?? [],
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="chip-row">
                        {(products.length > 0 ? products : ["Core Platform"]).slice(0, 2).map((p) => (
                          <Badge key={`${u.id}-${p}`} tone="neutral">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="data-table__muted">Active this week</div>
                      <Badge
                        tone={(u.memberships ?? []).length === 0 && !u.platformAdmin ? "warning" : "success"}
                      >
                        {deriveUserInvitationStatus({
                          platformAdmin: u.platformAdmin,
                          memberships: u.memberships ?? [],
                        })}
                      </Badge>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageShell>
  );
}
