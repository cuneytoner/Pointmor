import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageShell } from "../components/PageShell";
import {
  FORM_FIELD_GRID_FULL_CLASS,
  FormField,
  FormFieldGrid,
  FormSection,
  SelectField,
  TextAreaField,
  TextField,
} from "../components/form";
import { useTranslation } from "../hooks/useTranslation";
import {
  getMessageTemplates,
  getMessagingSettings,
  putMessagingSettings,
  putTemplateOverride,
  type MessageTemplateRow,
  type MessagingSettingsDto,
} from "../lib/messaging-api";

export function TenantMessagingPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const dlg = useRef<HTMLDialogElement>(null);
  const [settings, setSettings] = useState<MessagingSettingsDto | null>(null);
  const [templates, setTemplates] = useState<MessageTemplateRow[] | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MessageTemplateRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setError(false);
    Promise.all([getMessagingSettings(token), getMessageTemplates(token)])
      .then(([s, tpl]) => {
        setSettings(s);
        setTemplates(tpl.items);
      })
      .catch(() => setError(true));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !settings) return;
    setSaving(true);
    try {
      const next = await putMessagingSettings(token, {
        smsEnabled: settings.smsEnabled,
        whatsappEnabled: settings.whatsappEnabled,
        defaultChannel: settings.defaultChannel,
        allowFallbackChannel: settings.allowFallbackChannel,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        timezone: settings.timezone,
        requireVerifiedForSession: settings.requireVerifiedForSession,
      });
      setSettings(next);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: MessageTemplateRow) => {
    setEditing(row);
    setEditContent(row.override?.content ?? row.defaultContent);
    setEditEnabled(row.override?.isEnabled ?? true);
    dlg.current?.showModal();
  };

  const saveOverride = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;
    const c = editContent.trim();
    if (!c) return;
    setSaving(true);
    try {
      await putTemplateOverride(token, {
        templateKey: editing.key,
        channel: editing.channel,
        content: c,
        isEnabled: editEnabled,
      });
      dlg.current?.close();
      load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const loading = settings === null && !error;

  return (
    <PageShell
      eyebrow={t("tenantLoyalty.messaging.eyebrow")}
      title={t("tenantLoyalty.messaging.title")}
      description={t("tenantLoyalty.messaging.description")}
    >
      {loading ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
      ) : error && !settings ? (
        <p className="admin-app__card-text">{t("tenantLoyalty.messaging.loadError")}</p>
      ) : settings ? (
        <>
          <form
            className="admin-app__card admin-app__card--wide"
            onSubmit={onSaveSettings}
            style={{ marginBottom: "1.25rem" }}
          >
            <h2 className="admin-app__card-title">{t("tenantLoyalty.messaging.sectionSettings")}</h2>
            <div className="loyalty-form-stack loyalty-form-stack--relaxed">
              <FormSection title={t("tenantLoyalty.messaging.sectionChannels")}>
                <FormFieldGrid>
                  <div className="min-w-0">
                    <label className="loyalty-form-toggle">
                      <input
                        type="checkbox"
                        checked={settings.smsEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, smsEnabled: e.target.checked })
                        }
                      />
                      <span>{t("tenantLoyalty.messaging.smsEnabled")}</span>
                    </label>
                  </div>
                  <div className="min-w-0">
                    <label className="loyalty-form-toggle">
                      <input
                        type="checkbox"
                        checked={settings.whatsappEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, whatsappEnabled: e.target.checked })
                        }
                      />
                      <span>{t("tenantLoyalty.messaging.whatsappEnabled")}</span>
                    </label>
                  </div>
                  <div className={FORM_FIELD_GRID_FULL_CLASS}>
                    <label className="loyalty-form-toggle">
                      <input
                        type="checkbox"
                        checked={settings.allowFallbackChannel}
                        onChange={(e) =>
                          setSettings({ ...settings, allowFallbackChannel: e.target.checked })
                        }
                      />
                      <span>{t("tenantLoyalty.messaging.allowFallback")}</span>
                    </label>
                  </div>
                </FormFieldGrid>
              </FormSection>

              <FormSection title={t("tenantLoyalty.messaging.sectionRouting")}>
                <FormFieldGrid>
                  <FormField id="messaging-default-channel" label={t("tenantLoyalty.messaging.defaultChannel")}>
                    <SelectField
                      id="messaging-default-channel"
                      value={settings.defaultChannel}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultChannel: e.target.value as MessagingSettingsDto["defaultChannel"],
                        })
                      }
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </SelectField>
                  </FormField>
                  <FormField id="messaging-timezone" label={t("tenantLoyalty.messaging.timezone")}>
                    <TextField
                      id="messaging-timezone"
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      placeholder="Europe/Istanbul"
                      autoComplete="off"
                    />
                  </FormField>
                </FormFieldGrid>
              </FormSection>

              <FormSection title={t("tenantLoyalty.messaging.sectionQuietHours")}>
                <FormFieldGrid>
                  <FormField id="messaging-quiet-start" label={t("tenantLoyalty.messaging.quietStart")}>
                    <TextField
                      id="messaging-quiet-start"
                      value={settings.quietHoursStart ?? ""}
                      onChange={(e) =>
                        setSettings({ ...settings, quietHoursStart: e.target.value || null })
                      }
                      placeholder="22:00"
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField id="messaging-quiet-end" label={t("tenantLoyalty.messaging.quietEnd")}>
                    <TextField
                      id="messaging-quiet-end"
                      value={settings.quietHoursEnd ?? ""}
                      onChange={(e) =>
                        setSettings({ ...settings, quietHoursEnd: e.target.value || null })
                      }
                      placeholder="08:00"
                      autoComplete="off"
                    />
                  </FormField>
                </FormFieldGrid>
              </FormSection>

              <FormSection title={t("tenantLoyalty.messaging.sectionSignIn")}>
                <label className="loyalty-form-toggle">
                  <input
                    type="checkbox"
                    checked={settings.requireVerifiedForSession}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        requireVerifiedForSession: e.target.checked,
                      })
                    }
                  />
                  <span>{t("tenantLoyalty.messaging.requireVerified")}</span>
                </label>
              </FormSection>
            </div>
            <div className="toolbar" style={{ marginTop: "1rem" }}>
              <button type="submit" className="admin-primary-btn" disabled={saving}>
                {saving ? t("tenantLoyalty.messaging.saving") : t("tenantLoyalty.messaging.save")}
              </button>
            </div>
          </form>

          <div className="admin-app__card admin-app__card--wide">
            <h2 className="admin-app__card-title">{t("tenantLoyalty.messaging.sectionTemplates")}</h2>
            <p className="admin-app__card-text" style={{ marginBottom: "1rem" }}>
              {t("tenantLoyalty.messaging.templatesLead")}
            </p>
            {templates === null ? (
              <p className="admin-app__card-text">{t("tenantLoyalty.common.loading")}</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("tenantLoyalty.messaging.colKey")}</th>
                      <th>{t("tenantLoyalty.messaging.colChannel")}</th>
                      <th>{t("tenantLoyalty.messaging.colVars")}</th>
                      <th>{t("tenantLoyalty.messaging.colOverride")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((row) => (
                      <tr key={`${row.key}-${row.channel}`}>
                        <td>
                          <code>{row.key}</code>
                        </td>
                        <td>{row.channel.toUpperCase()}</td>
                        <td className="data-table__muted">
                          {row.variables.length ? row.variables.join(", ") : "—"}
                        </td>
                        <td>
                          {row.override
                            ? row.override.isEnabled
                              ? t("tenantLoyalty.messaging.overrideYes")
                              : t("tenantLoyalty.messaging.overrideDisabled")
                            : t("tenantLoyalty.messaging.overrideNo")}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={() => openEdit(row)}
                          >
                            {t("tenantLoyalty.messaging.edit")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <dialog ref={dlg} className="loyalty-modal">
            <form className="loyalty-modal__panel loyalty-modal__panel--form" onSubmit={saveOverride}>
              <div className="loyalty-modal__panel-head">
                <h2 className="loyalty-form-modal__title">
                  {editing
                    ? `${editing.key} · ${editing.channel.toUpperCase()}`
                    : t("tenantLoyalty.messaging.edit")}
                </h2>
              </div>
              <div className="loyalty-form-modal__body">
                <p className="admin-app__card-text loyalty-form-modal__lead">
                  {t("tenantLoyalty.messaging.editHint")}
                </p>
                <div className="loyalty-form-stack loyalty-form-stack--relaxed">
                  <FormSection title={t("tenantLoyalty.messaging.modalSectionOverride")}>
                    <label className="loyalty-form-toggle">
                      <input
                        type="checkbox"
                        checked={editEnabled}
                        onChange={(e) => setEditEnabled(e.target.checked)}
                      />
                      <span>{t("tenantLoyalty.messaging.overrideActive")}</span>
                    </label>
                  </FormSection>
                  <FormSection title={t("tenantLoyalty.messaging.content")}>
                    <TextAreaField
                      id="messaging-template-content"
                      rows={5}
                      sizeVariant="large"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      required
                      aria-label={t("tenantLoyalty.messaging.content")}
                    />
                    {editing && editContent.length > 160 && editing.channel === "sms" ? (
                      <p className="loyalty-form-hint" role="status">
                        {t("tenantLoyalty.messaging.smsLengthWarning")}
                      </p>
                    ) : null}
                  </FormSection>
                </div>
              </div>
              <div className="loyalty-form-modal__footer">
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => dlg.current?.close()}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="admin-primary-btn" disabled={saving}>
                  {t("tenantLoyalty.messaging.saveOverride")}
                </button>
              </div>
            </form>
          </dialog>
        </>
      ) : null}
    </PageShell>
  );
}
