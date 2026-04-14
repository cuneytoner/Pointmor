import { useMemo, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { PageShell } from "../components/PageShell";
import { useAdminDataContext } from "../contexts/AdminDataContext";

export function TenantSettingsPage() {
  const { t } = useTranslation();
  const { auth } = useAdminDataContext();
  const slug = auth?.tenant?.slug ?? "";
  const [copied, setCopied] = useState(false);

  const portalUrl = useMemo(() => {
    if (typeof window === "undefined" || !slug) return "";
    return `${window.location.origin}/c/${encodeURIComponent(slug)}`;
  }, [slug]);

  const qrSrc = useMemo(() => {
    if (!portalUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(portalUrl)}`;
  }, [portalUrl]);

  const copy = async () => {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <PageShell
      eyebrow={t("tenantSettings.eyebrow")}
      title={t("tenantSettings.title")}
      description={t("tenantSettings.description")}
    >
      <div className="admin-app__card admin-app__card--wide">
        <h2 className="admin-app__card-title">{t("tenantSettings.portal.title")}</h2>
        <p className="admin-app__card-text">{t("tenantSettings.portal.description")}</p>
        {portalUrl ? (
          <div className="tenant-portal-share">
            <code className="tenant-portal-share__url">{portalUrl}</code>
            <button type="button" className="admin-secondary-btn" onClick={copy}>
              {copied ? t("tenantSettings.portal.copied") : t("tenantSettings.portal.copy")}
            </button>
            {qrSrc ? (
              <div className="tenant-portal-share__qr">
                <img src={qrSrc} width={180} height={180} alt="" />
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
