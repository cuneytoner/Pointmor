import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useLocale } from "../contexts/LocaleContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";

export function TenantBillingPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { auth, bootstrap } = useAdminDataContext();
  const tenantId = auth?.tenant?.id ?? null;

  const sub = useMemo(() => {
    if (!bootstrap?.subscriptions || !tenantId) return null;
    return bootstrap.subscriptions.find((s) => s.tenant.id === tenantId) ?? null;
  }, [bootstrap?.subscriptions, tenantId]);

  const renewsLabel = useMemo(() => {
    const raw = sub?.renewsAt;
    if (!raw) return t("billing.renewsUnknown");
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return t("billing.renewsUnknown");
    return d.toLocaleDateString(toIntlLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [sub?.renewsAt, locale, t]);

  if (!bootstrap || !tenantId) {
    return (
      <PageShell eyebrow={t("billing.eyebrow")} title={t("billing.title")} description="">
        <p className="admin-app__card-text">{t("common.loadingBody")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={t("billing.eyebrow")}
      title={t("billing.title")}
      description={t("billing.description")}
    >
      {!sub ? (
        <p className="admin-app__card-text">{t("billing.empty")}</p>
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="metric-grid metric-grid--3">
            <div className="metric-card">
              <div className="metric-card__label">{t("billing.plan")}</div>
              <div className="metric-card__value">{sub.plan.name}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("billing.status")}</div>
              <div className="metric-card__value">{sub.status}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("billing.renews")}</div>
              <div className="metric-card__value">{renewsLabel}</div>
            </div>
          </div>
        </div>
      )}
      <p className="admin-app__card-text">
        <Link to="/pricing" className="admin-secondary-btn">
          {t("usage.upgradeCta")}
        </Link>
      </p>
    </PageShell>
  );
}
