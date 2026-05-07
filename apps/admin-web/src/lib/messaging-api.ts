import { buildAuthHeaders, getApiBaseUrl, type ApiAuthToken } from "./api-base";

export type MessagingSettingsDto = {
  tenantId: string;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  defaultChannel: string;
  allowFallbackChannel: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  twilioVerifyServiceSid: string | null;
  twilioMessagingServiceSid: string | null;
  whatsappSender: string | null;
  fromNumber: string | null;
  requireVerifiedForSession: boolean;
  updatedAt: string;
};

export type MessageTemplateRow = {
  key: string;
  channel: "sms" | "whatsapp";
  defaultContent: string;
  variables: string[];
  override: { content: string; isEnabled: boolean; updatedAt: string } | null;
};

async function tenantApiFetch<T>(
  token: ApiAuthToken,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(buildAuthHeaders(token) ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error("auth"), { status: res.status });
  }
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw Object.assign(new Error("api_error"), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export function getMessagingSettings(token: ApiAuthToken) {
  return tenantApiFetch<MessagingSettingsDto>(token, "/tenant/messaging/settings");
}

export function putMessagingSettings(token: ApiAuthToken, body: Record<string, unknown>) {
  return tenantApiFetch<MessagingSettingsDto>(token, "/tenant/messaging/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function getMessageTemplates(token: ApiAuthToken) {
  return tenantApiFetch<{ items: MessageTemplateRow[] }>(
    token,
    "/tenant/message-templates",
  );
}

export function putTemplateOverride(
  token: ApiAuthToken,
  body: {
    templateKey: string;
    channel: "sms" | "whatsapp";
    content: string;
    isEnabled: boolean;
  },
) {
  return tenantApiFetch<{
    key: string;
    channel: string;
    content: string;
    isEnabled: boolean;
    warnings: string[];
    updatedAt: string;
  }>(token, "/tenant/message-templates/override", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
