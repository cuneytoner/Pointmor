import { type FormEvent, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import type { CustomerPortalBootstrap } from "../lib/customer-portal-api";

export function CustomerPwaGate({
  bootstrap,
  gateError,
  onDismissGateError,
  onSubmit,
}: {
  bootstrap: CustomerPortalBootstrap;
  gateError: string | null;
  onDismissGateError: () => void;
  onSubmit: (e: FormEvent, phone: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const tenant = bootstrap.tenant;
  const rewardPreview = bootstrap.rewards.filter((r) => r.isActive).slice(0, 3);
  const topCampaign = bootstrap.campaigns[0];

  return (
    <div className="customer-pwa__gate">
      <header className="customer-pwa__header">
        {tenant.branding.logoUrl ? (
          <img
            src={tenant.branding.logoUrl}
            alt=""
            className="customer-pwa__logo customer-pwa__logo--gate"
            width={56}
            height={56}
          />
        ) : null}
        <h1 className="customer-pwa__tenant">{tenant.name}</h1>
        <p className="customer-pwa__gate-lead">{t("customerPortal.gateHeadline")}</p>
        <p className="customer-pwa__muted">{t("customerPortal.gateSub")}</p>
      </header>

      {(rewardPreview.length > 0 || topCampaign) && (
        <section className="customer-pwa__gate-preview" aria-label={t("customerPortal.gatePreviewAria")}>
          {rewardPreview.length > 0 ? (
            <p className="customer-pwa__gate-teaser">
              {t("customerPortal.gateRewardsTeaser", {
                count: String(bootstrap.rewards.filter((r) => r.isActive).length),
              })}
            </p>
          ) : null}
          <ul className="customer-pwa__gate-chips">
            {rewardPreview.map((r) => (
              <li key={r.id} className="customer-pwa__chip customer-pwa__chip--gate">
                {r.name}
              </li>
            ))}
          </ul>
          {topCampaign ? (
            <p className="customer-pwa__gate-campaign">
              {t("customerPortal.gateCampaignAccent", { name: topCampaign.name })}
            </p>
          ) : null}
        </section>
      )}

      <form
        className="customer-pwa__form"
        onSubmit={async (e) => {
          e.preventDefault();
          onDismissGateError();
          setLocalError(null);
          const trimmed = phone.trim();
          if (!trimmed) {
            setLocalError(t("customerPortal.phoneRequired"));
            return;
          }
          setBusy(true);
          try {
            await onSubmit(e, trimmed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="customer-pwa__label">
          <span>{t("customerPortal.phone")}</span>
          <input
            className="customer-pwa__input"
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder={t("customerPortal.phonePlaceholder")}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setLocalError(null);
              onDismissGateError();
            }}
            aria-invalid={Boolean(localError || gateError)}
            aria-describedby={localError || gateError ? "gate-err" : undefined}
          />
        </label>
        {(localError || gateError) && (
          <p id="gate-err" className="customer-pwa__gate-err" role="alert">
            {localError ?? gateError}
          </p>
        )}
        <button className="customer-pwa__btn" type="submit" disabled={busy}>
          {busy ? t("customerPortal.signingIn") : t("customerPortal.continueSeePoints")}
        </button>
      </form>
    </div>
  );
}
