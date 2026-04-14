import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useLocale } from "../contexts/LocaleContext";
import { useTranslation } from "../hooks/useTranslation";
import { toIntlLocale } from "../lib/locale-intl";
import {
  getCampaigns,
  patchCampaign,
  postCampaign,
  type CampaignDto,
} from "../lib/tenant-loyalty-api";

const TYPES = ["BONUS_POINTS", "SPEND_THRESHOLD_BONUS", "FIRST_VISIT_BONUS"] as const;
const STATUSES = ["draft", "active", "paused", "archived"] as const;

function defaultConfig(type: string): string {
  if (type === "BONUS_POINTS") return '{\n  "points": 10\n}';
  if (type === "SPEND_THRESHOLD_BONUS") {
    return '{\n  "thresholdMinorUnits": 5000,\n  "bonusPoints": 50\n}';
  }
  return '{\n  "bonusPoints": 100\n}';
}

function campaignTypeLabel(ct: string, t: (k: string) => string): string {
  if (ct === "BONUS_POINTS") return t("tenantLoyalty.campaigns.types.BONUS_POINTS");
  if (ct === "SPEND_THRESHOLD_BONUS")
    return t("tenantLoyalty.campaigns.types.SPEND_THRESHOLD_BONUS");
  if (ct === "FIRST_VISIT_BONUS") return t("tenantLoyalty.campaigns.types.FIRST_VISIT_BONUS");
  return ct;
}

function statusLabel(s: string, t: (k: string) => string): string {
  if (s === "draft") return t("tenantLoyalty.campaigns.status.draft");
  if (s === "active") return t("tenantLoyalty.campaigns.status.active");
  if (s === "paused") return t("tenantLoyalty.campaigns.status.paused");
  if (s === "archived") return t("tenantLoyalty.campaigns.status.archived");
  return s;
}

function toIsoFromLocal(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** datetime-local value (YYYY-MM-DDTHH:mm) — basit UTC offset yok */
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TenantCampaignsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const dlg = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<CampaignDto[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<CampaignDto | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("BONUS_POINTS");
  const [status, setStatus] = useState<string>("draft");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [configText, setConfigText] = useState(defaultConfig("BONUS_POINTS"));
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setError(false);
    getCampaigns(token)
      .then(setRows)
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setType("BONUS_POINTS");
    setStatus("draft");
    setStartAt("");
    setEndAt("");
    setConfigText(defaultConfig("BONUS_POINTS"));
    setIsActive(true);
    dlg.current?.showModal();
  };

  const openEdit = (c: CampaignDto) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setType(c.type);
    setStatus(c.status);
    setStartAt(isoToDatetimeLocal(c.startAt));
    setEndAt(isoToDatetimeLocal(c.endAt));
    setConfigText(JSON.stringify(c.config, null, 2));
    setIsActive(c.isActive);
    dlg.current?.showModal();
  };

  const close = () => dlg.current?.close();

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;
    let config: unknown;
    try {
      config = JSON.parse(configText) as unknown;
    } catch {
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      status,
      config,
      isActive,
    };
    const sIso = toIsoFromLocal(startAt);
    const eIso = toIsoFromLocal(endAt);
    body.startAt = sIso;
    body.endAt = eIso;
    setSaving(true);
    try {
      if (editing) {
        await patchCampaign(token, editing.id, body);
      } else {
        await postCampaign(token, body);
      }
      close();
      load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const loading = rows === null && !error;

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(toIntlLocale(locale), {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.campaigns.eyebrow")}
      title={t("tenantLoyalty.campaigns.title")}
      description={t("tenantLoyalty.campaigns.description")}
    >
      <div className="toolbar" style={{ marginBottom: "1rem" }}>
        <button type="button" className="admin-primary-btn" onClick={openCreate}>
          {t("tenantLoyalty.campaigns.add")}
        </button>
      </div>

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error && !rows ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.campaigns.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState title={t("tenantLoyalty.campaigns.empty")} description="" />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLoyalty.campaigns.name")}</th>
                  <th>{t("tenantLoyalty.campaigns.type")}</th>
                  <th>{t("tenantLoyalty.campaigns.statusColumn")}</th>
                  <th>{t("tenantLoyalty.campaigns.period")}</th>
                  <th>{t("tenantLoyalty.campaigns.active")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows?.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <Badge tone="info">{campaignTypeLabel(c.type, t)}</Badge>
                    </td>
                    <td>{statusLabel(c.status, t)}</td>
                    <td className="data-table__muted">
                      {fmt(c.startAt)} → {fmt(c.endAt)}
                    </td>
                    <td>{c.isActive ? t("tenantLoyalty.common.yes") : t("tenantLoyalty.common.no")}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => openEdit(c)}
                      >
                        {t("tenantLoyalty.campaigns.edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <dialog ref={dlg} className="loyalty-modal">
        <form className="loyalty-modal__panel" onSubmit={onSave}>
          <h2 className="page-shell__title" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            {editing ? t("tenantLoyalty.campaigns.edit") : t("tenantLoyalty.campaigns.add")}
          </h2>
          <div className="loyalty-form-stack" style={{ maxWidth: "100%" }}>
            <label>
              {t("tenantLoyalty.campaigns.name")}
              <input
                required
                className="toolbar__search toolbar__search--block"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.rewards.descriptionField")}
              <input
                className="toolbar__search toolbar__search--block"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.campaigns.type")}
              <select
                className="toolbar__select toolbar__search--block"
                value={type}
                onChange={(e) => {
                  const nt = e.target.value;
                  setType(nt);
                  if (!editing) setConfigText(defaultConfig(nt));
                }}
              >
                {TYPES.map((x) => (
                  <option key={x} value={x}>
                    {campaignTypeLabel(x, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tenantLoyalty.campaigns.statusColumn")}
              <select
                className="toolbar__select toolbar__search--block"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((x) => (
                  <option key={x} value={x}>
                    {statusLabel(x, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tenantLoyalty.campaigns.periodStart")}
              <input
                type="datetime-local"
                className="toolbar__search toolbar__search--block"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.campaigns.periodEnd")}
              <input
                type="datetime-local"
                className="toolbar__search toolbar__search--block"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.campaigns.config")}
              <textarea
                className="toolbar__search toolbar__search--block"
                rows={6}
                style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem" }}
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("tenantLoyalty.campaigns.active")}
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="admin-primary-btn" disabled={saving}>
                {t("tenantLoyalty.campaigns.save")}
              </button>
              <button type="button" className="admin-secondary-btn" onClick={close}>
                {t("tenantLoyalty.campaigns.cancel")}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </PageShell>
  );
}
