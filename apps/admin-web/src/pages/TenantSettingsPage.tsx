import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/Badge";
import {
  FORM_CONTROL_CLASS,
  FORM_FIELD_GRID_FULL_CLASS,
  FormField,
  FormFieldGrid,
  FormSection,
  SelectField,
  TextField,
} from "../components/form";
import { useAdminDataContext } from "../contexts/AdminDataContext";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../contexts/AuthContext";
import { getStoreSettings, putStoreSettings, type StoreSettingsDto } from "../lib/store-settings-api";
import {
  getTenantRetentionSettings,
  putTenantRetentionSettings,
  type RetentionFieldLimit,
  type TenantRetentionPutBody,
  type TenantRetentionSettingsDto,
} from "../lib/tenant-retention-api";
import { canAccessLoyaltySurface } from "../lib/tenant-module-access";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "tr", label: "Türkçe" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
] as const;

const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "TRY"] as const;

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Istanbul", label: "Istanbul (Europe/Istanbul)" },
  { value: "Europe/Berlin", label: "Berlin (Europe/Berlin)" },
  { value: "Europe/London", label: "London (Europe/London)" },
  { value: "Europe/Paris", label: "Paris (Europe/Paris)" },
  { value: "America/New_York", label: "New York (America/New_York)" },
  { value: "America/Los_Angeles", label: "Los Angeles (America/Los_Angeles)" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "Türkiye", label: "Türkiye" },
  { value: "Germany", label: "Germany" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "France", label: "France" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Netherlands", label: "Netherlands" },
] as const;

type AddressDraft = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  passthrough: Record<string, unknown>;
};

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  passthrough: {},
};

type GeneralSettingsDraft = {
  form: StoreSettingsDto;
  addressDraft: AddressDraft;
};

function RetentionDaysControl(props: {
  limit: RetentionFieldLimit;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const { limit, value, onChange, disabled } = props;
  if (limit.kind === "fixed") {
    return (
      <TextField readOnly value={String(limit.value)} onChange={() => {}} disabled={disabled} />
    );
  }
  if (limit.kind === "enum") {
    return (
      <select
        className={FORM_CONTROL_CLASS}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {limit.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="number"
      className={FORM_CONTROL_CLASS}
      min={limit.min}
      max={limit.max}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(Math.floor(n));
      }}
    />
  );
}

function orderSupportedLanguages(values: string[]): string[] {
  const normalized = new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const ordered = LANGUAGE_OPTIONS.map((option) => option.value).filter((value) =>
    normalized.has(value),
  );
  const custom = Array.from(normalized).filter(
    (value) => !LANGUAGE_OPTIONS.some((option) => option.value === value),
  );
  return [...ordered, ...custom];
}

function readAddressString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function addressToDraft(address: unknown): AddressDraft {
  if (!address) return { ...EMPTY_ADDRESS_DRAFT };
  if (typeof address === "string") return { ...EMPTY_ADDRESS_DRAFT, line1: address };
  if (typeof address !== "object" || Array.isArray(address)) return { ...EMPTY_ADDRESS_DRAFT };

  const record = address as Record<string, unknown>;
  const passthrough = { ...record };
  for (const key of [
    "line1",
    "addressLine1",
    "street",
    "line2",
    "addressLine2",
    "lines",
    "city",
    "locality",
    "region",
    "state",
    "province",
    "postalCode",
    "postal_code",
    "zip",
    "country",
    "countryCode",
  ]) {
    delete passthrough[key];
  }
  const lines = Array.isArray(record.lines)
    ? record.lines.filter((value): value is string => typeof value === "string")
    : [];

  return {
    line1: readAddressString(record, ["line1", "addressLine1", "street"]) || lines[0] || "",
    line2: readAddressString(record, ["line2", "addressLine2"]) || lines[1] || "",
    city: readAddressString(record, ["city", "locality"]),
    region: readAddressString(record, ["region", "state", "province"]),
    postalCode: readAddressString(record, ["postalCode", "postal_code", "zip"]),
    country: readAddressString(record, ["country", "countryCode"]),
    passthrough,
  };
}

function addressDraftToPayload(draft: AddressDraft): Record<string, unknown> | null {
  const out: Record<string, unknown> = {
    ...draft.passthrough,
    line1: draft.line1.trim(),
    line2: draft.line2.trim(),
    city: draft.city.trim(),
    region: draft.region.trim(),
    postalCode: draft.postalCode.trim(),
    country: draft.country.trim(),
  };
  const entries = Object.entries(out).filter(([, value]) => value !== "");
  if (entries.length === 0) return null;
  return Object.fromEntries(entries);
}

function buildStoreSettingsPayload(form: StoreSettingsDto, addressDraft: AddressDraft) {
  return {
    storeName: form.storeName,
    logoUrl: form.logoUrl,
    primaryColor: form.primaryColor,
    defaultLanguage: form.defaultLanguage,
    supportedLanguages: form.supportedLanguages,
    currency: form.currency,
    timezone: form.timezone,
    address: addressDraftToPayload(addressDraft),
    contactPhone: form.contactPhone?.trim() || null,
    contactEmail: form.contactEmail?.trim() || null,
    loyaltyPublicEnabled: form.loyaltyPublicEnabled,
    menuPublicEnabled: form.menuPublicEnabled,
  };
}

function stableJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function generalDraftStorageKey(slug: string): string {
  return `pointmor:tenant-general-settings-draft:${slug}`;
}

function readGeneralDraft(slug: string): GeneralSettingsDraft | null {
  if (typeof window === "undefined" || !slug) return null;
  try {
    const raw = window.sessionStorage.getItem(generalDraftStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeneralSettingsDraft;
    if (!parsed.form || !parsed.addressDraft) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGeneralDraft(slug: string, draft: GeneralSettingsDraft): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    window.sessionStorage.setItem(generalDraftStorageKey(slug), JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function clearGeneralDraft(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    window.sessionStorage.removeItem(generalDraftStorageKey(slug));
  } catch {
    /* ignore */
  }
}

function isValidEmail(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export type TenantSettingsPageProps = {
  /** Workspace Administration layout içinde üst başlık gizlenir */
  embedded?: boolean;
};

export function TenantSettingsPage({ embedded }: TenantSettingsPageProps = {}) {
  const { t } = useTranslation();
  const { auth, bootstrap } = useAdminDataContext();
  const complianceLevel = bootstrap?.entitlements?.compliance?.level ?? "none";
  const { token } = useAuth();
  const { hasPermission } = usePermissions();
  const canSaveSettings = hasPermission("settings.manage");
  const loyaltyActive = canAccessLoyaltySurface(auth, bootstrap);
  const slug = auth?.tenant?.slug ?? "";
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedMenu, setCopiedMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<StoreSettingsDto | null>(null);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
  const [savedGeneralSnapshot, setSavedGeneralSnapshot] = useState("");
  const [generalSaveMessage, setGeneralSaveMessage] = useState<"saved" | "error" | null>(null);
  const [retention, setRetention] = useState<TenantRetentionSettingsDto | null>(null);
  const [retentionDraft, setRetentionDraft] = useState<TenantRetentionPutBody | null>(null);
  const [retentionLoadError, setRetentionLoadError] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);

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
    setRetentionLoadError(false);
    void Promise.allSettled([
      getStoreSettings(token).then((row) => {
        const serverAddressDraft = addressToDraft(row.address);
        const serverSnapshot = stableJson(buildStoreSettingsPayload(row, serverAddressDraft));
        const storedDraft = readGeneralDraft(slug);
        setForm(storedDraft?.form ?? row);
        setAddressDraft(storedDraft?.addressDraft ?? serverAddressDraft);
        setSavedGeneralSnapshot(serverSnapshot);
        setGeneralSaveMessage(null);
      }),
      getTenantRetentionSettings(token).then((r) => {
        setRetention(r);
        setRetentionDraft({
          operationalAuditDays: r.operationalAuditDays,
          exportAuditDays: r.exportAuditDays,
          messagingDays: r.messagingDays,
          anomalyDays: r.anomalyDays,
        });
      }),
    ]).then((results) => {
      if (results[0].status === "rejected") setLoadError(true);
      if (results[1].status === "rejected") setRetentionLoadError(true);
      setLoading(false);
    });
  }, [slug, token]);

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
    if (!token?.trim() || !form || !canSaveSettings) return;
    setSaving(true);
    setGeneralSaveMessage(null);
    try {
      const body = buildStoreSettingsPayload(form, addressDraft);
      const next = await putStoreSettings(token, body);
      const nextAddressDraft = addressToDraft(next.address);
      setForm(next);
      setAddressDraft(nextAddressDraft);
      setSavedGeneralSnapshot(stableJson(buildStoreSettingsPayload(next, nextAddressDraft)));
      clearGeneralDraft(slug);
      setGeneralSaveMessage("saved");
    } catch {
      setGeneralSaveMessage("error");
    } finally {
      setSaving(false);
    }
  };

  const currentGeneralSnapshot =
    form ? stableJson(buildStoreSettingsPayload(form, addressDraft)) : "";
  const hasUnsavedGeneralSettings =
    Boolean(form && savedGeneralSnapshot && currentGeneralSnapshot !== savedGeneralSnapshot);
  const contactEmailInvalid = Boolean(form && !isValidEmail(form.contactEmail));

  useEffect(() => {
    if (hasUnsavedGeneralSettings && generalSaveMessage) {
      setGeneralSaveMessage(null);
    }
  }, [generalSaveMessage, hasUnsavedGeneralSettings]);

  useEffect(() => {
    if (!form || !savedGeneralSnapshot) return;
    if (hasUnsavedGeneralSettings) {
      writeGeneralDraft(slug, { form, addressDraft });
    } else {
      clearGeneralDraft(slug);
    }
  }, [addressDraft, form, hasUnsavedGeneralSettings, savedGeneralSnapshot, slug]);

  const canEditRetention =
    Boolean(retention?.canCustomize && canSaveSettings && retentionDraft);
  const saveRetention = async () => {
    if (!token?.trim() || !retentionDraft || !canEditRetention) return;
    setRetentionSaving(true);
    try {
      const next = await putTenantRetentionSettings(token, retentionDraft);
      setRetention(next);
      setRetentionDraft({
        operationalAuditDays: next.operationalAuditDays,
        exportAuditDays: next.exportAuditDays,
        messagingDays: next.messagingDays,
        anomalyDays: next.anomalyDays,
      });
    } catch {
      /* ignore */
    } finally {
      setRetentionSaving(false);
    }
  };

  const body = (
    <>
      {loading ? (
        <div className="admin-app__card admin-app__card--wide">
          <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
        </div>
      ) : (
        <>
          {loadError || !form ? (
            <div className="admin-app__card admin-app__card--wide">
              <p className="admin-app__card-text" role="alert">
                {t("tenantSettings.store.loadError")}
              </p>
            </div>
          ) : (
            <>
          <div className="admin-app__card admin-app__card--wide">
            <div className="card-head">
              <div>
                <h2 className="admin-app__card-title">{t("tenantSettings.section.organizationIdentity")}</h2>
                <p className="admin-app__card-text data-table__muted">
                  {t("tenantSettings.section.organizationIdentityLead")}
                </p>
              </div>
              {hasUnsavedGeneralSettings ? (
                <Badge tone="warning">{t("tenantSettings.store.unsavedGeneral")}</Badge>
              ) : null}
            </div>
            <fieldset
              disabled={!canSaveSettings}
              className="min-w-0 border-0 p-0 [&:disabled]:opacity-60"
            >
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
            </fieldset>
            <div className="tenant-store-form__actions mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <button
                type="button"
                className="admin-primary-btn"
                disabled={saving || !canSaveSettings || !hasUnsavedGeneralSettings}
                onClick={() => void save()}
              >
                {saving ? t("tenantSettings.store.saving") : t("tenantSettings.store.saveGeneral")}
              </button>
            </div>
          </div>

          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.regionalSettings")}</h2>
            <p className="admin-app__card-text data-table__muted">
              {t("tenantSettings.section.regionalSettingsLead")}
            </p>
            <fieldset
              disabled={!canSaveSettings}
              className="min-w-0 border-0 p-0 [&:disabled]:opacity-60"
            >
            <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
              <FormFieldGrid>
                <FormField
                  id="ts-lang"
                  label={t("tenantSettings.store.defaultLanguage")}
                  hint={t("tenantSettings.store.defaultLanguageHint")}
                >
                  <SelectField
                    id="ts-lang"
                    value={form.defaultLanguage}
                    onChange={(e) => setForm((f) => (f ? { ...f, defaultLanguage: e.target.value } : f))}
                  >
                    {LANGUAGE_OPTIONS.some((option) => option.value === form.defaultLanguage) ? null : (
                      <option value={form.defaultLanguage}>
                        {`${form.defaultLanguage} (${t("tenantSettings.store.unsupportedOption")})`}
                      </option>
                    )}
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {`${option.value} - ${option.label}`}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField
                  id="ts-currency"
                  label={t("tenantSettings.store.currency")}
                  hint={t("tenantSettings.store.currencyHint")}
                >
                  <SelectField
                    id="ts-currency"
                    value={form.currency}
                    onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value } : f))}
                  >
                    {CURRENCY_OPTIONS.some((code) => code === form.currency) ? null : (
                      <option value={form.currency}>
                        {`${form.currency} (${t("tenantSettings.store.unsupportedOption")})`}
                      </option>
                    )}
                    {CURRENCY_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField id="ts-tz" label={t("tenantSettings.store.timezone")}>
                  <SelectField
                    id="ts-tz"
                    value={form.timezone}
                    onChange={(e) => setForm((f) => (f ? { ...f, timezone: e.target.value } : f))}
                  >
                    {form.timezone &&
                    !TIMEZONE_OPTIONS.some((option) => option.value === form.timezone) ? (
                      <option value={form.timezone}>
                        {`${t("tenantSettings.store.customOption")}: ${form.timezone}`}
                      </option>
                    ) : null}
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField
                  id="ts-supported"
                  className={FORM_FIELD_GRID_FULL_CLASS}
                  label={t("tenantSettings.store.supportedLanguages")}
                  hint={t("tenantSettings.store.supportedLanguagesHint")}
                >
                  <div id="ts-supported" className="chip-row" role="group">
                    {LANGUAGE_OPTIONS.map((option) => {
                      const checked = form.supportedLanguages.includes(option.value);
                      const disabled = checked && form.supportedLanguages.length <= 1;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={checked ? "admin-primary-btn" : "admin-secondary-btn"}
                          aria-pressed={checked}
                          disabled={disabled}
                          onClick={() =>
                            setForm((f) => {
                              if (!f) return f;
                              const current = f.supportedLanguages;
                              const next = checked
                                ? current.filter((value) => value !== option.value)
                                : [...current, option.value];
                              return {
                                ...f,
                                supportedLanguages: orderSupportedLanguages(
                                  next.length > 0 ? next : current,
                                ),
                              };
                            })
                          }
                        >
                          {`${option.value} - ${option.label}`}
                        </button>
                      );
                    })}
                    {form.supportedLanguages
                      .filter(
                        (value) => !LANGUAGE_OPTIONS.some((option) => option.value === value),
                      )
                      .map((value) => (
                        <Badge key={value} tone="warning">
                          {`${value} (${t("tenantSettings.store.unsupportedOption")})`}
                        </Badge>
                      ))}
                  </div>
                </FormField>
                <div className={`${FORM_FIELD_GRID_FULL_CLASS} mt-2 border-t border-neutral-200 pt-5 dark:border-neutral-800`}>
                  <h3 className="loyalty-form-section__title">
                    {t("tenantSettings.section.contactAddress")}
                  </h3>
                  <p className="admin-app__card-text data-table__muted">
                    {t("tenantSettings.section.contactAddressLead")}
                  </p>
                </div>
                <FormField id="ts-phone" label={t("tenantSettings.store.contactPhone")}>
                  <TextField
                    id="ts-phone"
                    type="tel"
                    value={form.contactPhone ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, contactPhone: e.target.value || null } : f))}
                    placeholder={t("tenantSettings.store.phonePlaceholder")}
                    autoComplete="tel"
                  />
                </FormField>
                <FormField
                  id="ts-email"
                  label={t("tenantSettings.store.contactEmail")}
                  error={contactEmailInvalid ? t("tenantSettings.store.emailInvalid") : undefined}
                >
                  <TextField
                    id="ts-email"
                    type="email"
                    value={form.contactEmail ?? ""}
                    onChange={(e) => setForm((f) => (f ? { ...f, contactEmail: e.target.value || null } : f))}
                    placeholder={t("tenantSettings.store.emailPlaceholder")}
                    aria-invalid={contactEmailInvalid}
                    autoComplete="email"
                  />
                </FormField>
                <FormField
                  id="ts-address-line1"
                  className={FORM_FIELD_GRID_FULL_CLASS}
                  label={t("tenantSettings.store.addressLine1")}
                  hint={t("tenantSettings.store.addressHint")}
                >
                  <TextField
                    id="ts-address-line1"
                    value={addressDraft.line1}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, line1: e.target.value }))
                    }
                    autoComplete="address-line1"
                  />
                </FormField>
                <FormField id="ts-address-line2" label={t("tenantSettings.store.addressLine2")}>
                  <TextField
                    id="ts-address-line2"
                    value={addressDraft.line2}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, line2: e.target.value }))
                    }
                    autoComplete="address-line2"
                  />
                </FormField>
                <FormField id="ts-address-city" label={t("tenantSettings.store.addressCity")}>
                  <TextField
                    id="ts-address-city"
                    value={addressDraft.city}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, city: e.target.value }))
                    }
                    autoComplete="address-level2"
                  />
                </FormField>
                <FormField id="ts-address-region" label={t("tenantSettings.store.addressRegion")}>
                  <TextField
                    id="ts-address-region"
                    value={addressDraft.region}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, region: e.target.value }))
                    }
                    autoComplete="address-level1"
                  />
                </FormField>
                <FormField id="ts-address-postal" label={t("tenantSettings.store.addressPostalCode")}>
                  <TextField
                    id="ts-address-postal"
                    value={addressDraft.postalCode}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, postalCode: e.target.value }))
                    }
                    autoComplete="postal-code"
                  />
                </FormField>
                <FormField id="ts-address-country" label={t("tenantSettings.store.addressCountry")}>
                  <SelectField
                    id="ts-address-country"
                    value={addressDraft.country}
                    onChange={(e) =>
                      setAddressDraft((draft) => ({ ...draft, country: e.target.value }))
                    }
                  >
                    {addressDraft.country &&
                    !COUNTRY_OPTIONS.some((option) => option.value === addressDraft.country) ? (
                      <option value={addressDraft.country}>
                        {`${t("tenantSettings.store.customOption")}: ${addressDraft.country}`}
                      </option>
                    ) : null}
                    <option value="">{t("tenantSettings.store.countryEmptyOption")}</option>
                    {COUNTRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </FormFieldGrid>
            </div>
            </fieldset>
            {generalSaveMessage ? (
              <p
                className="admin-app__card-text mt-4"
                role={generalSaveMessage === "error" ? "alert" : "status"}
              >
                {generalSaveMessage === "saved"
                  ? t("tenantSettings.store.generalSaved")
                  : t("tenantSettings.store.generalSaveError")}
              </p>
            ) : null}
            {hasUnsavedGeneralSettings ? (
              <p className="admin-app__card-text data-table__muted mt-4">
                {t("tenantSettings.store.unsavedGeneral")}
              </p>
            ) : null}
            <div className="tenant-store-form__actions mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <button
                type="button"
                className="admin-primary-btn"
                disabled={saving || !canSaveSettings || !hasUnsavedGeneralSettings}
                onClick={() => void save()}
              >
                {saving ? t("tenantSettings.store.saving") : t("tenantSettings.store.saveGeneral")}
              </button>
            </div>
          </div>

            </>
          )}

          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.dataGovernance")}</h2>
            <p className="admin-app__card-text">{t("tenantSettings.retention.lead")}</p>
            {complianceLevel !== "full" ? (
              <p className="admin-app__card-text data-table__muted">
                {t("tenantSettings.retention.complianceHintShort")}
                {complianceLevel === "none" ? (
                  <>
                    {" "}
                    <Link to="/app/admin/billing" className="text-primary-600 underline hover:no-underline">
                      {t("compliancePack.ctaPlans")}
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
            {retentionLoadError ? (
              <p className="admin-app__card-text" role="alert">
                {t("tenantSettings.retention.loadError")}
              </p>
            ) : retention && retentionDraft ? (
              <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
                {!retention.canCustomize ? (
                  <p className="admin-app__card-text">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {t("tenantSettings.retention.upgradeCta")}{" "}
                    </span>
                    <Link to="/app/admin/billing" className="text-primary-600 underline hover:no-underline">
                      {t("tenantSettings.retention.upgradeLink")}
                    </Link>
                  </p>
                ) : null}
                <fieldset
                  disabled={!canEditRetention}
                  className="min-w-0 border-0 p-0 [&:disabled]:opacity-60"
                >
                  <FormFieldGrid>
                    <FormField
                      id="ts-ret-op"
                      label={t("tenantSettings.retention.operationalAudit")}
                      hint={t("tenantSettings.retention.daysHint")}
                    >
                      <RetentionDaysControl
                        limit={retention.limits.operationalAudit}
                        value={retentionDraft.operationalAuditDays}
                        onChange={(n) =>
                          setRetentionDraft((d) => (d ? { ...d, operationalAuditDays: n } : d))
                        }
                        disabled={!canEditRetention}
                      />
                    </FormField>
                    <FormField
                      id="ts-ret-ex"
                      label={t("tenantSettings.retention.exportAudit")}
                      hint={t("tenantSettings.retention.daysHint")}
                    >
                      <RetentionDaysControl
                        limit={retention.limits.exportAudit}
                        value={retentionDraft.exportAuditDays}
                        onChange={(n) => setRetentionDraft((d) => (d ? { ...d, exportAuditDays: n } : d))}
                        disabled={!canEditRetention}
                      />
                    </FormField>
                    <FormField
                      id="ts-ret-msg"
                      label={t("tenantSettings.retention.messaging")}
                      hint={t("tenantSettings.retention.daysHint")}
                    >
                      <RetentionDaysControl
                        limit={retention.limits.messaging}
                        value={retentionDraft.messagingDays}
                        onChange={(n) => setRetentionDraft((d) => (d ? { ...d, messagingDays: n } : d))}
                        disabled={!canEditRetention}
                      />
                    </FormField>
                    <FormField
                      id="ts-ret-anom"
                      label={t("tenantSettings.retention.anomaly")}
                      hint={t("tenantSettings.retention.daysHint")}
                    >
                      <RetentionDaysControl
                        limit={retention.limits.anomaly}
                        value={retentionDraft.anomalyDays}
                        onChange={(n) => setRetentionDraft((d) => (d ? { ...d, anomalyDays: n } : d))}
                        disabled={!canEditRetention}
                      />
                    </FormField>
                  </FormFieldGrid>
                </fieldset>
                {canEditRetention ? (
                  <div className="tenant-store-form__actions mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <button
                      type="button"
                      className="admin-primary-btn"
                      disabled={retentionSaving}
                      onClick={() => void saveRetention()}
                    >
                      {retentionSaving ? t("tenantSettings.retention.saving") : t("tenantSettings.retention.save")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {!loadError && form && loyaltyActive ? (
          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantSettings.section.publicVisibility")}</h2>
            <p className="admin-app__card-text">{t("tenantSettings.publicAccessLead")}</p>
            <div className="loyalty-form-stack loyalty-form-stack--relaxed tenant-store-form">
              <fieldset
                disabled={!canSaveSettings}
                className="min-w-0 border-0 p-0 [&:disabled]:opacity-60"
              >
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
              </fieldset>

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

              <div className="tenant-store-form__actions border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <button
                  type="button"
                  className="admin-primary-btn"
                  disabled={saving || !canSaveSettings || !hasUnsavedGeneralSettings}
                  onClick={() => void save()}
                >
                  {saving ? t("tenantSettings.store.saving") : t("tenantSettings.store.savePublicVisibility")}
                </button>
              </div>
            </div>
          </div>
          ) : null}
          {!loadError && form && !loyaltyActive ? (
            <div className="admin-app__card admin-app__card--wide">
              <h2 className="admin-app__card-title">{t("tenantSettings.section.publicVisibility")}</h2>
              <p className="admin-app__card-text">
                {t("tenantSettings.publicVisibilityUnavailable")}
              </p>
            </div>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return <PageShell embedded>{body}</PageShell>;
  }

  return (
    <PageShell
      eyebrow={t("tenantSettings.eyebrow")}
      title={t("tenantSettings.title")}
      description={t("tenantSettings.description")}
    >
      {body}
    </PageShell>
  );
}
