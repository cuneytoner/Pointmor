import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import { FormField, NumberField, SelectField, TextField } from "../components/form";
import { useTranslation } from "../hooks/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { formatCurrencyFromMinor } from "../lib/currency-format";
import { toIntlLocale } from "../lib/locale-intl";
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
  const { t, locale } = useTranslation();
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageMenu = hasPermission("menu.manage");
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
  const intlLocale = toIntlLocale(locale);

  const load = useCallback(() => {
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
    if (!canManageMenu) return;
    setCatEditing(null);
    setCatName("");
    setCatDesc("");
    setCatOrder("0");
    setCatActive(true);
    catDlg.current?.showModal();
  };

  const openCatEdit = (c: MenuCategoryDto) => {
    if (!canManageMenu) return;
    setCatEditing(c);
    setCatName(c.name);
    setCatDesc(c.description ?? "");
    setCatOrder(String(c.sortOrder));
    setCatActive(c.isActive);
    catDlg.current?.showModal();
  };

  const submitCat = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageMenu) return;
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
    if (!canManageMenu) return;
    if (!window.confirm(`${c.name} — ${t("tenantMenu.deactivate")}?`)) return;
    try {
      await deleteMenuCategory(token, c.id);
      load();
    } catch {
      /* ignore */
    }
  };

  const openItemCreate = () => {
    if (!canManageMenu) return;
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
    if (!canManageMenu) return;
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
    if (!canManageMenu) return;
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
    if (!canManageMenu) return;
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
          {canManageMenu ? (
            <button type="button" className="admin-primary-btn" onClick={openCatCreate}>
              {t("tenantMenu.addCategory")}
            </button>
          ) : null}
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
                    {canManageMenu ? (
                      <>
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
                      </>
                    ) : (
                      <span className="data-table__muted">—</span>
                    )}
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
          {canManageMenu ? (
            <button type="button" className="admin-primary-btn" onClick={openItemCreate}>
              {t("tenantMenu.addItem")}
            </button>
          ) : null}
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
                      {formatCurrencyFromMinor(it.price, it.currency ?? defaultCurrency, intlLocale)}
                    </td>
                    <td>{it.sortOrder}</td>
                    <td>{it.isActive ? "✓" : "—"}</td>
                    <td className="tenant-menu__actions">
                      {canManageMenu ? (
                        <>
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
                        </>
                      ) : (
                        <span className="data-table__muted">—</span>
                      )}
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
            <div className="loyalty-form-stack loyalty-form-stack--relaxed">
              <div className="loyalty-form-section">
                <FormField id="menu-cat-name" label={t("tenantMenu.name")} required>
                  <TextField
                    id="menu-cat-name"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-cat-desc" label={t("tenantMenu.description")}>
                  <TextField
                    id="menu-cat-desc"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-cat-order" label={t("tenantMenu.sortOrder")}>
                  <NumberField
                    id="menu-cat-order"
                    inputMode="numeric"
                    value={catOrder}
                    onChange={(e) => setCatOrder(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="loyalty-form-section">
                <label className="loyalty-form-toggle">
                  <input
                    type="checkbox"
                    checked={catActive}
                    onChange={(e) => setCatActive(e.target.checked)}
                  />
                  <span>{t("tenantMenu.active")}</span>
                </label>
              </div>
            </div>
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
            <div className="loyalty-form-stack loyalty-form-stack--relaxed">
              <div className="loyalty-form-section">
                <FormField id="menu-item-category" label={t("tenantMenu.category")} required>
                  <SelectField
                    id="menu-item-category"
                    required
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                  >
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField id="menu-item-name" label={t("tenantMenu.name")} required>
                  <TextField
                    id="menu-item-name"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-item-desc" label={t("tenantMenu.description")}>
                  <TextField
                    id="menu-item-desc"
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-item-price" label={t("tenantMenu.price")} required>
                  <TextField
                    id="menu-item-price"
                    required
                    inputMode="decimal"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </FormField>
                <FormField id="menu-item-currency" label={t("tenantMenu.currency")}>
                  <TextField
                    id="menu-item-currency"
                    placeholder={defaultCurrency}
                    value={itemCurrency}
                    onChange={(e) => setItemCurrency(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-item-image" label={t("tenantMenu.imageUrl")}>
                  <TextField
                    id="menu-item-image"
                    value={itemImage}
                    onChange={(e) => setItemImage(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="menu-item-order" label={t("tenantMenu.sortOrder")}>
                  <NumberField
                    id="menu-item-order"
                    inputMode="numeric"
                    value={itemOrder}
                    onChange={(e) => setItemOrder(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="loyalty-form-section">
                <label className="loyalty-form-toggle">
                  <input
                    type="checkbox"
                    checked={itemActive}
                    onChange={(e) => setItemActive(e.target.checked)}
                  />
                  <span>{t("tenantMenu.active")}</span>
                </label>
              </div>
            </div>
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
