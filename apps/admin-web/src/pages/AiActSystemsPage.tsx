import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import { formatDateTimeLabel } from "../lib/formatters";
import { getAiAssessment, getAiSystems, type AiSystem } from "../lib/ai-act-api";

type SystemWithRisk = AiSystem & { riskLevel: string | null };

export function AiActSystemsPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const [rows, setRows] = useState<SystemWithRisk[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;

  useEffect(() => {
    if (!token?.trim()) return;
    let cancelled = false;
    setErrorKey(null);
    setRows(null);
    getAiSystems(token)
      .then(async (systems) => {
        const withRisk = await Promise.all(
          systems.map(async (system) => {
            try {
              const assessment = await getAiAssessment(token, system.id);
              return {
                ...system,
                riskLevel: assessment.assessment.riskLevel ?? assessment.risk?.riskLevel ?? null,
              };
            } catch (err) {
              const code = (err as { code?: string })?.code;
              if (code === "assessment_not_found" || code === "not_found") {
                return { ...system, riskLevel: null };
              }
              return { ...system, riskLevel: null };
            }
          }),
        );
        if (!cancelled) setRows(withRisk);
      })
      .catch((err) => {
        if (!cancelled) setErrorKey((err as { code?: string })?.code ?? "unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loading = rows === null && !errorKey;

  return (
    <PageShell
      eyebrow={t("aiAct.common.eyebrow")}
      title={t("aiAct.list.title")}
      description={t("aiAct.list.description")}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link className="admin-primary-btn" to="/app/ai-act/new">
          {t("aiAct.list.newSystem")}
        </Link>
      </p>

      {loading ? <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p> : null}
      {errorKey ? (
        <p className="admin-app__card-text" role="alert">
          {errorLabel}
        </p>
      ) : null}

      {!loading && !errorKey ? (
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
                    <td>{row.riskLevel ?? "—"}</td>
                    <td className="data-table__muted">{formatDateTimeLabel(row.updatedAt, locale)}</td>
                    <td>
                      <Link className="admin-secondary-btn" to={`/app/ai-act/${row.id}`}>
                        {t("aiAct.common.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
