import type { EntitlementsPayload } from "../lib/entitlements-api";
import { useTranslation } from "../hooks/useTranslation";

type Props = {
  planType: string;
  className?: string;
};

/** Küçük plan rozeti — header için. */
export function PlanTypeBadge({ planType, className = "" }: Props) {
  const { t } = useTranslation();
  const key = `plan.badge.${planType}` as const;
  const label = t(key);
  const text = label === key ? planType.toUpperCase() : label;
  const tone =
    planType === "free" ? "plan-badge--free" : planType === "pro" ? "plan-badge--pro" : "plan-badge--team";
  return (
    <span className={`plan-badge ${tone} ${className}`.trim()} title={text}>
      {text}
    </span>
  );
}

export function planBadgeFromEntitlements(
  ent: EntitlementsPayload | null | undefined,
): string | null {
  return ent?.plan?.planType ?? null;
}
