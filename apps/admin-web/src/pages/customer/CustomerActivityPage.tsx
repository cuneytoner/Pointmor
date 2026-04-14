import { useMemo, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useLocale } from "../../contexts/LocaleContext";
import { toIntlLocale } from "../../lib/locale-intl";
import { useCustomerPwa } from "../../customer-pwa/CustomerPwaContext";

type Filter = "all" | "earned" | "redeemed";

export function CustomerActivityPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useCustomerPwa();
  const [filter, setFilter] = useState<Filter>("all");
  if (!data) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(toIntlLocale(locale), {
      dateStyle: "short",
      timeStyle: "short",
    });

  const rows = useMemo(() => {
    type Row = { id: string; label: string; points: number; at: string; kind: "earn" | "redeem" };
    const out: Row[] = [];
    for (const v of data.recentVisits) {
      out.push({
        id: `visit-${v.id}`,
        label: t("customerPortal.activityVisit"),
        points: v.pointsEarned,
        at: v.createdAt,
        kind: "earn",
      });
    }
    for (const r of data.recentRedemptions) {
      out.push({
        id: `redeem-${r.id}`,
        label: r.reward.name,
        points: -r.pointsSpent,
        at: r.createdAt,
        kind: "redeem",
      });
    }
    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    if (filter === "earned") return out.filter((x) => x.kind === "earn");
    if (filter === "redeemed") return out.filter((x) => x.kind === "redeem");
    return out;
  }, [data.recentVisits, data.recentRedemptions, filter, t]);

  return (
    <div className="customer-pwa__page">
      <h1 className="customer-pwa__page-title">{t("customerPortal.activityTitle")}</h1>
      <div className="customer-pwa__filters" role="tablist" aria-label={t("customerPortal.activityFilterAria")}>
        {(
          [
            ["all", "customerPortal.filterAll"],
            ["earned", "customerPortal.filterEarned"],
            ["redeemed", "customerPortal.filterRedeemed"],
          ] as const
        ).map(([k, key]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filter === k}
            className={`customer-pwa__filter ${filter === k ? "customer-pwa__filter--on" : ""}`}
            onClick={() => setFilter(k)}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <ul className="customer-pwa__activity-list">
        {rows.length === 0 ? (
          <li className="customer-pwa__muted">{t("customerPortal.activityEmpty")}</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="customer-pwa__activity-row">
              <div>
                <div className="customer-pwa__activity-label">{row.label}</div>
                <div className="customer-pwa__activity-when">{fmt(row.at)}</div>
              </div>
              <div
                className={
                  row.points >= 0 ? "customer-pwa__activity-pts--pos" : "customer-pwa__activity-pts--neg"
                }
              >
                {row.points > 0 ? "+" : ""}
                {row.points}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
