import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { formatPoints } from "../lib/formatters";
import {
  FORM_FIELD_GRID_FULL_CLASS,
  FormField,
  FormFieldGrid,
  NumberField,
  SelectField,
  TextField,
} from "../components/form";
import {
  getRewards,
  patchReward,
  postReward,
  type RewardDto,
} from "../lib/tenant-loyalty-api";

const REWARD_TYPES = ["FREE_ITEM", "FIXED_DISCOUNT", "PERCENT_DISCOUNT"] as const;
type RewardTypeId = (typeof REWARD_TYPES)[number];

function rewardTypeLabel(rt: string, t: (k: string) => string): string {
  if (rt === "FREE_ITEM") return t("tenantLoyalty.rewards.types.FREE_ITEM");
  if (rt === "FIXED_DISCOUNT") return t("tenantLoyalty.rewards.types.FIXED_DISCOUNT");
  if (rt === "PERCENT_DISCOUNT") return t("tenantLoyalty.rewards.types.PERCENT_DISCOUNT");
  return rt;
}

function defaultsForRewardType(rt: RewardTypeId): { value: string; percentStr: string } {
  switch (rt) {
    case "FREE_ITEM":
      return { value: "0", percentStr: "10" };
    case "FIXED_DISCOUNT":
      return { value: "500", percentStr: "10" };
    case "PERCENT_DISCOUNT":
      return { value: "1000", percentStr: "10" };
    default:
      return { value: "0", percentStr: "10" };
  }
}

function percentToBp(percent: number): number {
  return Math.round(percent * 100);
}

export function TenantRewardsPage() {
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageRewards = hasPermission("rewards.manage");
  const fid = useId();
  const dlg = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<RewardDto[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<RewardDto | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("100");
  const [rewardType, setRewardType] = useState<RewardTypeId>("FREE_ITEM");
  const [value, setValue] = useState("0");
  const [percentStr, setPercentStr] = useState("10");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setError(false);
    getRewards(token, false)
      .then(setRows)
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const applyRewardType = (rt: RewardTypeId, resetValues: boolean) => {
    setRewardType(rt);
    if (resetValues) {
      const d = defaultsForRewardType(rt);
      setValue(d.value);
      setPercentStr(d.percentStr);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPointsCost("100");
    applyRewardType("FREE_ITEM", true);
    setIsActive(true);
    dlg.current?.showModal();
  };

  const openEdit = (r: RewardDto) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setPointsCost(String(r.pointsCost));
    setRewardType(r.rewardType as RewardTypeId);
    setValue(String(r.value));
    setPercentStr(
      r.rewardType === "PERCENT_DISCOUNT"
        ? String(Math.round(r.value / 100))
        : "10",
    );
    setIsActive(r.isActive);
    dlg.current?.showModal();
  };

  const close = () => dlg.current?.close();

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cost = Number(pointsCost);
    if (!name.trim() || !Number.isFinite(cost) || cost <= 0) return;

    let vt = "NONE";
    let val = Math.floor(Number(value));

    if (rewardType === "FREE_ITEM") {
      val = 0;
    } else if (rewardType === "FIXED_DISCOUNT") {
      vt = "MINOR_AMOUNT";
      if (!Number.isFinite(val) || val <= 0) return;
    } else if (rewardType === "PERCENT_DISCOUNT") {
      vt = "PERCENT_BP";
      const p = Number(percentStr);
      if (!Number.isFinite(p) || p < 1 || p > 100) return;
      val = percentToBp(p);
      if (val < 1 || val > 10000) return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        pointsCost: cost,
        rewardType,
        valueType: vt,
        value: val,
        redemptionMethod: "POINTS_ONLY",
        isActive,
      };
      if (editing) {
        await patchReward(token, editing.id, body);
      } else {
        await postReward(token, body);
      }
      close();
      load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: RewardDto) => {
    if (!token) return;
    try {
      await patchReward(token, r.id, { isActive: !r.isActive });
      load();
    } catch {
      setError(true);
    }
  };

  const loading = rows === null && !error;

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.rewards.eyebrow")}
      title={t("tenantLoyalty.rewards.title")}
      description={t("tenantLoyalty.rewards.description")}
    >
      {canManageRewards ? (
        <div className="toolbar" style={{ marginBottom: "1rem" }}>
          <button type="button" className="admin-primary-btn" onClick={openCreate}>
            {t("tenantLoyalty.rewards.add")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error && !rows ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.rewards.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState
          title={t("tenantLoyalty.rewards.empty")}
          description={t("tenantLoyalty.rewards.emptyDescription")}
        />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLoyalty.rewards.name")}</th>
                  <th>{t("tenantLoyalty.rewards.type")}</th>
                  <th className="data-table__num">{t("tenantLoyalty.rewards.pointsCost")}</th>
                  <th>{t("tenantLoyalty.rewards.active")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <Badge tone="neutral">{rewardTypeLabel(r.rewardType, t)}</Badge>
                    </td>
                    <td className="data-table__num">{formatPoints(r.pointsCost, locale)}</td>
                    <td>
                      {canManageRewards ? (
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={() => void toggle(r)}
                        >
                          {r.isActive ? t("tenantLoyalty.common.yes") : t("tenantLoyalty.common.no")}
                        </button>
                      ) : (
                        <span className="data-table__muted">{r.isActive ? t("tenantLoyalty.common.yes") : t("tenantLoyalty.common.no")}</span>
                      )}
                    </td>
                    <td>
                      {canManageRewards ? (
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={() => openEdit(r)}
                        >
                          {t("tenantLoyalty.rewards.edit")}
                        </button>
                      ) : (
                        <span className="data-table__muted">—</span>
                      )}
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
              {editing ? t("tenantLoyalty.rewards.edit") : t("tenantLoyalty.rewards.add")}
            </h2>
          </div>

          <div className="loyalty-form-modal__body">
            <div className="loyalty-form-stack loyalty-form-stack--relaxed">
              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.rewards.sectionBasic")}
                </h3>
                <FormFieldGrid>
                  <FormField
                    id={`${fid}-name`}
                    className={FORM_FIELD_GRID_FULL_CLASS}
                    label={t("tenantLoyalty.rewards.name")}
                    required
                  >
                    <TextField
                      id={`${fid}-name`}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField
                    id={`${fid}-desc`}
                    className={FORM_FIELD_GRID_FULL_CLASS}
                    label={t("tenantLoyalty.rewards.descriptionField")}
                  >
                    <TextField
                      id={`${fid}-desc`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("tenantLoyalty.rewards.descriptionPlaceholder")}
                    />
                  </FormField>
                </FormFieldGrid>
              </div>

              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.rewards.sectionType")}
                </h3>
                <FormFieldGrid>
                  <FormField id={`${fid}-type`} label={t("tenantLoyalty.rewards.type")}>
                    <SelectField
                      id={`${fid}-type`}
                      value={rewardType}
                      onChange={(e) => applyRewardType(e.target.value as RewardTypeId, true)}
                    >
                      {REWARD_TYPES.map((x) => (
                        <option key={x} value={x}>
                          {t(`tenantLoyalty.rewards.types.${x}` as const)}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                  <FormField
                    id={`${fid}-points`}
                    label={t("tenantLoyalty.rewards.pointsCost")}
                    required
                    hint={t("tenantLoyalty.rewards.pointsCostHelp")}
                  >
                    <NumberField
                      id={`${fid}-points`}
                      required
                      inputMode="numeric"
                      value={pointsCost}
                      onChange={(e) => setPointsCost(e.target.value)}
                    />
                  </FormField>
                  <div className={FORM_FIELD_GRID_FULL_CLASS}>
                    <p className="loyalty-form-hint">{t("tenantLoyalty.rewards.typeHint")}</p>
                  </div>

                  {rewardType === "FIXED_DISCOUNT" ? (
                    <FormField
                      id={`${fid}-val`}
                      className={FORM_FIELD_GRID_FULL_CLASS}
                      label={t("tenantLoyalty.rewards.discountAmount")}
                      required
                      hint={t("tenantLoyalty.rewards.minorUnitsHint")}
                    >
                      <NumberField
                        id={`${fid}-val`}
                        required
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    </FormField>
                  ) : null}

                  {rewardType === "PERCENT_DISCOUNT" ? (
                    <FormField
                      id={`${fid}-pct`}
                      className={FORM_FIELD_GRID_FULL_CLASS}
                      label={t("tenantLoyalty.rewards.percentLabel")}
                      required
                      hint={t("tenantLoyalty.rewards.percentHint")}
                    >
                      <NumberField
                        id={`${fid}-pct`}
                        required
                        inputMode="decimal"
                        value={percentStr}
                        onChange={(e) => setPercentStr(e.target.value)}
                      />
                    </FormField>
                  ) : null}
                </FormFieldGrid>
              </div>

              <div className="loyalty-form-section">
                <h3 className="loyalty-form-section__title">
                  {t("tenantLoyalty.rewards.sectionStatus")}
                </h3>
                <label className="loyalty-form-toggle">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>{t("tenantLoyalty.rewards.activeInProgram")}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="loyalty-form-modal__footer">
            <button type="button" className="admin-secondary-btn" onClick={close}>
              {t("tenantLoyalty.rewards.cancel")}
            </button>
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              {t("tenantLoyalty.rewards.save")}
            </button>
          </div>
        </form>
      </dialog>
    </PageShell>
  );
}
