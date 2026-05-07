import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import {
  AI_ACT_PURPOSE_VALUES,
  AI_ACT_QUESTION_KEYS,
  AI_ACT_QUESTION_TYPE,
  type AiActPurposeValue,
  type AiActQuestionKey,
} from "../lib/ai-act-contract";
import { getAiSystem, submitAiAssessment } from "../lib/ai-act-api";

type FormState = Partial<Record<AiActQuestionKey, boolean | AiActPurposeValue>>;

export function AiActAssessmentPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [systemName, setSystemName] = useState("");
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState>({});
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    getAiSystem(token, id)
      .then((system) => {
        if (!cancelled) setSystemName(system.name);
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

  const allAnswered = useMemo(
    () => AI_ACT_QUESTION_KEYS.every((key) => formState[key] !== undefined && formState[key] !== null),
    [formState],
  );
  const answeredCount = useMemo(
    () => AI_ACT_QUESTION_KEYS.filter((key) => formState[key] !== undefined && formState[key] !== null).length,
    [formState],
  );

  const setBooleanAnswer = (key: AiActQuestionKey, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value === "yes" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;
    if (!allAnswered) {
      setErrorKey("missing_answers");
      return;
    }
    setSubmitting(true);
    setErrorKey(null);
    try {
      await submitAiAssessment(token, id, formState as Record<string, boolean | AiActPurposeValue>);
      navigate(`/app/ai-act/${id}`, { replace: true });
    } catch (err) {
      setErrorKey((err as { code?: string })?.code ?? "unknown");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow={t("aiAct.common.eyebrow")}
      title={t("aiAct.assessment.title", { name: systemName || t("aiAct.common.system") })}
      description={t("aiAct.assessment.description")}
    >
      {loading ? <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p> : null}
      {!loading ? (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text" style={{ marginBottom: "0.75rem" }}>
            {t("aiAct.assessment.notice")}
          </p>
          <p className="admin-app__card-text" style={{ marginBottom: "0.75rem" }}>
            {t("aiAct.assessment.progress", { completed: answeredCount })}
          </p>
          <form className="loyalty-form-stack" onSubmit={onSubmit}>
            {AI_ACT_QUESTION_KEYS.map((key) => {
              const qType = AI_ACT_QUESTION_TYPE[key];
              return (
                <label key={key}>
                  <span>{t(`aiAct.questions.${key}.label`)}</span>
                  {qType === "boolean" ? (
                    <select
                      className="loyalty-form-control"
                      value={formState[key] === undefined ? "" : formState[key] ? "yes" : "no"}
                      onChange={(e) => setBooleanAnswer(key, e.target.value)}
                      required
                    >
                      <option value="">{t("aiAct.common.select")}</option>
                      <option value="yes">{t("tenantLoyalty.common.yes")}</option>
                      <option value="no">{t("tenantLoyalty.common.no")}</option>
                    </select>
                  ) : (
                    <select
                      className="loyalty-form-control"
                      value={typeof formState[key] === "string" ? String(formState[key]) : ""}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          [key]: e.target.value as AiActPurposeValue,
                        }))
                      }
                      required
                    >
                      <option value="">{t("aiAct.common.select")}</option>
                      {AI_ACT_PURPOSE_VALUES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {t(`aiAct.purpose.${purpose}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              );
            })}

            {errorKey ? (
              <p className="admin-app__card-text" role="alert">
                {errorLabel}
              </p>
            ) : null}

            <button type="submit" className="admin-primary-btn" disabled={submitting || !allAnswered}>
              {submitting ? t("aiAct.common.submitting") : t("aiAct.assessment.submit")}
            </button>
          </form>
        </div>
      ) : null}
    </PageShell>
  );
}
