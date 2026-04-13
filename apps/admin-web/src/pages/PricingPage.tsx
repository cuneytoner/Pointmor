import { Link } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";

export function PricingPage() {
  const { t } = useTranslation();
  return (
    <div className="pricing-standalone">
      <div className="pricing-standalone__card">
        <h1 className="pricing-standalone__title">{t("pricing.title")}</h1>
        <p className="pricing-standalone__text">{t("pricing.description")}</p>
        <Link className="pricing-standalone__link" to="/login">
          {t("pricing.ctaLogin")}
        </Link>
      </div>
    </div>
  );
}
