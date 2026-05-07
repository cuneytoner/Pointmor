import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { useTranslation } from "../hooks/useTranslation";
import { formatCount, formatPoints } from "../lib/formatters";
import {
  fetchHqLocationDetail,
  type HqLocationDetailPayload,
} from "../lib/hq-dashboard-api";

export function TenantHqLocationPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { branchId } = useParams<{ branchId: string }>();
  const [data, setData] = useState<HqLocationDetailPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    let c = false;
    setError(false);
    fetchHqLocationDetail(token, branchId, 28)
      .then((d) => {
        if (!c) setData(d);
      })
      .catch(() => {
        if (!c) {
          setError(true);
          setData(null);
        }
      });
    return () => {
      c = true;
    };
  }, [token, branchId]);

  if (!branchId) {
    return (
      <PageShell eyebrow={t("hq.location.eyebrow")} title="" description="">
        <p className="admin-app__card-text">{t("hq.location.missing")}</p>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell eyebrow={t("hq.location.eyebrow")} title={t("hq.location.title")} description="">
        <p className="admin-app__card-text">{error ? t("hq.loadError") : t("tenantLoyalty.common.loading")}</p>
        <Link to="/app/hq" className="admin-secondary-btn">
          {t("hq.location.back")}
        </Link>
      </PageShell>
    );
  }

  const name = data.branch?.name ?? branchId;

  return (
    <PageShell
      eyebrow={t("hq.location.eyebrow")}
      title={name}
      description={t("hq.location.description")}
    >
      <p className="admin-app__card-text" style={{ marginBottom: "1rem" }}>
        <Link to="/app/hq" className="admin-secondary-btn">
          ← {t("hq.location.back")}
        </Link>
      </p>

      <div className="hq-summary-grid">
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.visits")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.metrics.visits, locale)}
          </div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.points")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatPoints(data.metrics.pointsIssued, locale)}
          </div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.kpi.redemptions")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.metrics.redemptions, locale)}
          </div>
        </div>
        <div className="admin-app__card hq-card">
          <div className="hq-card__label">{t("hq.location.activeCampaigns")}</div>
          <div className="hq-card__value hq-card__value--num">
            {formatCount(data.metrics.activeCampaignsAtLocation, locale)}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
