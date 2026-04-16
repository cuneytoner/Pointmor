import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { FORM_CONTROL_CLASS, NUMERIC_COMPACT_CONTROL_CLASS } from "../components/form";
import { useTranslation } from "../hooks/useTranslation";
import {
  deleteMenuCategory,
  deleteMenuItem,
  getMenuCategories,
  getMenuItems,
  postMenuCategory,
  postMenuItem,
  putMenuCategory,
  putMenuItem,
  type MenuCategoryDto,
  type MenuItemDto,
} from "../lib/tenant-menu-api";
import { getStoreSettings } from "../lib/store-settings-api";

function majorFromMinor(n: number): string {
  return (n / 100).toFixed(2);
}

function parseMajorToMinor(s: string): number | null {
  const x = Number(String(s).replace(",", "."));
  if (!Number.isFinite(x) || x < 0) return null;
  return Math.round(x * 100);
}

export function TenantMenuPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const catDlg = useRef<HTMLDialogElement>(null);
  const itemDlg = useRef<HTMLDialogElement>(null);

  const [categories, setCategories] = useState<MenuCategoryDto[] | null>(null);
  const [items, setItems] = useState<MenuItemDto[] | null>(null);
  const [error, setError] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");

  const [catEditing, setCatEditing] = useState<MenuCategoryDto | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catOrder, setCatOrder] = useState("0");
  const [catActive, setCatActive] = useState(true);
  const [savingCat, setSavingCat] = useState(false);

  const [itemEditing, setItemEditing] = useState<MenuItemDto | null>(null);
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("0.00");
  const [itemCurrency, setItemCurrency] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemOrder, setItemOrder] = useState("0");
  const [itemActive, setItemActive] = useState(true);
  const [savingItem, setSavingItem] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setError(false);
    Promise.all([
      getMenuCategories(token),
      getMenuItems(token),
      getStoreSettings(token).catch(() => null),
    ])
      .then(([cats, its, store]) => {
        setCategories(cats);
        setItems(its);
        if (store?.currency) setDefaultCurrency(store.currency);
      })
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openCatCreate = () => {
    setCatEditing(null);
    setCatName("");
    setCatDesc("");
    setCatOrder("0");
    setCatActive(true);
    catDlg.current?.showModal();
  };

  const openCatEdit = (c: MenuCategoryDto) => {
    setCatEditing(c);
    setCatName(c.name);
    setCatDesc(c.description ?? "");
    setCatOrder(String(c.sortOrder));
    setCatActive(c.isActive);
    catDlg.current?.showModal();
  };

  const submitCat = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingCat(true);
    try {
      const body = {
        name: catName.trim(),
        description: catDesc.trim() || null,
        sortOrder: Number(catOrder) || 0,
        isActive: catActive,
      };
      if (catEditing) {
        await putMenuCategory(token, catEditing.id, body);
      } else {
        await postMenuCategory(token, body);
      }
      catDlg.current?.close();
      load();
    } catch {
      /* ignore */
    } finally {
      setSavingCat(false);
    }
  };

  const deactivateCat = async (c: MenuCategoryDto) => {
    if (!token) return;
    if (!window.confirm(`${c.name} — ${t("tenantMenu.deactivate")}?`)) return;
    try {
      await deleteMenuCategory(token, c.id);
      load();
    } catch {
      /* ignore */
    }
  };

  const openItemCreate = () => {
    if (!categories?.length) {
      window.alert(t("tenantMenu.emptyCategories"));
      return;
    }
    const first = categories[0].id;
    setItemEditing(null);
    setItemCategoryId(first);
    setItemName("");
    setItemDesc("");
    setItemPrice("0.00");
    setItemCurrency("");
    setItemImage("");
    setItemOrder("0");
    setItemActive(true);
    itemDlg.current?.showModal();
  };

  const openItemEdit = (it: MenuItemDto) => {
    setItemEditing(it);
    setItemCategoryId(it.categoryId);
    setItemName(it.name);
    setItemDesc(it.description ?? "");
    setItemPrice(majorFromMinor(it.price));
    setItemCurrency(it.currency ?? "");
    setItemImage(it.imageUrl ?? "");
    setItemOrder(String(it.sortOrder));
    setItemActive(it.isActive);
    itemDlg.current?.showModal();
  };

  const submitItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const minor = parseMajorToMinor(itemPrice);
    if (minor === null) return;
    setSavingItem(true);
    try {
      const body = {
        categoryId: itemCategoryId,
        name: itemName.trim(),
        description: itemDesc.trim() || null,
        price: minor,
        currency: itemCurrency.trim() || null,
        imageUrl: itemImage.trim() || null,
        sortOrder: Number(itemOrder) || 0,
        isActive: itemActive,
      };
      if (itemEditing) {
        await putMenuItem(token, itemEditing.id, body);
      } else {
        await postMenuItem(token, body);
      }
      itemDlg.current?.close();
      load();
    } catch {
      /* ignore */
    } finally {
      setSavingItem(false);
    }
  };

  const deactivateItem = async (it: MenuItemDto) => {
    if (!token) return;
    if (!window.confirm(`${it.name} — ${t("tenantMenu.deactivate")}?`)) return;
    try {
      await deleteMenuItem(token, it.id);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <PageShell
      eyebrow={t("tenantMenu.eyebrow")}
      title={t("tenantMenu.title")}
      description={t("tenantMenu.description")}
    >
      {error ? (
        <p className="admin-app__card-text" role="alert">
          {t("tenantMenu.loadError")}
        </p>
      ) : null}

      <div className="admin-app__card admin-app__card--wide">
        <div className="tenant-menu__toolbar">
          <h2 className="admin-app__card-title">{t("tenantMenu.categories")}</h2>
          <button type="button" className="admin-primary-btn" onClick={openCatCreate}>
            {t("tenantMenu.addCategory")}
          </button>
        </div>
        {!categories ? (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        ) : categories.length === 0 ? (
          <p className="admin-app__card-text">{t("tenantMenu.emptyCategories")}</p>
        ) : (
          <table className="tenant-menu__table">
            <thead>
              <tr>
                <th>{t("tenantMenu.name")}</th>
                <th>{t("tenantMenu.sortOrder")}</th>
                <th>{t("tenantMenu.active")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.isActive ? "✓" : "—"}</td>
                  <td className="tenant-menu__actions">
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={() => openCatEdit(c)}
                    >
                      {t("tenantMenu.edit")}
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={() => void deactivateCat(c)}
                    >
                      {t("tenantMenu.deactivate")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <div className="tenant-menu__toolbar">
          <h2 className="admin-app__card-title">{t("tenantMenu.items")}</h2>
          <button type="button" className="admin-primary-btn" onClick={openItemCreate}>
            {t("tenantMenu.addItem")}
          </button>
        </div>
        {!items ? (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="admin-app__card-text">{t("tenantMenu.emptyItems")}</p>
        ) : (
          <table className="tenant-menu__table">
            <thead>
              <tr>
                <th>{t("tenantMenu.name")}</th>
                <th>{t("tenantMenu.category")}</th>
                <th>{t("tenantMenu.price")}</th>
                <th>{t("tenantMenu.sortOrder")}</th>
                <th>{t("tenantMenu.active")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const cat = categories?.find((c) => c.id === it.categoryId);
                return (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{cat?.name ?? it.categoryId}</td>
                    <td>
                      {majorFromMinor(it.price)} {it.currency ?? defaultCurrency}
                    </td>
                    <td>{it.sortOrder}</td>
                    <td>{it.isActive ? "✓" : "—"}</td>
                    <td className="tenant-menu__actions">
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => openItemEdit(it)}
                      >
                        {t("tenantMenu.edit")}
                      </button>
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        onClick={() => void deactivateItem(it)}
                      >
                        {t("tenantMenu.deactivate")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <dialog ref={catDlg} className="loyalty-form-modal">
        <form className="loyalty-form-modal__inner" onSubmit={submitCat}>
          <div className="loyalty-form-modal__header">
            <h2 className="loyalty-form-modal__title">
              {catEditing ? t("tenantMenu.edit") : t("tenantMenu.addCategory")}
            </h2>
          </div>
          <div className="loyalty-form-modal__body">
            <label>
              {t("tenantMenu.name")}
              <input
                required
                className={FORM_CONTROL_CLASS}
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.description")}
              <input
                className={FORM_CONTROL_CLASS}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.sortOrder")}
              <input
                className={NUMERIC_COMPACT_CONTROL_CLASS}
                inputMode="numeric"
                value={catOrder}
                onChange={(e) => setCatOrder(e.target.value)}
              />
            </label>
            <label className="loyalty-form-toggle">
              <input
                type="checkbox"
                checked={catActive}
                onChange={(e) => setCatActive(e.target.checked)}
              />
              <span>{t("tenantMenu.active")}</span>
            </label>
          </div>
          <div className="loyalty-form-modal__footer">
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => catDlg.current?.close()}
            >
              {t("tenantMenu.cancel")}
            </button>
            <button type="submit" className="admin-primary-btn" disabled={savingCat}>
              {catEditing ? t("tenantMenu.save") : t("tenantMenu.create")}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={itemDlg} className="loyalty-form-modal">
        <form className="loyalty-form-modal__inner" onSubmit={submitItem}>
          <div className="loyalty-form-modal__header">
            <h2 className="loyalty-form-modal__title">
              {itemEditing ? t("tenantMenu.edit") : t("tenantMenu.addItem")}
            </h2>
          </div>
          <div className="loyalty-form-modal__body">
            <label>
              {t("tenantMenu.category")}
              <select
                required
                className={FORM_CONTROL_CLASS}
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
              >
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("tenantMenu.name")}
              <input
                required
                className={FORM_CONTROL_CLASS}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.description")}
              <input
                className={FORM_CONTROL_CLASS}
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.price")}
              <input
                required
                className={FORM_CONTROL_CLASS}
                inputMode="decimal"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.currency")}
              <input
                className={FORM_CONTROL_CLASS}
                placeholder={defaultCurrency}
                value={itemCurrency}
                onChange={(e) => setItemCurrency(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.imageUrl")}
              <input
                className={FORM_CONTROL_CLASS}
                value={itemImage}
                onChange={(e) => setItemImage(e.target.value)}
              />
            </label>
            <label>
              {t("tenantMenu.sortOrder")}
              <input
                className={NUMERIC_COMPACT_CONTROL_CLASS}
                inputMode="numeric"
                value={itemOrder}
                onChange={(e) => setItemOrder(e.target.value)}
              />
            </label>
            <label className="loyalty-form-toggle">
              <input
                type="checkbox"
                checked={itemActive}
                onChange={(e) => setItemActive(e.target.checked)}
              />
              <span>{t("tenantMenu.active")}</span>
            </label>
          </div>
          <div className="loyalty-form-modal__footer">
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => itemDlg.current?.close()}
            >
              {t("tenantMenu.cancel")}
            </button>
            <button type="submit" className="admin-primary-btn" disabled={savingItem}>
              {itemEditing ? t("tenantMenu.save") : t("tenantMenu.create")}
            </button>
          </div>
        </form>
      </dialog>
    </PageShell>
  );
}
