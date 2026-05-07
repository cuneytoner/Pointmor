import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import {
  createTenantBranch,
  fetchTenantBranches,
  patchTenantBranch,
  type TenantBranchDto,
} from "../lib/tenant-branches-api";
import { fetchTenantBranchMetrics } from "../lib/tenant-branch-metrics-api";
import { formatCount } from "../lib/formatters";
import { FORM_CONTROL_CLASS } from "../components/form";
import { canAccessLoyaltySurface } from "../lib/tenant-module-access";

function addressToText(a: unknown): string {
  if (a === null || a === undefined) return "";
  if (typeof a === "string") return a;
  try {
    return JSON.stringify(a, null, 2);
  } catch {
    return "";
  }
}

export function TenantLocationsPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const cookiesOnly = import.meta.env.VITE_ADMIN_SESSION_COOKIES_ONLY !== "false";
  const { auth, bootstrap } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("settings.manage");
  const canAnalytics = hasPermission("analytics.view");
  const loyaltyActive = canAccessLoyaltySurface(auth, bootstrap);

  const [branches, setBranches] = useState<TenantBranchDto[] | null>(null);
  const [metrics, setMetrics] = useState<Awaited<
    ReturnType<typeof fetchTenantBranchMetrics>
  > | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");

  const refresh = useCallback(async () => {
    if ((!cookiesOnly && !token?.trim()) || !loyaltyActive) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [b, m] = await Promise.all([
        fetchTenantBranches(token),
        canAnalytics ? fetchTenantBranchMetrics(token).catch(() => null) : Promise.resolve(null),
      ]);
      setBranches(b);
      setMetrics(m);
    } catch {
      setLoadError(true);
      setBranches(null);
    } finally {
      setLoading(false);
    }
  }, [token, canAnalytics, loyaltyActive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    if ((!cookiesOnly && !token?.trim()) || !canManage) return;
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createTenantBranch(token, {
        name,
        slug: newSlug.trim() || undefined,
      });
      setNewName("");
      setNewSlug("");
      await refresh();
    } catch {
      /* toast yok — sessiz */
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: TenantBranchDto) => {
    setEditing(b.id);
    setEditAddress(addressToText(b.address));
  };

  const saveEdit = async (b: TenantBranchDto) => {
    if ((!cookiesOnly && !token?.trim()) || !canManage) return;
    let addr: unknown = null;
    const raw = editAddress.trim();
    if (raw) {
      try {
        addr = JSON.parse(raw) as unknown;
      } catch {
        addr = raw;
      }
    }
    setSaving(true);
    try {
      await patchTenantBranch(token, b.id, { address: addr });
      setEditing(null);
      await refresh();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: TenantBranchDto) => {
    if ((!cookiesOnly && !token?.trim()) || !canManage) return;
    setSaving(true);
    try {
      await patchTenantBranch(token, b.id, { isActive: !b.isActive });
      await refresh();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (!loyaltyActive) {
    return <p className="admin-app__card-text">{t("tenantAudit.forbidden")}</p>;
  }

  if (loading && !branches) {
    return <p className="admin-app__card-text">{t("tenantLocations.loading")}</p>;
  }

  if (loadError) {
    return (
      <p className="admin-app__card-text" style={{ color: "#b91c1c" }}>
        {t("tenantLocations.loadError")}
      </p>
    );
  }

  return (
    <div className="tenant-locations-page">
      {canAnalytics && metrics ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
          <h2 className="admin-app__card-title">{t("tenantLocations.metricsTitle")}</h2>
          <p className="admin-app__card-text loyalty-form-hint">
            {t("tenantLocations.metricsHint", { days: String(metrics.periodDays) })}
          </p>
          {metrics.unassignedVisits > 0 ? (
            <p className="admin-app__card-text">
              {t("tenantLocations.unassignedVisits", { n: formatCount(metrics.unassignedVisits, locale) })}
            </p>
          ) : null}
          <div className="data-table-wrap" style={{ marginTop: "0.75rem" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLocations.colBranch")}</th>
                  <th className="data-table__num">{t("tenantLocations.colVisits7d")}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.branches.map((row) => (
                  <tr key={row.branchId}>
                    <td>{row.name}</td>
                    <td className="data-table__num">{formatCount(row.visits, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
          <h2 className="admin-app__card-title">{t("tenantLocations.addTitle")}</h2>
          <div className="loyalty-form-grid" style={{ maxWidth: "28rem" }}>
            <label className="loyalty-field">
              <span className="loyalty-field__label">{t("tenantLocations.name")}</span>
              <input
                className={FORM_CONTROL_CLASS}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="loyalty-field">
              <span className="loyalty-field__label">{t("tenantLocations.slugOptional")}</span>
              <input
                className={FORM_CONTROL_CLASS}
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                disabled={saving}
              />
            </label>
            <button
              type="button"
              className="admin-primary-btn"
              disabled={saving || !newName.trim()}
              onClick={() => void onCreate()}
            >
              {t("tenantLocations.addButton")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("tenantLocations.listTitle")}</h2>
        {!branches?.length ? (
          <p className="admin-app__card-text">{t("tenantLocations.empty")}</p>
        ) : (
          <ul className="tenant-locations-list">
            {branches.map((b) => (
              <li key={b.id} className="tenant-locations-list__item">
                <div className="tenant-locations-list__head">
                  <strong>{b.name}</strong>
                  {b.slug ? (
                    <span className="data-table__muted"> ({b.slug})</span>
                  ) : null}
                  <span className="data-table__muted">
                    {" "}
                    — {b.isActive ? t("tenantLocations.active") : t("tenantLocations.inactive")}
                  </span>
                  {canManage ? (
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      style={{ marginLeft: "0.75rem" }}
                      disabled={saving}
                      onClick={() => void toggleActive(b)}
                    >
                      {b.isActive ? t("tenantLocations.deactivate") : t("tenantLocations.activate")}
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      disabled={saving}
                      onClick={() => (editing === b.id ? setEditing(null) : startEdit(b))}
                    >
                      {editing === b.id ? t("tenantLocations.cancelEdit") : t("tenantLocations.editAddress")}
                    </button>
                  ) : null}
                </div>
                {editing === b.id && canManage ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <textarea
                      className={FORM_CONTROL_CLASS}
                      rows={4}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      disabled={saving}
                    />
                    <button
                      type="button"
                      className="admin-primary-btn"
                      style={{ marginTop: "0.35rem" }}
                      disabled={saving}
                      onClick={() => void saveEdit(b)}
                    >
                      {t("tenantLocations.saveAddress")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
