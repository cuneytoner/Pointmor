import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const cookiesOnly = import.meta.env.VITE_ADMIN_SESSION_COOKIES_ONLY !== "false";
  const tokenValue = token?.trim() ?? "";
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [system, setSystem] = useState<AiSystem | null>(null);
  const [assessment, setAssessment] = useState<AiAssessmentPayload | null>(null);
  const [obligations, setObligations] = useState<AiObligation[]>([]);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;

  useEffect(() => {
    if (!cookiesOnly && !tokenValue) return;
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    (async () => {
      try {
        const systemRow = await getAiSystem(tokenValue, id);
        const assessmentRow = await getAiAssessment(tokenValue, id);
        const [obligationsRow, tasksRow] = await Promise.all([
          getAiObligations(tokenValue, id),
          getAiTasks(tokenValue, id),
        ]);
        if (cancelled) return;
        setSystem(systemRow);
        setAssessment(assessmentRow);
        setObligations(obligationsRow);
        setTasks(tasksRow);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (!cancelled && (code === "assessment_not_found" || code === "not_found")) {
          navigate(`/app/ai-act/${id}/assessment`, { replace: true });
          return;
        }
        if (!cancelled) setErrorKey(code ?? "unknown");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id, navigate]);

  const riskLevel = assessment?.assessment.riskLevel ?? assessment?.risk?.riskLevel ?? "—";
  const confidence =
    typeof assessment?.assessment.confidence === "number"
      ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : undefined, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(assessment.assessment.confidence)
      : "—";
  const riskLevelLabel =
    riskLevel === "HIGH" || riskLevel === "LIMITED" || riskLevel === "MINIMAL"
      ? t(`aiAct.riskLevel.${riskLevel}`)
      : riskLevel;
  const riskBadgeText = riskLevel === "—" ? t("aiAct.list.notAssessed") : riskLevelLabel;
  const riskRationale = assessment?.risk?.rationale?.trim() ?? "";
  const riskGuidanceKey =
    riskLevel === "HIGH"
      ? "guidanceHigh"
      : riskLevel === "LIMITED"
        ? "guidanceLimited"
        : riskLevel === "MINIMAL"
          ? "guidanceMinimal"
          : "guidanceUnknown";

  const obligationLabel = (type: string) => t(`aiAct.obligationType.${type}.label`);
  const obligationDescription = (type: string) => t(`aiAct.obligationType.${type}.description`);
  const obligationStatusLabel = (status: string) => t(`aiAct.status.obligation.${status}`);
  const taskStatusLabel = (status: string) => t(`aiAct.status.task.${status}`);

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "999px",
                  fontWeight: 600,
                  background: "#f3f4f6",
                }}
              >
                {t("aiAct.result.riskBadgeLabel")}: {riskBadgeText}
              </span>
              <span className="admin-app__card-text">
                {t("aiAct.result.confidenceLabel")}: <strong>{confidence}</strong>
              </span>
            </div>
            <p className="admin-app__card-text" style={{ marginTop: "0.75rem" }}>
              {t("aiAct.result.suggestionNotice")}
            </p>
            <p className="admin-app__card-text" style={{ marginTop: "0.5rem" }}>
              {riskRationale || t(`aiAct.result.${riskGuidanceKey}`)}
            </p>
          </div>

          <div className="admin-app__card admin-app__card--wide" style={{ marginBottom: "1rem" }}>
            <div className="metric-grid metric-grid--3">
              <div className="metric-card">
                <div className="metric-card__label">{t("aiAct.result.riskLevel")}</div>
                <div className="metric-card__value">{riskLevelLabel}</div>
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
                    <strong>{obligationLabel(obligation.obligationType)}</strong>
                    <div className="admin-app__card-text">{obligationDescription(obligation.obligationType)}</div>
                    <div className="admin-app__card-text">{obligationStatusLabel(obligation.status)}</div>
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
                    <strong>{task.title}</strong> - {taskStatusLabel(task.status)}
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginTop: "1rem" }}>
              <Link to={`/app/ai-act/${id}/assessment`} className="admin-secondary-btn">
                {t("aiAct.result.rerunAssessment")}
              </Link>
            </p>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
