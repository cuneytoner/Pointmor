import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { useAuth } from "../contexts/AuthContext";
import { getApiBaseUrl } from "../lib/api-base";
import {
  buildMarketingForgotPasswordUrl,
  buildMarketingSignupUrl,
} from "../lib/marketing-urls";
import { useTranslation } from "../hooks/useTranslation";

type LoginPageProps = {
  sessionInvalid?: boolean;
};

export function LoginPage({ sessionInvalid }: LoginPageProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@pointmor.local");
  const [password, setPassword] = useState("PointmorDev!Admin");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          tenantSlug: tenantSlug.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(t("auth.login.error"));
        return;
      }
      setToken(data.token);
      navigate("/", { replace: true });
    } catch {
      setError(t("auth.login.error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-standalone-root">
      <div className="login-standalone__grid">
        <div className="login-standalone__form-col">
          <div className="login-card">
            <div className="login-card__brand">
              <img src="/brand/pointmor-mark.svg" width={52} height={52} alt="" />
              <div>
                <h1 className="login-card__title">{t("auth.login.title")}</h1>
                <p className="login-card__subtitle">{t("auth.login.subtitle")}</p>
              </div>
            </div>

            {sessionInvalid ? (
              <p className="login-card__banner" role="alert">
                {t("auth.login.sessionInvalid")}
              </p>
            ) : null}
            {error ? (
              <p className="login-card__error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="login-form" onSubmit={onSubmit} noValidate>
              <label className="login-form__label">
                <span>{t("auth.login.email")}</span>
                <input
                  className="login-form__input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="login-form__label">
                <span>{t("auth.login.password")}</span>
                <input
                  className="login-form__input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder={t("auth.login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                />
              </label>
              <label className="login-form__label">
                <span>{t("auth.login.workspaceCode")}</span>
                <input
                  className="login-form__input"
                  type="text"
                  name="tenantSlug"
                  autoComplete="organization"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                />
                <span className="login-form__hint">{t("auth.login.workspaceHint")}</span>
              </label>
              <button
                className="login-form__submit"
                type="submit"
                disabled={pending}
              >
                {pending ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
            </form>

            <div className="login-card__links">
              <a
                className="login-card__link"
                href={buildMarketingForgotPasswordUrl(locale)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("auth.login.forgot")}
              </a>
              <span className="login-card__dot" aria-hidden>
                ·
              </span>
              <a
                className="login-card__link"
                href={buildMarketingSignupUrl(locale)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("auth.login.register")}
              </a>
            </div>

            <LanguageSelector variant="login" />
          </div>
        </div>
        <div className="login-standalone__art-col" aria-hidden>
          <img
            className="login-standalone__art"
            src="/brand/login-illustration.svg"
            alt=""
            width={520}
            height={420}
          />
        </div>
      </div>
    </div>
  );
}
