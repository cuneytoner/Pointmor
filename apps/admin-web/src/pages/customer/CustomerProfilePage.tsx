import { useTranslation } from "../../hooks/useTranslation";
import { useCustomerPwa } from "../../customer-pwa/CustomerPwaContext";

export function CustomerProfilePage() {
  const { t } = useTranslation();
  const { data, setGate } = useCustomerPwa();
  if (!data) return null;

  return (
    <div className="customer-pwa__page">
      <h1 className="customer-pwa__page-title">{t("customerPortal.profileTitle")}</h1>
      <p className="customer-pwa__page-lead">{t("customerPortal.profileLead")}</p>
      <div className="customer-pwa__reward-card" style={{ marginBottom: "1rem" }}>
        <div className="customer-pwa__reward-name">{data.customer.name}</div>
        <div className="customer-pwa__reward-desc">{data.customer.phone}</div>
      </div>
      <button type="button" className="customer-pwa__btn" onClick={setGate}>
        {t("customerPortal.signOut")}
      </button>
    </div>
  );
}
