import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/EmptyState";
import { useLocale } from "../contexts/LocaleContext";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";
import {
  getRedemptions,
  postRedemptionApprove,
  postRedemptionReject,
  type RedemptionRow,
} from "../lib/tenant-loyalty-api";

export function TenantRedemptionsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const [rows, setRows] = useState<RedemptionRow[] | null>(null);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token?.trim()) return;
    const r = await getRedemptions(token);
    setRows(r);
  }, [token]);

  useEffect(() => {
    if (!token?.trim()) return;
    let c = false;
    setError(false);
    getRedemptions(token)
      .then((r) => {
        if (!c) setRows(r);
      })
      .catch(() => {
        if (!c) setError(true);
      });
    return () => {
      c = true;
    };
  }, [token]);

  const loading = rows === null && !error;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(toIntlLocale(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });

  const statusLabel = (s: string) => {
    const k = `tenantLoyalty.redemptions.status.${s}` as const;
    const label = t(k);
    return label === k ? s : label;
  };

  const onApprove = async (id: string) => {
    if (!token?.trim()) return;
    setActing(id);
    try {
      await postRedemptionApprove(token, id);
      await reload();
    } catch {
      setError(true);
    } finally {
      setActing(null);
    }
  };

  const onReject = async (id: string) => {
    if (!token?.trim()) return;
    setActing(id);
    try {
      await postRedemptionReject(token, id);
      await reload();
    } catch {
      setError(true);
    } finally {
      setActing(null);
    }
  };

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.redemptions.eyebrow")}
      title={t("tenantLoyalty.redemptions.title")}
      description={t("tenantLoyalty.redemptions.description")}
    >
      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.redemptions.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState title={t("tenantLoyalty.redemptions.empty")} description="" />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLoyalty.redemptions.columns.customer")}</th>
                  <th>{t("tenantLoyalty.redemptions.columns.reward")}</th>
                  <th>{t("tenantLoyalty.redemptions.columns.points")}</th>
                  <th>{t("tenantLoyalty.redemptions.columns.status")}</th>
                  <th>{t("tenantLoyalty.redemptions.columns.when")}</th>
                  <th>{t("tenantLoyalty.redemptions.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.customer.name}
                      <span className="data-table__muted"> · {r.customer.phone}</span>
                    </td>
                    <td>{r.reward.name}</td>
                    <td className="data-table__mono">{r.pointsSpent}</td>
                    <td>{statusLabel(r.status)}</td>
                    <td className="data-table__muted">{fmt(r.createdAt)}</td>
                    <td>
                      {r.status === "pending" ? (
                        <span className="loyalty-redemption-actions">
                          <button
                            type="button"
                            className="admin-primary-btn"
                            disabled={acting === r.id}
                            onClick={() => onApprove(r.id)}
                          >
                            {t("tenantLoyalty.redemptions.approve")}
                          </button>
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            disabled={acting === r.id}
                            onClick={() => onReject(r.id)}
                          >
                            {t("tenantLoyalty.redemptions.reject")}
                          </button>
                        </span>
                      ) : (
                        <span className="data-table__muted">—</span>
                      )}
                    </td>
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
