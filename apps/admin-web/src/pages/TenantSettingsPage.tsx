import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { PageShell } from "../components/PageShell";
import {
  FORM_CONTROL_CLASS,
  FORM_FIELD_GRID_FULL_CLASS,
  FormField,
  FormFieldGrid,
  FormSection,
  TextAreaField,
  TextField,
} from "../components/form";
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
          window.alert(t("tenantSettings.store.addressInvalidJson"));
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
      {loading ? (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        </div>
      ) : loadError || !form ? (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text" role="alert">
            {t("tenantSettings.store.loadError")}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.storeBranding")}</h2>
            <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
              <FormFieldGrid>
                <FormField id="ts-store-name" className={FORM_FIELD_GRID_FULL_CLASS} label={t("tenantSettings.store.storeName")}>
                  <TextField
                    id="ts-store-name"
                    value={form.storeName}
                    onChange={(e) => setForm((f) => (f ? { ...f, storeName: e.target.value } : f))}
                    autoComplete="organization"
                  />
                </FormField>
                <FormField id="ts-logo" label={t("tenantSettings.store.logoUrl")}>
                  <TextField
                    id="ts-logo"
                    value={form.logoUrl ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, logoUrl: e.target.value || null } : f))}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="ts-color" label={t("tenantSettings.store.primaryColor")}>
                  <input
                    id="ts-color"
                    type="color"
                    className={`${FORM_CONTROL_CLASS} h-10 max-w-[5.5rem] cursor-pointer p-1`}
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => (f ? { ...f, primaryColor: e.target.value } : f))}
                  />
                </FormField>
              </FormFieldGrid>
            </div>
          </div>

          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.localization")}</h2>
            <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
              <FormFieldGrid>
                <FormField id="ts-lang" label={t("tenantSettings.store.defaultLanguage")}>
                  <TextField
                    id="ts-lang"
                    value={form.defaultLanguage}
                    onChange={(e) => setForm((f) => (f ? { ...f, defaultLanguage: e.target.value } : f))}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="ts-currency" label={t("tenantSettings.store.currency")}>
                  <TextField
                    id="ts-currency"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value } : f))}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="ts-tz" label={t("tenantSettings.store.timezone")}>
                  <TextField
                    id="ts-tz"
                    value={form.timezone}
                    onChange={(e) => setForm((f) => (f ? { ...f, timezone: e.target.value } : f))}
                    autoComplete="off"
                  />
                </FormField>
                <FormField id="ts-phone" label={t("tenantSettings.store.contactPhone")}>
                  <TextField
                    id="ts-phone"
                    value={form.contactPhone ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, contactPhone: e.target.value || null } : f))}
                    autoComplete="tel"
                  />
                </FormField>
                <FormField id="ts-email" label={t("tenantSettings.store.contactEmail")}>
                  <TextField
                    id="ts-email"
                    type="email"
                    value={form.contactEmail ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, contactEmail: e.target.value || null } : f))}
                    autoComplete="email"
                  />
                </FormField>
                <FormField
                  id="ts-supported"
                  className={FORM_FIELD_GRID_FULL_CLASS}
                  label={t("tenantSettings.store.supportedLanguages")}
                >
                  <TextField
                    id="ts-supported"
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
                    autoComplete="off"
                  />
                </FormField>
                <FormField
                  id="ts-address"
                  className={FORM_FIELD_GRID_FULL_CLASS}
                  label={t("tenantSettings.store.addressStructured")}
                  hint={t("tenantSettings.store.addressStructuredHint")}
                >
                  <TextAreaField
                    id="ts-address"
                    rows={4}
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                  />
                </FormField>
              </FormFieldGrid>
            </div>
          </div>

          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.publicAccess")}</h2>
            <p className="admin-app__card-text">{t("tenantSettings.publicAccessLead")}</p>
            <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
              <FormFieldGrid>
                <div className={`${FORM_FIELD_GRID_FULL_CLASS} flex flex-col gap-3 sm:flex-row sm:flex-wrap`}>
                  <label className="loyalty-form-toggle">
                    <input
                      type="checkbox"
                      checked={form.loyaltyPublicEnabled}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, loyaltyPublicEnabled: e.target.checked } : f))
                      }
                    />
                    <span>{t("tenantSettings.store.loyaltyPublic")}</span>
                  </label>
                  <label className="loyalty-form-toggle">
                    <input
                      type="checkbox"
                      checked={form.menuPublicEnabled}
                      onChange={(e) => setForm((f) => (f ? { ...f, menuPublicEnabled: e.target.checked } : f))}
                    />
                    <span>{t("tenantSettings.store.menuPublic")}</span>
                  </label>
                </div>
              </FormFieldGrid>

              <FormSection title={t("tenantSettings.portal.title")}>
                <p className="admin-app__card-text loyalty-form-hint">{t("tenantSettings.portal.description")}</p>
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
              </FormSection>

              <FormSection title={t("tenantSettings.menuQr.title")}>
                <p className="admin-app__card-text loyalty-form-hint">{t("tenantSettings.menuQr.description")}</p>
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
              </FormSection>

              <div className="tenant-store-form__actions">
                <button type="button" className="admin-primary-btn" disabled={saving} onClick={() => void save()}>
                  {saving ? t("tenantSettings.store.saving") : t("tenantSettings.store.save")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
