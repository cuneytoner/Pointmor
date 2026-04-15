import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

type RedemptionsView = "pending" | "completed" | "all";

function parseApiError(err: unknown): string | undefined {
  const e = err as { body?: unknown };
  const b = e.body;
  if (b && typeof b === "object" && b !== null && "error" in b) {
    return String((b as { error?: string }).error ?? "");
  }
  return undefined;
}

export function TenantRedemptionsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const [rows, setRows] = useState<RedemptionRow[] | null>(null);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [view, setView] = useState<RedemptionsView>("pending");
  const [detail, setDetail] = useState<RedemptionRow | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (view === "pending") return rows.filter((r) => r.status === "pending");
    if (view === "completed") return rows.filter((r) => r.status === "completed");
    return rows;
  }, [rows, view]);

  const pendingCount = useMemo(
    () => (rows ? rows.filter((r) => r.status === "pending").length : 0),
    [rows],
  );

  const onApprove = async (id: string) => {
    if (!token?.trim()) return;
    setActing(id);
    setActionMessage(null);
    try {
      await postRedemptionApprove(token, id);
      await reload();
      setDetail((d) => (d?.id === id ? null : d));
    } catch (e) {
      const code = parseApiError(e);
      setActionMessage(
        code === "insufficient_points"
          ? t("tenantLoyalty.redemptions.insufficientOnApprove")
          : t("tenantLoyalty.redemptions.actionError"),
      );
    } finally {
      setActing(null);
    }
  };

  const onReject = async (id: string) => {
    if (!token?.trim()) return;
    setActing(id);
    setActionMessage(null);
    try {
      await postRedemptionReject(token, id);
      await reload();
      setDetail((d) => (d?.id === id ? null : d));
    } catch {
      setActionMessage(t("tenantLoyalty.redemptions.actionError"));
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
      {actionMessage ? (
        <p className="admin-app__card-text" role="status" style={{ marginBottom: "0.75rem" }}>
          {actionMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.redemptions.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState title={t("tenantLoyalty.redemptions.empty")} description="" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            view === "pending"
              ? t("tenantLoyalty.redemptions.emptyPending")
              : view === "completed"
                ? t("tenantLoyalty.redemptions.emptyCompleted")
                : t("tenantLoyalty.redemptions.empty")
          }
          description=""
        />
      ) : (
        <>
          <div
            className="admin-app__card"
            style={{
              marginBottom: "1rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <span className="admin-app__card-text" style={{ marginRight: "0.5rem" }}>
              {t("tenantLoyalty.redemptions.filterLabel")}
            </span>
            <button
              type="button"
              className={view === "pending" ? "admin-primary-btn" : "admin-secondary-btn"}
              onClick={() => setView("pending")}
            >
              {t("tenantLoyalty.redemptions.filterPending")} ({pendingCount})
            </button>
            <button
              type="button"
              className={view === "completed" ? "admin-primary-btn" : "admin-secondary-btn"}
              onClick={() => setView("completed")}
            >
              {t("tenantLoyalty.redemptions.filterCompleted")}
            </button>
            <button
              type="button"
              className={view === "all" ? "admin-primary-btn" : "admin-secondary-btn"}
              onClick={() => setView("all")}
            >
              {t("tenantLoyalty.redemptions.filterAll")}
            </button>
          </div>

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
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setDetail(r)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "inherit",
                            textAlign: "left",
                            font: "inherit",
                          }}
                        >
                          {r.customer.name}
                          <span className="data-table__muted"> · {r.customer.phone}</span>
                        </button>
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
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={() => setDetail(r)}
                          >
                            {t("tenantLoyalty.redemptions.viewDetail")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {detail ? (
        <div
          className="loyalty-redemption-drawer-backdrop"
          role="presentation"
          onClick={() => setDetail(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDetail(null);
          }}
        >
          <div
            className="admin-app__card loyalty-redemption-drawer"
            role="dialog"
            aria-modal
            aria-labelledby="redemption-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="redemption-detail-title" className="admin-app__card-title">
              {t("tenantLoyalty.redemptions.detailTitle")}
            </h2>
            <p className="admin-app__card-text">
              <span className="data-table__muted">{t("common.id")}</span>{" "}
              <span className="data-table__mono">{detail.id}</span>
            </p>
            <p className="admin-app__card-text">
              {detail.customer.name}
              <span className="data-table__muted"> · {detail.customer.phone}</span>
            </p>
            <p className="admin-app__card-text">
              {detail.reward.name}{" "}
              <span className="data-table__muted">
                · {t("tenantLoyalty.redemptions.detailPoints", { n: String(detail.pointsSpent) })}
              </span>
            </p>
            <p className="admin-app__card-text">
              {statusLabel(detail.status)} · {fmt(detail.createdAt)}
            </p>
            <p style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Link
                to={`/app/customers/${encodeURIComponent(detail.customer.id)}`}
                className="admin-secondary-btn"
              >
                {t("tenantLoyalty.redemptions.openCustomer")}
              </Link>
              {detail.status === "pending" ? (
                <>
                  <button
                    type="button"
                    className="admin-primary-btn"
                    disabled={acting === detail.id}
                    onClick={() => onApprove(detail.id)}
                  >
                    {t("tenantLoyalty.redemptions.approve")}
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    disabled={acting === detail.id}
                    onClick={() => onReject(detail.id)}
                  >
                    {t("tenantLoyalty.redemptions.reject")}
                  </button>
                </>
              ) : null}
              <button type="button" className="admin-secondary-btn" onClick={() => setDetail(null)}>
                {t("tenantLoyalty.redemptions.closeDetail")}
              </button>
            </p>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
