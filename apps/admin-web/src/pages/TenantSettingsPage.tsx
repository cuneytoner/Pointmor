import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { PageShell } from "../components/PageShell";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { useAuth } from "../contexts/AuthContext";
import { getStoreSettings, putStoreSettings, type StoreSettingsDto } from "../lib/store-settings-api";

function addressToText(a: unknown): string {
  if (a === null || a === undefined) return "";
  if (typeof a === "string") return a;
  try {
    return JSON.stringify(a, null, 2);
  } catch {
    return "";
  }
}

export function TenantSettingsPage() {
  const { t } = useTranslation();
  const { auth } = useAdminDataContext();
  const { token } = useAuth();
  const slug = auth?.tenant?.slug ?? "";
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedMenu, setCopiedMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<StoreSettingsDto | null>(null);
  const [addressText, setAddressText] = useState("");

  const portalUrl = useMemo(() => {
    if (typeof window === "undefined" || !slug) return "";
    return `${window.location.origin}/c/${encodeURIComponent(slug)}`;
  }, [slug]);

  const menuUrl = useMemo(() => {
    if (typeof window === "undefined" || !slug) return "";
    return `${window.location.origin}/m/${encodeURIComponent(slug)}`;
  }, [slug]);

  const portalQrSrc = useMemo(() => {
    if (!portalUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(portalUrl)}`;
  }, [portalUrl]);

  const menuQrSrc = useMemo(() => {
    if (!menuUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(menuUrl)}`;
  }, [menuUrl]);

  const load = useCallback(() => {
    if (!token?.trim()) return;
    setLoading(true);
    setLoadError(false);
    getStoreSettings(token)
      .then((row) => {
        setForm(row);
        setAddressText(addressToText(row.address));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const copyPortal = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedPortal(true);
      window.setTimeout(() => setCopiedPortal(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyMenu = async () => {
    if (!menuUrl) return;
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopiedMenu(true);
      window.setTimeout(() => setCopiedMenu(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const save = async () => {
    if (!token?.trim() || !form) return;
    setSaving(true);
    try {
      let addressPayload: unknown = null;
      const raw = addressText.trim();
      if (raw === "") {
        addressPayload = null;
      } else {
        try {
          addressPayload = JSON.parse(raw);
        } catch {
          window.alert("Invalid JSON in address field.");
          setSaving(false);
          return;
        }
      }
      const body = {
        storeName: form.storeName,
        logoUrl: form.logoUrl,
        primaryColor: form.primaryColor,
        defaultLanguage: form.defaultLanguage,
        supportedLanguages: form.supportedLanguages,
        currency: form.currency,
        timezone: form.timezone,
        address: addressPayload,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        loyaltyPublicEnabled: form.loyaltyPublicEnabled,
        menuPublicEnabled: form.menuPublicEnabled,
      };
      const next = await putStoreSettings(token, body);
      setForm(next);
      setAddressText(addressToText(next.address));
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      eyebrow={t("tenantSettings.eyebrow")}
      title={t("tenantSettings.title")}
      description={t("tenantSettings.description")}
    >
      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("tenantSettings.store.title")}</h2>
        {loadError ? (
          <p className="admin-app__card-text" role="alert">
            {t("tenantSettings.store.loadError")}
          </p>
        ) : null}
        {loading || !form ? (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        ) : (
          <div className="tenant-store-form">
            <label className="admin-field">
              <span>{t("tenantSettings.store.storeName")}</span>
              <input
                className="admin-input"
                value={form.storeName}
                onChange={(e) => setForm((f) => (f ? { ...f, storeName: e.target.value } : f))}
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.logoUrl")}</span>
              <input
                className="admin-input"
                value={form.logoUrl ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, logoUrl: e.target.value || null } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.primaryColor")}</span>
              <input
                type="color"
                className="admin-input admin-input--color"
                value={form.primaryColor}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, primaryColor: e.target.value } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.defaultLanguage")}</span>
              <input
                className="admin-input"
                value={form.defaultLanguage}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, defaultLanguage: e.target.value } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.supportedLanguages")}</span>
              <input
                className="admin-input"
                value={form.supportedLanguages.join(",")}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          supportedLanguages: e.target.value
                            .split(",")
                            .map((s) => s.trim().toLowerCase())
                            .filter(Boolean),
                        }
                      : f,
                  )
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.currency")}</span>
              <input
                className="admin-input"
                maxLength={3}
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, currency: e.target.value } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.timezone")}</span>
              <input
                className="admin-input"
                value={form.timezone}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, timezone: e.target.value } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.addressJson")}</span>
              <textarea
                className="admin-input admin-input--textarea"
                rows={4}
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.contactPhone")}</span>
              <input
                className="admin-input"
                value={form.contactPhone ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, contactPhone: e.target.value || null } : f))
                }
              />
            </label>
            <label className="admin-field">
              <span>{t("tenantSettings.store.contactEmail")}</span>
              <input
                className="admin-input"
                type="email"
                value={form.contactEmail ?? ""}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, contactEmail: e.target.value || null } : f))
                }
              />
            </label>
            <label className="admin-field admin-field--inline">
              <input
                type="checkbox"
                checked={form.loyaltyPublicEnabled}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, loyaltyPublicEnabled: e.target.checked } : f))
                }
              />
              <span>{t("tenantSettings.store.loyaltyPublic")}</span>
            </label>
            <label className="admin-field admin-field--inline">
              <input
                type="checkbox"
                checked={form.menuPublicEnabled}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, menuPublicEnabled: e.target.checked } : f))
                }
              />
              <span>{t("tenantSettings.store.menuPublic")}</span>
            </label>
            <div className="tenant-store-form__actions">
              <button
                type="button"
                className="admin-primary-btn"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? t("tenantSettings.store.saving") : t("tenantSettings.store.save")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("tenantSettings.portal.title")}</h2>
        <p className="admin-app__card-text">{t("tenantSettings.portal.description")}</p>
        {portalUrl ? (
          <div className="tenant-portal-share">
            <code className="tenant-portal-share__url">{portalUrl}</code>
            <button type="button" className="admin-secondary-btn" onClick={copyPortal}>
              {copiedPortal ? t("tenantSettings.portal.copied") : t("tenantSettings.portal.copy")}
            </button>
            {portalQrSrc ? (
              <div className="tenant-portal-share__qr">
                <img src={portalQrSrc} width={180} height={180} alt="" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        )}
      </div>

      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("tenantSettings.menuQr.title")}</h2>
        <p className="admin-app__card-text">{t("tenantSettings.menuQr.description")}</p>
        {menuUrl ? (
          <div className="tenant-portal-share">
            <code className="tenant-portal-share__url">{menuUrl}</code>
            <button type="button" className="admin-secondary-btn" onClick={copyMenu}>
              {copiedMenu ? t("tenantSettings.menuQr.copied") : t("tenantSettings.menuQr.copy")}
            </button>
            {menuQrSrc ? (
              <div className="tenant-portal-share__qr">
                <img src={menuQrSrc} width={180} height={180} alt="" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        )}
      </div>
    </PageShell>
  );
}
