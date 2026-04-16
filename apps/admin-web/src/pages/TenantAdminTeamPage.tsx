import { useMemo } from "react";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import { tenantMembershipRole } from "../lib/access";

/**
 * Takım üyeleri / davetler için yer tutucu; API genişleyince genişletilir.
 */
export function TenantAdminTeamPage() {
  const { t } = useTranslation();
  const { auth, bootstrap } = useAdminDataContext();

  const roleLabel = useMemo(() => {
    if (!auth) return "—";
    const r = tenantMembershipRole(auth);
    if (r === "tenant_operator") return t("users.roles.tenant_operator");
    if (r === "viewer") return t("users.roles.viewer");
    return r;
  }, [auth, t]);

  const ent = bootstrap?.entitlements ?? null;
  const staffUsed = ent?.usage.staffUserCount ?? 0;
  const staffCap = ent?.limits.maxStaffUsers ?? null;
  const capStr = staffCap === null ? "∞" : String(staffCap);

  return (
    <>
      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("workspaceAdmin.team.sectionRole")}</h2>
        <p className="admin-app__card-text">
          {t("workspaceAdmin.team.roleLabel")}: <strong>{roleLabel}</strong>
        </p>
        <p className="admin-app__card-text loyalty-form-hint">{t("workspaceAdmin.team.roleHint")}</p>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("workspaceAdmin.team.sectionStaffLimit")}</h2>
        <p className="admin-app__card-text">
          {ent
            ? t("workspaceAdmin.team.staffUsage", { used: staffUsed, cap: capStr })
            : t("workspaceAdmin.team.staffUsageUnknown")}
        </p>
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("workspaceAdmin.team.sectionInvites")}</h2>
        <p className="admin-app__card-text">{t("workspaceAdmin.team.invitesPlaceholder")}</p>
      </div>
    </>
  );
}
