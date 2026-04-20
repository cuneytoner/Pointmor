import { Link, useParams } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { useLocale } from "../../contexts/LocaleContext";
import { useCustomerPwa } from "../../customer-pwa/CustomerPwaContext";
import { formatPoints } from "../../lib/formatters";

export function CustomerClaimPage() {
  const { rewardId = "" } = useParams<{ rewardId: string }>();
  const { t } = useTranslation();
  const locale = useLocale();
  const { tenantSlug, data, claimReward, claimingId } = useCustomerPwa();
  if (!data) return null;

  const base = `/c/${encodeURIComponent(tenantSlug)}`;
  const reward = data.rewards.find((r) => r.id === rewardId);
  const pending = data.pendingClaims.find((p) => p.reward.id === rewardId);

  if (!reward) {
    return (
      <div className="customer-pwa__page">
        <p className="customer-pwa__error">{t("customerPortal.rewardNotFound")}</p>
        <Link to={`${base}/rewards`} className="customer-pwa__btn">
          {t("customerPortal.backToRewards")}
        </Link>
      </div>
    );
  }

  return (
    <div className="customer-pwa__page">
      <h1 className="customer-pwa__page-title">{t("customerPortal.claimTitle")}</h1>
      <p className="customer-pwa__claim-reward-name">{reward.name}</p>
      <p className="customer-pwa__muted">
        {t("customerPortal.pointsCost", { n: formatPoints(reward.pointsCost, locale) })}
      </p>

      {pending ? (
        <div className="customer-pwa__claim-box" role="status">
          <p className="customer-pwa__claim-status">{t("customerPortal.claimPendingCashier")}</p>
          <p className="customer-pwa__mono">{pending.id}</p>
        </div>
      ) : (
        <button
          type="button"
          className="customer-pwa__btn customer-pwa__btn--primary"
          disabled={claimingId === reward.id}
          onClick={() => claimReward(reward.id)}
        >
          {claimingId === reward.id ? t("customerPortal.claiming") : t("customerPortal.startClaim")}
        </button>
      )}

      <p className="customer-pwa__hint">{t("customerPortal.claimHint")}</p>
      <Link to={`${base}/rewards`} className="customer-pwa__link">
        {t("customerPortal.backToRewards")}
      </Link>
    </div>
  );
}
