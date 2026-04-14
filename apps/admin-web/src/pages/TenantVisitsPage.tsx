import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { useTranslation } from "../hooks/useTranslation";
import {
  getCustomers,
  postCustomer,
  postVisit,
  type CustomerWithBalance,
  type VisitRecordResult,
} from "../lib/tenant-loyalty-api";

export function TenantVisitsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithBalance[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [last, setLast] = useState<VisitRecordResult | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [qcName, setQcName] = useState("");
  const [qcPhone, setQcPhone] = useState("");

  const refreshCustomers = useCallback(() => {
    if (!token) return;
    getCustomers(token)
      .then(setCustomers)
      .catch(() => setLoadError(true));
  }, [token]);

  useEffect(() => {
    if (!token?.trim()) return;
    setLoadError(false);
    refreshCustomers();
  }, [token, refreshCustomers]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s),
    );
  }, [customers, q]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!token) return;
    const n = Number(amount);
    if (!customerId || !Number.isFinite(n) || n <= 0) {
      setFormError(t("tenantLoyalty.visits.validation"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await postVisit(token, { customerId, amount: n });
      setLast(res);
      setAmount("");
    } catch {
      setFormError(t("tenantLoyalty.visits.loadError"));
    } finally {
      setSubmitting(false);
    }
  };

  const onQuickCreate = async () => {
    if (!token || !qcName.trim() || !qcPhone.trim()) return;
    setSubmitting(true);
    try {
      const c = await postCustomer(token, { name: qcName.trim(), phone: qcPhone.trim() });
      await refreshCustomers();
      setCustomerId(c.id);
      setQcName("");
      setQcPhone("");
      setQuickOpen(false);
    } catch {
      setFormError(t("tenantLoyalty.visits.loadError"));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = customers === null && !loadError;

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.visits.eyebrow")}
      title={t("tenantLoyalty.visits.title")}
      description={t("tenantLoyalty.visits.description")}
    >
      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : loadError ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.visits.loadError")}</p>
      ) : (
        <form className="admin-app__card admin-app__card--wide" onSubmit={onSubmit}>
          <div className="loyalty-form-stack">
            <label>
              {t("tenantLoyalty.visits.customer")}
              <input
                type="search"
                className="toolbar__search toolbar__search--block"
                placeholder={t("tenantLoyalty.visits.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.visits.customer")}
              <select
                className="toolbar__select toolbar__search--block"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">{t("tenantLoyalty.visits.none")}</option>
                {filtered.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => setQuickOpen((v) => !v)}
            >
              {t("tenantLoyalty.visits.quickCreate")}
            </button>
            {quickOpen ? (
              <div
                className="admin-app__card"
                style={{ padding: "1rem", background: "rgba(15,23,42,0.02)" }}
              >
                <p className="admin-app__card-title">{t("tenantLoyalty.visits.quickCreate")}</p>
                <div className="loyalty-form-stack">
                  <label>
                    {t("tenantLoyalty.visits.qcName")}
                    <input
                      className="toolbar__search toolbar__search--block"
                      value={qcName}
                      onChange={(e) => setQcName(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("tenantLoyalty.visits.qcPhone")}
                    <input
                      className="toolbar__search toolbar__search--block"
                      value={qcPhone}
                      onChange={(e) => setQcPhone(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-primary-btn"
                    disabled={submitting}
                    onClick={() => void onQuickCreate()}
                  >
                    {t("tenantLoyalty.visits.qcSubmit")}
                  </button>
                </div>
              </div>
            ) : null}
            <label>
              {t("tenantLoyalty.visits.amount")}
              <input
                className="toolbar__search toolbar__search--block"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
              />
            </label>
            {formError ? (
              <p className="admin-app__card-text" style={{ color: "#b91c1c" }}>
                {formError}
              </p>
            ) : null}
            <button type="submit" className="admin-primary-btn" disabled={submitting}>
              {t("tenantLoyalty.visits.submit")}
            </button>
          </div>
        </form>
      )}

      {last ? (
        <div className="admin-app__card admin-app__card--wide" style={{ marginTop: "1.25rem" }}>
          <p className="admin-app__card-title">{t("tenantLoyalty.visits.resultTitle")}</p>
          <div className="metric-grid metric-grid--3">
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantLoyalty.visits.base")}</div>
              <div className="metric-card__value">{last.basePoints}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantLoyalty.visits.bonus")}</div>
              <div className="metric-card__value">{last.bonusPoints}</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">{t("tenantLoyalty.visits.total")}</div>
              <div className="metric-card__value">{last.totalPointsAwarded}</div>
            </div>
          </div>
          {last.appliedCampaigns.length > 0 ? (
            <div style={{ marginTop: "1rem" }}>
              <p className="admin-app__card-text">{t("tenantLoyalty.visits.campaigns")}</p>
              <ul className="admin-app__card-text">
                {last.appliedCampaigns.map((a) => (
                  <li key={a.campaignId}>
                    {a.name}{" "}
                    <Badge tone="info">{a.type}</Badge> +{a.pointsAwarded}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
