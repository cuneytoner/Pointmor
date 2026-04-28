import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { formatDateTimeLabel } from "../lib/formatters";
import { getAiSystems, type AiSystem } from "../lib/ai-act-api";

type SystemWithRisk = AiSystem & { riskLevel: string | null };

export function AiActSystemsPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { auth } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState<SystemWithRisk[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;
  const restrictedMessageKey = (location.state as { restrictedMessageKey?: string } | null)?.restrictedMessageKey;

  const getRiskLevelLabel = (riskLevel: string | null) => {
    if (!riskLevel) return null;
    if (riskLevel === "HIGH" || riskLevel === "LIMITED" || riskLevel === "MINIMAL") {
      return t(`aiAct.riskLevel.${riskLevel}`);
    }
    return riskLevel;
  };

  useEffect(() => {
    if (!token?.trim()) return;
    let cancelled = false;
    setErrorKey(null);
    setRows(null);
    getAiSystems(token)
      .then((systems) => {
        if (!cancelled) {
          setRows(
            systems.map((system) => ({
              ...system,
              riskLevel: (system as AiSystem & { riskLevel?: string | null }).riskLevel ?? null,
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorKey((err as { code?: string })?.code ?? "unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loading = rows === null && !errorKey;
  const hasRows = (rows?.length ?? 0) > 0;
  const canManageAiAct = Boolean(auth?.user.platformAdmin) || hasPermission("ai_act.manage");

  return (
    <PageShell
      eyebrow={t("aiAct.common.eyebrow")}
      title={t("aiAct.list.title")}
      description={t("aiAct.list.description")}
    >
      {canManageAiAct ? (
        <p style={{ marginBottom: "1rem" }}>
          <Link className="admin-primary-btn" to="/app/ai-act/new">
            {t("aiAct.list.newSystem")}
          </Link>
        </p>
      ) : (
        <p className="admin-app__card-text" style={{ marginBottom: "1rem" }}>
          {t("aiAct.list.createRestrictedHelper")}
        </p>
      )}
      {restrictedMessageKey ? (
        <p className="admin-app__card-text" role="alert" style={{ marginBottom: "1rem" }}>
          {t(restrictedMessageKey)}
        </p>
      ) : null}

      {loading ? (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("aiAct.list.columns.name")}</th>
                  <th>{t("aiAct.list.columns.riskLevel")}</th>
                  <th>{t("aiAct.list.columns.updatedAt")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`ai-act-skeleton-${idx}`}>
                    <td>...</td>
                    <td>...</td>
                    <td className="data-table__muted">...</td>
                    <td>...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {errorKey ? (
        <p className="admin-app__card-text" role="alert">
          {errorLabel}
        </p>
      ) : null}

      {!loading && !errorKey && hasRows ? (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("aiAct.list.columns.name")}</th>
                  <th>{t("aiAct.list.columns.riskLevel")}</th>
                  <th>{t("aiAct.list.columns.updatedAt")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      {row.riskLevel ? (
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            background: "#eef2ff",
                            fontWeight: 600,
                          }}
                        >
                          {getRiskLevelLabel(row.riskLevel)}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            background: "#fff7ed",
                            fontWeight: 600,
                          }}
                        >
                          {t("aiAct.list.assessmentRequired")}
                        </span>
                      )}
                    </td>
                    <td className="data-table__muted">{formatDateTimeLabel(row.updatedAt, locale)}</td>
                    <td>
                      {row.riskLevel ? (
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={() => {
                            navigate(`/app/ai-act/${row.id}`);
                          }}
                        >
                          {t("aiAct.list.viewResult")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-primary-btn"
                          onClick={() => {
                            navigate(`/app/ai-act/${row.id}/assessment`);
                          }}
                        >
                          {t("aiAct.list.startAssessment")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && !errorKey && !hasRows ? (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-title">{t("aiAct.list.emptyTitle")}</p>
          {canManageAiAct ? (
            <p className="admin-app__card-text">
              <Link className="admin-primary-btn" to="/app/ai-act/new">
                {t("aiAct.list.emptyCta")}
              </Link>
            </p>
          ) : (
            <p className="admin-app__card-text">{t("aiAct.list.createRestrictedHelper")}</p>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
