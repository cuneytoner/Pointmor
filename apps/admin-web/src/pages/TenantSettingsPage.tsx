import { useTranslation } from "../hooks/useTranslation";
import { PageShell } from "../components/PageShell";

export function TenantSettingsPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      eyebrow={t("tenantSettings.eyebrow")}
      title={t("tenantSettings.title")}
      description={t("tenantSettings.description")}
    />
  );
}
