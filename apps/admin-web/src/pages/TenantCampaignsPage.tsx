import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { PageShell } from "../components/PageShell";
import {
  DateTimeLocalField,
  FormField,
  NumberField,
  SelectField,
  TextField,
} from "../components/form";
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
type CampaignTypeId = (typeof TYPES)[number];
const STATUSES_EXTENDED = ["draft", "active", "paused", "archived"] as const;

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

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultsForCampaignType(type: CampaignTypeId): {
  pointsBonus: string;
  thresholdMinor: string;
  thresholdBonusPts: string;
  firstVisitBonus: string;
} {
  switch (type) {
    case "BONUS_POINTS":
      return { pointsBonus: "10", thresholdMinor: "5000", thresholdBonusPts: "50", firstVisitBonus: "100" };
    case "SPEND_THRESHOLD_BONUS":
      return { pointsBonus: "10", thresholdMinor: "5000", thresholdBonusPts: "50", firstVisitBonus: "100" };
    case "FIRST_VISIT_BONUS":
      return { pointsBonus: "10", thresholdMinor: "5000", thresholdBonusPts: "50", firstVisitBonus: "100" };
    default:
      return { pointsBonus: "10", thresholdMinor: "5000", thresholdBonusPts: "50", firstVisitBonus: "100" };
  }
}

function parseConfigFromDto(
  type: string,
  config: unknown,
): {
  pointsBonus: string;
  thresholdMinor: string;
  thresholdBonusPts: string;
  firstVisitBonus: string;
} {
  const base = defaultsForCampaignType(type as CampaignTypeId);
  if (!config || typeof config !== "object" || Array.isArray(config)) return base;
  const c = config as Record<string, unknown>;
  if (type === "BONUS_POINTS" && typeof c.points === "number") {
    return { ...base, pointsBonus: String(Math.floor(c.points)) };
  }
  if (type === "SPEND_THRESHOLD_BONUS") {
    return {
      ...base,
      thresholdMinor:
        typeof c.thresholdMinorUnits === "number" ? String(Math.floor(c.thresholdMinorUnits)) : base.thresholdMinor,
      thresholdBonusPts:
        typeof c.bonusPoints === "number" ? String(Math.floor(c.bonusPoints)) : base.thresholdBonusPts,
    };
  }
  if (type === "FIRST_VISIT_BONUS" && typeof c.bonusPoints === "number") {
    return { ...base, firstVisitBonus: String(Math.floor(c.bonusPoints)) };
  }
  return base;
}

function buildConfig(
  type: CampaignTypeId,
  fields: {
    pointsBonus: string;
    thresholdMinor: string;
    thresholdBonusPts: string;
    firstVisitBonus: string;
  },
): Record<string, number> | null {
  switch (type) {
    case "BONUS_POINTS": {
      const p = Math.floor(Number(fields.pointsBonus));
      if (!Number.isFinite(p) || p <= 0) return null;
      return { points: p };
    }
    case "SPEND_THRESHOLD_BONUS": {
      const th = Math.floor(Number(fields.thresholdMinor));
      const bp = Math.floor(Number(fields.thresholdBonusPts));
      if (!Number.isFinite(th) || th <= 0 || !Number.isFinite(bp) || bp <= 0) return null;
      return { thresholdMinorUnits: th, bonusPoints: bp };
    }
    case "FIRST_VISIT_BONUS": {
      const bp = Math.floor(Number(fields.firstVisitBonus));
      if (!Number.isFinite(bp) || bp <= 0) return null;
      return { bonusPoints: bp };
    }
    default:
      return null;
  }
}

export function TenantCampaignsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { token } = useAuth();
  const { bootstrap } = useAdminDataContext();
  const ent = bootstrap?.entitlements;
  const dlg = useRef<HTMLDialogElement>(null);
  const formFieldId = useId();
  const [rows, setRows] = useState<CampaignDto[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<CampaignDto | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CampaignTypeId>("BONUS_POINTS");
  const [status, setStatus] = useState<string>("draft");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [pointsBonus, setPointsBonus] = useState("10");
  const [thresholdMinor, setThresholdMinor] = useState("5000");
  const [thresholdBonusPts, setThresholdBonusPts] = useState("50");
  const [firstVisitBonus, setFirstVisitBonus] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fieldBag = { pointsBonus, thresholdMinor, thresholdBonusPts, firstVisitBonus };

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

  const applyCampaignType = (nt: CampaignTypeId, resetFields: boolean) => {
    setType(nt);
    if (resetFields) {
      const d = defaultsForCampaignType(nt);
      setPointsBonus(d.pointsBonus);
      setThresholdMinor(d.thresholdMinor);
      setThresholdBonusPts(d.thresholdBonusPts);
      setFirstVisitBonus(d.firstVisitBonus);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    applyCampaignType("BONUS_POINTS", true);
    setStatus("draft");
    setStartAt("");
    setEndAt("");
    setIsActive(true);
    dlg.current?.showModal();
  };

  const openEdit = (c: CampaignDto) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setType(c.type as CampaignTypeId);
    setStatus(c.status);
    setStartAt(isoToDatetimeLocal(c.startAt));
    setEndAt(isoToDatetimeLocal(c.endAt));
    const parsed = parseConfigFromDto(c.type, c.config);
    setPointsBonus(parsed.pointsBonus);
    setThresholdMinor(parsed.thresholdMinor);
    setThresholdBonusPts(parsed.thresholdBonusPts);
    setFirstVisitBonus(parsed.firstVisitBonus);
    setIsActive(c.isActive);
    dlg.current?.showModal();
  };

  const close = () => dlg.current?.close();

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) return;
    const config = buildConfig(type, fieldBag);
    if (!config) return;
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      status,
      config,
      isActive,
    };
    body.startAt = toIsoFromLocal(startAt);
    body.endAt = toIsoFromLocal(endAt);
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

  const statusOptions = editing
    ? STATUSES_EXTENDED
    : (["draft", "active"] as const);

  if (!ent) {
    return (
      <PageShell
        eyebrow={t("tenantLoyalty.campaigns.eyebrow")}
        title={t("tenantLoyalty.campaigns.title")}
        description=""
      >
        <p className="admin-app__card-text">{t("plan.gate.loadingEntitlements")}</p>
      </PageShell>
    );
  }

  if (!ent.features.includes("campaigns")) {
    return (
      <PageShell
        eyebrow={t("tenantLoyalty.campaigns.eyebrow")}
        title={t("plan.gate.campaignsTitle")}
        description={t("plan.gate.campaignsLead")}
      >
        <div className="feature-plan-gate">
          <p className="admin-app__card-text">{t("plan.gate.campaignsBody")}</p>
          <Link to="/app/billing" className="admin-primary-btn">
            {t("plan.gate.ctaBilling")}
          </Link>
        </div>
      </PageShell>
    );
  }

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
        <EmptyState
          title={t("tenantLoyalty.campaigns.empty")}
          description={t("tenantLoyalty.campaigns.emptyDescription")}
        />
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
        <form className="loyalty-modal__panel loyalty-modal__panel--form" onSubmit={onSave}>
          <div className="loyalty-modal__panel-head">
            <h2 className="loyalty-form-modal__title">
              {editing ? t("tenantLoyalty.campaigns.edit") : t("tenantLoyalty.campaigns.add")}
            </h2>
          </div>

          <div className="loyalty-form-modal__body">
            <div className="loyalty-form-stack loyalty-form-stack--relaxed">
              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.campaigns.sectionBasic")}
                </h3>
                <FormField id={`${formFieldId}-name`} label={t("tenantLoyalty.campaigns.name")} required>
                  <TextField
                    id={`${formFieldId}-name`}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id={`${formFieldId}-description`} label={t("tenantLoyalty.rewards.descriptionField")}>
                  <TextField
                    id={`${formFieldId}-description`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("tenantLoyalty.campaigns.descriptionPlaceholder")}
                  />
                </FormField>
              </div>

              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.campaigns.sectionType")}
                </h3>
                <FormField id={`${formFieldId}-type`} label={t("tenantLoyalty.campaigns.type")}>
                  <SelectField
                    id={`${formFieldId}-type`}
                    value={type}
                    onChange={(e) => applyCampaignType(e.target.value as CampaignTypeId, true)}
                  >
                    {TYPES.map((x) => (
                      <option key={x} value={x}>
                        {campaignTypeLabel(x, t)}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <p className="loyalty-form-hint">{t("tenantLoyalty.campaigns.typeHint")}</p>

                {type === "BONUS_POINTS" ? (
                  <FormField
                    id={`${formFieldId}-points-bonus`}
                    label={t("tenantLoyalty.campaigns.fieldBonusPoints")}
                    required
                  >
                    <NumberField
                      id={`${formFieldId}-points-bonus`}
                      required
                      inputMode="numeric"
                      value={pointsBonus}
                      onChange={(e) => setPointsBonus(e.target.value)}
                    />
                  </FormField>
                ) : null}

                {type === "SPEND_THRESHOLD_BONUS" ? (
                  <>
                    <FormField
                      id={`${formFieldId}-threshold-minor`}
                      label={t("tenantLoyalty.campaigns.fieldMinSpend")}
                      required
                    >
                      <NumberField
                        id={`${formFieldId}-threshold-minor`}
                        required
                        inputMode="numeric"
                        value={thresholdMinor}
                        onChange={(e) => setThresholdMinor(e.target.value)}
                      />
                      <span className="loyalty-form-hint loyalty-form-hint--inline">
                        {t("tenantLoyalty.campaigns.minorUnitsHint")}
                      </span>
                    </FormField>
                    <FormField
                      id={`${formFieldId}-threshold-bonus`}
                      label={t("tenantLoyalty.campaigns.fieldThresholdBonus")}
                      required
                    >
                      <NumberField
                        id={`${formFieldId}-threshold-bonus`}
                        required
                        inputMode="numeric"
                        value={thresholdBonusPts}
                        onChange={(e) => setThresholdBonusPts(e.target.value)}
                      />
                    </FormField>
                  </>
                ) : null}

                {type === "FIRST_VISIT_BONUS" ? (
                  <FormField
                    id={`${formFieldId}-first-visit`}
                    label={t("tenantLoyalty.campaigns.fieldFirstVisitBonus")}
                    required
                  >
                    <NumberField
                      id={`${formFieldId}-first-visit`}
                      required
                      inputMode="numeric"
                      value={firstVisitBonus}
                      onChange={(e) => setFirstVisitBonus(e.target.value)}
                    />
                  </FormField>
                ) : null}
              </div>

              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.campaigns.sectionSchedule")}
                </h3>
                <div className="loyalty-schedule-grid">
                  <FormField id={`${formFieldId}-start`} label={t("tenantLoyalty.campaigns.periodStart")}>
                    <DateTimeLocalField
                      id={`${formFieldId}-start`}
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      aria-describedby={`${formFieldId}-schedule-hint`}
                    />
                  </FormField>
                  <FormField id={`${formFieldId}-end`} label={t("tenantLoyalty.campaigns.periodEnd")}>
                    <DateTimeLocalField
                      id={`${formFieldId}-end`}
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      aria-describedby={`${formFieldId}-schedule-hint`}
                    />
                  </FormField>
                </div>
                <p className="loyalty-form-hint" id={`${formFieldId}-schedule-hint`}>
                  {t("tenantLoyalty.campaigns.scheduleHint")}
                </p>
              </div>

              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.campaigns.sectionStatus")}
                </h3>
                <FormField id={`${formFieldId}-status`} label={t("tenantLoyalty.campaigns.workflowStatus")}>
                  <SelectField
                    id={`${formFieldId}-status`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    aria-describedby={`${formFieldId}-status-hint`}
                  >
                    {statusOptions.map((x) => (
                      <option key={x} value={x}>
                        {statusLabel(x, t)}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <p className="loyalty-form-hint" id={`${formFieldId}-status-hint`}>
                  {t("tenantLoyalty.campaigns.statusHint")}
                </p>
                <label className="loyalty-form-toggle" htmlFor={`${formFieldId}-active`}>
                  <input
                    id={`${formFieldId}-active`}
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>{t("tenantLoyalty.campaigns.activeInProgram")}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="loyalty-form-modal__footer">
            <button type="button" className="admin-secondary-btn" onClick={close}>
              {t("tenantLoyalty.campaigns.cancel")}
            </button>
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              {t("tenantLoyalty.campaigns.save")}
            </button>
          </div>
        </form>
      </dialog>
    </PageShell>
  );
}
