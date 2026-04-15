import { Link } from "react-router-dom";
import type { EntitlementsPayload } from "../lib/entitlements-api";
import { useTranslation } from "../hooks/useTranslation";

type Props = {
  entitlements: EntitlementsPayload | null | undefined;
};

function isAtLimit(
  remaining: number | null,
  cap: number | null,
): boolean {
  if (cap === null) return false;
  return remaining !== null && remaining <= 0;
}

/** Yaklaşan limit veya dolmuş limit şeridi — tenant workspace üstü. */
export function EntitlementAlerts({ entitlements }: Props) {
  const { t } = useTranslation();
  if (!entitlements) return null;

  const { warnings, remaining, limits } = entitlements;
  const blocks: Array<{ key: string; kind: "hard" | "soft" }> = [];

  if (isAtLimit(remaining.visitsThisMonth, limits.maxVisitsPerMonth)) {
    blocks.push({ key: "maxVisitsPerMonth", kind: "hard" });
  }
  if (isAtLimit(remaining.customers, limits.maxCustomers)) {
    blocks.push({ key: "maxCustomers", kind: "hard" });
  }
  if (isAtLimit(remaining.activeCampaigns, limits.maxActiveCampaigns)) {
    blocks.push({ key: "maxActiveCampaigns", kind: "hard" });
  }
  if (isAtLimit(remaining.staffUsers, limits.maxStaffUsers)) {
    blocks.push({ key: "maxStaffUsers", kind: "hard" });
  }

  for (const w of warnings) {
    if (blocks.some((b) => b.key === w.metric)) continue;
    blocks.push({ key: w.metric, kind: "soft" });
  }

  if (blocks.length === 0) return null;

  return (
    <div className="entitlement-alerts" role="region" aria-label={t("plan.alerts.regionAria")}>
      {blocks.map((b) => (
        <div
          key={`${b.key}-${b.kind}`}
          className={
            b.kind === "hard"
              ? "entitlement-alerts__row entitlement-alerts__row--hard"
              : "entitlement-alerts__row entitlement-alerts__row--soft"
          }
        >
          <span className="entitlement-alerts__text">
            {b.kind === "hard"
              ? t(`plan.limitReached.${b.key}`)
              : t(`plan.approachingLimit.${b.key}`)}
          </span>
          <Link to="/app/billing" className="entitlement-alerts__link">
            {t("plan.alerts.viewBilling")}
          </Link>
        </div>
      ))}
    </div>
  );
}
