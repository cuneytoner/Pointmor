import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { useLocale } from "../../contexts/LocaleContext";
import { toIntlLocale } from "../../lib/locale-intl";
import { useCustomerPwa } from "../../customer-pwa/CustomerPwaContext";

export function CustomerHomePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { tenantSlug, data, celebrationGain, clearCelebration } = useCustomerPwa();

  const base = useMemo(
    () => `/c/${encodeURIComponent(tenantSlug)}`,
    [tenantSlug],
  );

  const tenantName = data ? (data.tenant?.name ?? data.customer.name) : "";
  const lastVisit = data?.recentVisits[0];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(toIntlLocale(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });

  const activeRewards = useMemo(() => {
    if (!data) return [];
    return data.rewards
      .filter((r) => r.isActive)
      .sort((a, b) => a.pointsCost - b.pointsCost);
  }, [data]);

  const nextReward = useMemo(() => {
    if (activeRewards.length === 0 || !data) return null;
    const needUnlock = activeRewards.find((r) => r.pointsCost > data.pointsBalance);
    return needUnlock ?? activeRewards[0];
  }, [activeRewards, data]);

  const nextProgressPct = useMemo(() => {
    if (!data || !nextReward || nextReward.pointsCost <= 0) return 100;
    return Math.min(100, Math.round((data.pointsBalance / nextReward.pointsCost) * 100));
  }, [data, nextReward]);

  const ptsToNext = nextReward && data ? Math.max(0, nextReward.pointsCost - data.pointsBalance) : 0;
  const canRedeemSomething = Boolean(
    data && activeRewards.some((r) => data.pointsBalance >= r.pointsCost),
  );

  useEffect(() => {
    if (!celebrationGain || celebrationGain <= 0) return;
    const id = window.setTimeout(() => clearCelebration(), 7800);
    return () => window.clearTimeout(id);
  }, [celebrationGain, clearCelebration]);

  if (!data) return null;

  return (
    <div className="customer-pwa__home">
      {celebrationGain !== null && celebrationGain > 0 ? (
        <div className="customer-pwa__celebrate" role="status">
          <div className="customer-pwa__celebrate-inner">
            <p className="customer-pwa__celebrate-title">
              {t("customerPortal.celebrateGain", { points: String(celebrationGain) })}
            </p>
            <p className="customer-pwa__celebrate-sub">{t("customerPortal.almostFreeLine")}</p>
            <button type="button" className="customer-pwa__celebrate-dismiss" onClick={clearCelebration}>
              {t("customerPortal.celebrateDismiss")}
            </button>
          </div>
        </div>
      ) : null}

      <header className="customer-pwa__home-head">
        {data.tenant?.branding.logoUrl ? (
          <img
            src={data.tenant.branding.logoUrl}
            alt=""
            className="customer-pwa__logo"
            width={48}
            height={48}
          />
        ) : null}
        <h1 className="customer-pwa__home-title">{tenantName}</h1>
        <p className="customer-pwa__home-sub">{data.customer.name}</p>
      </header>

      <section className="customer-pwa__hero" aria-labelledby="balance-heading">
        <h2 id="balance-heading" className="customer-pwa__sr-only">
          {t("customerPortal.balance")}
        </h2>
        <div className="customer-pwa__balance-card">
          <span className="customer-pwa__balance-label">{t("customerPortal.balance")}</span>
          <span className="customer-pwa__balance-num">{data.pointsBalance}</span>
        </div>
        {lastVisit ? (
          <p className="customer-pwa__last-earn">
            {t("customerPortal.lastEarnMicro", {
              points: String(lastVisit.pointsEarned),
              when: fmt(lastVisit.createdAt),
            })}
          </p>
        ) : (
          <p className="customer-pwa__muted">{t("customerPortal.noVisitsYet")}</p>
        )}
      </section>

      {nextReward ? (
        <section className="customer-pwa__next-reward" aria-labelledby="next-rw">
          <h2 id="next-rw" className="customer-pwa__h2">
            {t("customerPortal.nextRewardTitle")}
          </h2>
          {canRedeemSomething ? (
            <p className="customer-pwa__next-reward-lead">{t("customerPortal.nextRewardUnlocked")}</p>
          ) : (
            <>
              <p className="customer-pwa__next-reward-target">
                {t("customerPortal.nextRewardPointsAway", {
                  points: String(ptsToNext),
                  name: nextReward.name,
                })}
              </p>
              <div
                className="customer-pwa__progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={nextProgressPct}
                aria-label={t("customerPortal.nextRewardTitle")}
              >
                <div
                  className="customer-pwa__progress-fill"
                  style={{ width: `${nextProgressPct}%` }}
                />
              </div>
              <p className="customer-pwa__next-reward-pct">
                {t("customerPortal.nextRewardProgress", {
                  pct: String(nextProgressPct),
                  name: nextReward.name,
                })}
              </p>
              {ptsToNext > 0 && ptsToNext <= 25 ? (
                <p className="customer-pwa__almost-free">{t("customerPortal.almostFreeLine")}</p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <div className="customer-pwa__cta-row">
        <Link className="customer-pwa__btn customer-pwa__btn--primary" to={`${base}/rewards`}>
          {t("customerPortal.ctaUseReward")}
        </Link>
        <Link className="customer-pwa__btn customer-pwa__btn--ghost" to={`${base}/activity`}>
          {t("customerPortal.ctaActivity")}
        </Link>
      </div>

      <section className="customer-pwa__section" aria-labelledby="rw-h">
        <div className="customer-pwa__section-head">
          <h2 id="rw-h" className="customer-pwa__h2">
            {t("customerPortal.rewards")}
          </h2>
          <Link to={`${base}/rewards`} className="customer-pwa__see-all">
            {t("customerPortal.seeAll")}
          </Link>
        </div>
        {activeRewards.length === 0 ? (
          <p className="customer-pwa__muted">{t("customerPortal.noRewards")}</p>
        ) : (
          <ul className="customer-pwa__mini-list">
            {activeRewards.slice(0, 3).map((r) => (
              <li key={r.id}>
                <span>{r.name}</span>
                <span className="customer-pwa__muted">
                  {t("customerPortal.pointsCost", { n: String(r.pointsCost) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="customer-pwa__section" aria-labelledby="camp-h">
        <h2 id="camp-h" className="customer-pwa__h2">
          {t("customerPortal.campaigns")}
        </h2>
        {data.campaigns.length === 0 ? (
          <p className="customer-pwa__muted">{t("customerPortal.noCampaigns")}</p>
        ) : (
          <ul className="customer-pwa__chips">
            {data.campaigns.slice(0, 4).map((c) => (
              <li key={c.id} className="customer-pwa__chip">
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
