import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { downloadComplianceExport } from "../lib/compliance-api";
import { formatDateTimeLabel } from "../lib/formatters";
import {
  fetchManagerAuditEvents,
  type ManagerAuditEventItem,
} from "../lib/tenant-manager-api";

export function TenantAuditPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const { bootstrap } = useAdminDataContext();
  const ent = bootstrap?.entitlements;
  const [rows, setRows] = useState<ManagerAuditEventItem[] | null>(null);
  const [error, setError] = useState<"load" | "forbidden" | null>(null);

  const complianceLevel = ent?.compliance?.level ?? "none";
  const featureOk = complianceLevel !== "none";
  const fullPack = complianceLevel === "full";

  useEffect(() => {
    if (!featureOk) return;
    let c = false;
    setError(null);
    fetchManagerAuditEvents(token, { limit: 50 })
      .then((r) => {
        if (!c) setRows(r.items);
      })
      .catch((e: Error & { code?: string }) => {
        if (!c) setError(e.code === "forbidden" ? "forbidden" : "load");
      });
    return () => {
      c = true;
    };
  }, [token, featureOk]);

  const fmtDate = (iso: string) => formatDateTimeLabel(iso, locale);

  const loading = featureOk && rows === null && !error;

  if (!ent) {
    return (
      <PageShell
        eyebrow={t("tenantAudit.eyebrow")}
        title={t("tenantAudit.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("plan.gate.loadingEntitlements")}</p>
      </PageShell>
    );
  }

  if (!featureOk) {
    return (
      <PageShell
        eyebrow={t("tenantAudit.eyebrow")}
        title={t("plan.gate.auditTitle")}
        description={t("plan.gate.auditLead")}
      >
        <div className="feature-plan-gate">
          <p className="admin-app__card-text">{t("plan.gate.auditBody")}</p>
          <Link to="/app/admin/billing" className="admin-primary-btn">
            {t("plan.gate.ctaBilling")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("tenantAudit.eyebrow")}
      title={t("tenantAudit.title")}
      description={t("tenantAudit.description")}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/app/dashboard" className="admin-secondary-btn">
          ← {t("tenantAudit.backDashboard")}
        </Link>
      </p>

      {hasPermission("audit.export") ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1.25rem" }}>
          <p className="admin-app__card-title">{t("tenantAudit.exportSection")}</p>
          <p className="admin-app__card-text data-table__muted" style={{ marginBottom: "0.75rem" }}>
            {t("tenantAudit.exportHint")}
          </p>
          {fullPack ? (
            <div className="compliance-export-actions">
              <button
                type="button"
                className="admin-primary-btn"
                onClick={() => {
                  if (!window.confirm(t("compliance.exportConfirmAuditCsv"))) return;
                  downloadComplianceExport(token, "/audit/export/csv", "audit-export.csv", locale).catch(
                    () => undefined,
                  );
                }}
              >
                {t("compliance.exportAuditCsv")}
              </button>
            </div>
          ) : (
            <div className="feature-plan-gate compliance-export-actions" style={{ padding: 0 }}>
              <p className="admin-app__card-text">{t("compliance.upgradeUnlockFullPack")}</p>
              <Link to="/app/admin/billing" className="admin-primary-btn">
                {t("compliancePack.ctaPlans")}
              </Link>
            </div>
          )}
        </div>
      ) : null}

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error === "forbidden" ? (
        <p className="admin-app__card-text">{t("tenantAudit.forbidden")}</p>
      ) : error ? (
        <p className="admin-app__card-text">{t("tenantAudit.loadError")}</p>
      ) : rows && rows.length === 0 ? (
        <EmptyState title={t("tenantAudit.empty")} description="" />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-title">{t("tenantAudit.recentTitle")}</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantAudit.colTime")}</th>
                  <th>{t("tenantAudit.colEvent")}</th>
                  <th>{t("tenantAudit.colEntity")}</th>
                  <th>{t("tenantAudit.colActor")}</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="data-table__muted">{fmtDate(r.createdAt)}</td>
                    <td>{r.eventType}</td>
                    <td>
                      {r.entityType} <span className="data-table__mono">{r.entityId.slice(0, 8)}…</span>
                    </td>
                    <td>{r.actorType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
