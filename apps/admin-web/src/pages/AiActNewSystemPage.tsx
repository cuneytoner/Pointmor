import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { createAiSystem } from "../lib/ai-act-api";

export function AiActNewSystemPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const cookiesOnly = import.meta.env.VITE_ADMIN_SESSION_COOKIES_ONLY !== "false";
  const { auth } = useAdminDataContext();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [providerType, setProviderType] = useState<"INTERNAL" | "EXTERNAL" | "HYBRID">("EXTERNAL");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorLabel = errorKey ? t(`aiAct.errors.${errorKey}`) : null;
  const canManageAiAct = Boolean(auth?.user.platformAdmin) || hasPermission("ai_act.manage");

  useEffect(() => {
    if (canManageAiAct) return;
    navigate("/app/ai-act", {
      replace: true,
      state: { restrictedMessageKey: "aiAct.new.noPermission" },
    });
  }, [canManageAiAct, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAiAct) return;
    if ((!cookiesOnly && !token?.trim()) || submitting) return;
    setErrorKey(null);
    setSubmitting(true);
    try {
      const created = await createAiSystem(token, {
        name: name.trim(),
        purpose: purpose.trim() || undefined,
        providerType,
      });
      navigate(`/app/ai-act/${created.id}/assessment`, { replace: true });
    } catch (err) {
      setErrorKey((err as { code?: string })?.code ?? "unknown");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      eyebrow={t("aiAct.common.eyebrow")}
      title={t("aiAct.new.title")}
      description={t("aiAct.new.description")}
    >
      <div className="admin-app__card">
        <p className="admin-app__card-text" style={{ marginBottom: "1rem" }}>
          {t("aiAct.new.helper")}
        </p>
        <form className="loyalty-form-stack" onSubmit={onSubmit}>
          <label>
            <span>{t("aiAct.new.fields.name")}</span>
            <input
              className="loyalty-form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            <span>{t("aiAct.new.fields.purpose")}</span>
            <textarea
              className="loyalty-form-control loyalty-form-control--textarea"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </label>
          <label>
            <span>{t("aiAct.new.fields.providerType")}</span>
            <select
              className="loyalty-form-control"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as "INTERNAL" | "EXTERNAL" | "HYBRID")}
            >
              <option value="INTERNAL">{t("aiAct.providerType.INTERNAL")}</option>
              <option value="EXTERNAL">{t("aiAct.providerType.EXTERNAL")}</option>
              <option value="HYBRID">{t("aiAct.providerType.HYBRID")}</option>
            </select>
          </label>
          {errorKey ? (
            <p className="admin-app__card-text" role="alert">
              {errorLabel}
            </p>
          ) : null}
          <button type="submit" className="admin-primary-btn" disabled={submitting || !name.trim()}>
            {submitting ? t("aiAct.common.submitting") : t("aiAct.new.submit")}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
