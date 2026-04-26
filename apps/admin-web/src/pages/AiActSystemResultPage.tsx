import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import {
  getAiAssessment,
  getAiObligations,
  getAiSystem,
  getAiTasks,
  type AiAssessmentPayload,
  type AiObligation,
  type AiSystem,
  type AiTask,
} from "../lib/ai-act-api";

export function AiActSystemResultPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { id = "" } = useParams();
  const [system, setSystem] = useState<AiSystem | null>(null);
  const [assessment, setAssessment] = useState<AiAssessmentPayload | null>(null);
  const [obligations, setObligations] = useState<AiObligation[]>([]);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;

  useEffect(() => {
    if (!token?.trim() || !id) return;
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    Promise.all([
      getAiSystem(token, id),
      getAiAssessment(token, id),
      getAiObligations(token, id),
      getAiTasks(token, id),
    ])
      .then(([systemRow, assessmentRow, obligationsRow, tasksRow]) => {
        if (cancelled) return;
        setSystem(systemRow);
        setAssessment(assessmentRow);
        setObligations(obligationsRow);
        setTasks(tasksRow);
      })
      .catch((err) => {
        if (!cancelled) setErrorKey((err as { code?: string })?.code ?? "unknown");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const riskLevel = assessment?.assessment.riskLevel ?? assessment?.risk?.riskLevel ?? "—";
  const confidence =
    typeof assessment?.assessment.confidence === "number"
      ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : undefined, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(assessment.assessment.confidence)
      : "—";

  return (
    <PageShell
      eyebrow={t("aiAct.common.eyebrow")}
      title={t("aiAct.result.title", { name: system?.name ?? t("aiAct.common.system") })}
      description={t("aiAct.result.description")}
    >
      <p style={{ marginBottom: "1rem" }}>
        <Link to="/app/ai-act" className="admin-secondary-btn">
          {t("aiAct.common.backToList")}
        </Link>
      </p>

      {loading ? <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p> : null}
      {errorKey ? (
        <p className="admin-app__card-text" role="alert">
          {errorLabel}
        </p>
      ) : null}

      {!loading && !errorKey ? (
        <>
          <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
            <div className="metric-grid metric-grid--3">
              <div className="metric-card">
                <div className="metric-card__label">{t("aiAct.result.riskLevel")}</div>
                <div className="metric-card__value">{riskLevel}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">{t("aiAct.result.confidence")}</div>
                <div className="metric-card__value">{confidence}</div>
              </div>
              <div className="metric-card">
                <div className="metric-card__label">{t("aiAct.result.suggested")}</div>
                <div className="metric-card__value">{assessment?.suggested ? t("tenantLoyalty.common.yes") : t("tenantLoyalty.common.no")}</div>
              </div>
            </div>
          </div>

          <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
            <p className="admin-app__card-title">{t("aiAct.result.obligations")}</p>
            {obligations.length === 0 ? (
              <p className="admin-app__card-text">{t("aiAct.result.emptyObligations")}</p>
            ) : (
              <ul>
                {obligations.map((obligation) => (
                  <li key={obligation.id}>
                    <strong>{obligation.obligationType}</strong> - {obligation.status}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-app__card admin-app__card--wide">
            <p className="admin-app__card-title">{t("aiAct.result.tasks")}</p>
            {tasks.length === 0 ? (
              <p className="admin-app__card-text">{t("aiAct.result.emptyTasks")}</p>
            ) : (
              <ul>
                {tasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong> - {task.status}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
