import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import { useLocale } from "../contexts/LocaleContext";
import { formatPoints } from "../lib/formatters";
import { getNextRewardPreview } from "./loyalty-preview";
import type { CustomerPortalDashboard } from "../lib/customer-portal-api";
import "./visit-success-sheet.css";

function useAnimatedInt(target: number, durationMs: number, enabled: boolean) {
  const [v, setV] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!enabled || target <= 0) {
      setV(target);
      return;
    }
    setV(0);
    fromRef.current = 0;
    startRef.current = null;
    let frame: number;
    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      if (t >= 1) {
        setV(target);
        return;
      }
      const eased = 1 - (1 - t) * (1 - t);
      setV(Math.round(fromRef.current + (target - fromRef.current) * eased));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, enabled]);

  return v;
}

type VisitSuccessSheetProps = {
  tenantSlug: string;
  data: CustomerPortalDashboard;
  gain: number;
  primaryHex: string;
  onDismiss: () => void;
};

export function VisitSuccessSheet({
  tenantSlug,
  data,
  gain,
  primaryHex,
  onDismiss,
}: VisitSuccessSheetProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const base = `/c/${encodeURIComponent(tenantSlug)}`;
  const preview = useMemo(() => getNextRewardPreview(data), [data]);
  const animatedGain = useAnimatedInt(gain, 520, gain > 0);

  const oneStepAway = useMemo(() => {
    if (!preview || preview.canRedeemNow) return false;
    return preview.pointsToNext > 0 && preview.pointsToNext <= Math.max(8, Math.ceil(gain * 0.5));
  }, [preview, gain]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const sheet = (
    <div
      className="visit-success"
      style={{ ["--cp-primary" as string]: primaryHex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-success-title"
    >
      <button
        type="button"
        className="visit-success__backdrop"
        aria-label={t("customerPortal.visitSuccess.closeAria")}
        onClick={onDismiss}
      />
      <div className="visit-success__confetti" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="visit-success__confetti-bit" data-i={i} />
        ))}
      </div>
      <div className="visit-success__panel">
        <p id="visit-success-title" className="visit-success__kicker">
          {t("customerPortal.visitSuccess.kicker")}
        </p>
        <p className="visit-success__points" aria-live="polite">
          <span className="visit-success__plus">+</span>
          <span className="visit-success__points-num">{formatPoints(animatedGain, locale)}</span>
          <span className="visit-success__pts-label">{t("customerPortal.visitSuccess.ptsUnit")}</span>
        </p>
        <p className="visit-success__sub">{t("customerPortal.visitSuccess.sub")}</p>
        <p className="visit-success__save-hint">{t("customerPortal.visitSuccess.saveHint")}</p>

        {preview && !preview.canRedeemNow ? (
          <div className="visit-success__progress-block">
            <p className="visit-success__next-label">
              {t("customerPortal.visitSuccess.nextReward", { name: preview.reward.name })}
            </p>
            <div
              className="visit-success__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={preview.reward.pointsCost}
              aria-valuenow={preview.pointsBalance}
              aria-label={t("customerPortal.nextRewardTitle")}
            >
              <div
                className="visit-success__fill"
                style={{ width: `${preview.progressPct}%` }}
              />
            </div>
            <p className="visit-success__fraction">
              {t("customerPortal.visitSuccess.progressFraction", {
                current: formatPoints(preview.pointsBalance, locale),
                target: formatPoints(preview.reward.pointsCost, locale),
              })}
            </p>
            {oneStepAway ? (
              <p className="visit-success__one-step">{t("customerPortal.visitSuccess.oneStepLeft")}</p>
            ) : null}
          </div>
        ) : preview?.canRedeemNow ? (
          <p className="visit-success__unlocked">{t("customerPortal.nextRewardUnlocked")}</p>
        ) : null}

        <div className="visit-success__actions">
          <button type="button" className="visit-success__btn visit-success__btn--primary" onClick={onDismiss}>
            {t("customerPortal.visitSuccess.ctaSave")}
          </button>
          <button type="button" className="visit-success__btn visit-success__btn--ghost" onClick={onDismiss}>
            {t("customerPortal.visitSuccess.ctaContinue")}
          </button>
          <Link className="visit-success__link" to={`${base}/rewards`} onClick={onDismiss}>
            {t("customerPortal.visitSuccess.ctaRewards")}
          </Link>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}
