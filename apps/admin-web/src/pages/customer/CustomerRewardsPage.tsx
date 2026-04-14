import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { useCustomerPwa } from "../../customer-pwa/CustomerPwaContext";
import { postCustomerProductAnalyticsEvent } from "../../lib/customer-portal-api";

export function CustomerRewardsPage() {
  const { t } = useTranslation();
  const { tenantSlug, data, token, claimReward, claimingId } = useCustomerPwa();
  const viewedMark = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const tok = token?.trim();
    if (!tok) return;
    const mark = `${tenantSlug}:${data.customer.id}`;
    if (viewedMark.current === mark) return;
    viewedMark.current = mark;
    postCustomerProductAnalyticsEvent(tenantSlug, tok, {
      type: "reward_viewed",
      payload: { surface: "rewards_catalog" },
    }).catch(() => {
      /* best-effort */
    });
  }, [tenantSlug, data, token]);

  if (!data) return null;

  const base = `/c/${encodeURIComponent(tenantSlug)}`;
  const balance = data.pointsBalance;

  return (
    <div className="customer-pwa__page">
      <h1 className="customer-pwa__page-title">{t("customerPortal.rewardsTitle")}</h1>
      <p className="customer-pwa__page-lead">{t("customerPortal.rewardsLead")}</p>
      <ul className="customer-pwa__reward-list">
        {data.rewards
          .filter((r) => r.isActive)
          .map((r) => {
            const need = Math.max(0, r.pointsCost - balance);
            const eligible = need === 0;
            const pending = data.pendingClaims.some((p) => p.reward.id === r.id);
            return (
              <li key={r.id} className="customer-pwa__reward-card">
                <div>
                  <div className="customer-pwa__reward-name">{r.name}</div>
                  {r.description ? (
                    <div className="customer-pwa__reward-desc">{r.description}</div>
                  ) : null}
                  <div className="customer-pwa__reward-cost">
                    {t("customerPortal.pointsCost", { n: String(r.pointsCost) })}
                  </div>
                </div>
                {pending ? (
                  <span className="customer-pwa__badge">{t("customerPortal.statusPending")}</span>
                ) : eligible ? (
                  <div className="customer-pwa__reward-actions">
                    <button
                      type="button"
                      className="customer-pwa__btn customer-pwa__btn--small"
                      disabled={claimingId === r.id}
                      onClick={() => claimReward(r.id)}
                    >
                      {claimingId === r.id
                        ? t("customerPortal.claiming")
                        : t("customerPortal.useReward")}
                    </button>
                    <Link className="customer-pwa__link" to={`${base}/claim/${encodeURIComponent(r.id)}`}>
                      {t("customerPortal.showCashierScreen")}
                    </Link>
                  </div>
                ) : (
                  <div className="customer-pwa__reward-locked">
                    <span className="customer-pwa__muted">
                      {t("customerPortal.needMorePoints", { n: String(need) })}
                    </span>
                    {need > 0 && need <= 25 ? (
                      <p className="customer-pwa__almost-free customer-pwa__almost-free--inline">
                        {t("customerPortal.almostFreeLine")}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
