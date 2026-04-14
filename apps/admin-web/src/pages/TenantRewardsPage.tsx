import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useTranslation } from "../hooks/useTranslation";
import {
  getRewards,
  patchReward,
  postReward,
  type RewardDto,
} from "../lib/tenant-loyalty-api";

const REWARD_TYPES = ["FREE_ITEM", "FIXED_DISCOUNT", "PERCENT_DISCOUNT"] as const;
const VALUE_TYPES = ["NONE", "MINOR_AMOUNT", "PERCENT_BP"] as const;

function rewardTypeLabel(
  rt: string,
  t: (k: string) => string,
): string {
  if (rt === "FREE_ITEM") return t("tenantLoyalty.rewards.types.FREE_ITEM");
  if (rt === "FIXED_DISCOUNT") return t("tenantLoyalty.rewards.types.FIXED_DISCOUNT");
  if (rt === "PERCENT_DISCOUNT") return t("tenantLoyalty.rewards.types.PERCENT_DISCOUNT");
  return rt;
}

export function TenantRewardsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const dlg = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<RewardDto[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<RewardDto | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [rewardType, setRewardType] = useState<string>("FREE_ITEM");
  const [valueType, setValueType] = useState<string>("NONE");
  const [value, setValue] = useState("0");
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

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPointsCost("");
    setRewardType("FREE_ITEM");
    setValueType("NONE");
    setValue("0");
    setIsActive(true);
    dlg.current?.showModal();
  };

  const openEdit = (r: RewardDto) => {
    setEditing(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setPointsCost(String(r.pointsCost));
    setRewardType(r.rewardType);
    setValueType(r.valueType);
    setValue(String(r.value));
    setIsActive(r.isActive);
    dlg.current?.showModal();
  };

  const close = () => dlg.current?.close();

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cost = Number(pointsCost);
    const val = Number(value);
    if (!name.trim() || !Number.isFinite(cost) || cost <= 0) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        pointsCost: cost,
        rewardType,
        valueType,
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
      <div className="toolbar" style={{ marginBottom: "1rem" }}>
        <button type="button" className="admin-primary-btn" onClick={openCreate}>
          {t("tenantLoyalty.rewards.add")}
        </button>
      </div>

      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error && !rows ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.rewards.loadError")}</p>
      ) : rows?.length === 0 ? (
        <EmptyState title={t("tenantLoyalty.rewards.empty")} description="" />
      ) : (
        <div className="admin-app__card admin-app__card--wide">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("tenantLoyalty.rewards.name")}</th>
                  <th>{t("tenantLoyalty.rewards.type")}</th>
                  <th>{t("tenantLoyalty.rewards.pointsCost")}</th>
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
                    <td>{r.pointsCost}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => void toggle(r)}
                      >
                        {r.isActive ? t("tenantLoyalty.common.yes") : t("tenantLoyalty.common.no")}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => openEdit(r)}
                      >
                        {t("tenantLoyalty.rewards.edit")}
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
            {editing ? t("tenantLoyalty.rewards.edit") : t("tenantLoyalty.rewards.add")}
          </h2>
          <div className="loyalty-form-stack">
            <label>
              {t("tenantLoyalty.rewards.name")}
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
              {t("tenantLoyalty.rewards.pointsCost")}
              <input
                required
                className="toolbar__search toolbar__search--block"
                inputMode="numeric"
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
              />
            </label>
            <label>
              {t("tenantLoyalty.rewards.type")}
              <select
                className="toolbar__select toolbar__search--block"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
              >
                {REWARD_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {t(`tenantLoyalty.rewards.types.${x}` as "tenantLoyalty.rewards.types.FREE_ITEM")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tenantLoyalty.rewards.valueType")}
              <select
                className="toolbar__select toolbar__search--block"
                value={valueType}
                onChange={(e) => setValueType(e.target.value)}
              >
                {VALUE_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tenantLoyalty.rewards.valueNumeric")}
              <input
                className="toolbar__search toolbar__search--block"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("tenantLoyalty.rewards.active")}
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="admin-primary-btn" disabled={saving}>
                {t("tenantLoyalty.rewards.save")}
              </button>
              <button type="button" className="admin-secondary-btn" onClick={close}>
                {t("tenantLoyalty.rewards.cancel")}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </PageShell>
  );
}
