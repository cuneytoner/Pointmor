import type { StoreMessagingSettings } from "../../generated/prisma/client.js";
import { getTwilioClient } from "./twilio-client.js";

export type SendSmsResult =
  | { ok: true; messageSid: string }
  | { ok: false; code: "sms_not_enabled" | "provider_failed" | "invalid_phone"; detail?: string };

function resolveMessagingServiceSid(store: StoreMessagingSettings | null): string | undefined {
  const fromStore = store?.twilioMessagingServiceSid?.trim();
  if (fromStore) return fromStore;
  return process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || undefined;
}

/**
 * Twilio Messaging (SMS). Messaging Service SID veya from + body.
 */
export async function sendTransactionalSms(input: {
  store: StoreMessagingSettings | null;
  toE164: string;
  body: string;
}): Promise<SendSmsResult> {
  const { store, toE164, body } = input;
  if (!store?.smsEnabled) {
    return { ok: false, code: "sms_not_enabled" };
  }
  const client = getTwilioClient();
  const messagingServiceSid = resolveMessagingServiceSid(store);
  const fromNumber = store.fromNumber?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();

  if (!client) {
    return { ok: false, code: "provider_failed", detail: "twilio_not_configured" };
  }

  try {
    if (messagingServiceSid) {
      const msg = await client.messages.create({
        to: toE164,
        body,
        messagingServiceSid,
      });
      return { ok: true, messageSid: msg.sid };
    }
    if (fromNumber) {
      const msg = await client.messages.create({
        to: toE164,
        body,
        from: fromNumber,
      });
      return { ok: true, messageSid: msg.sid };
    }
    return {
      ok: false,
      code: "provider_failed",
      detail: "missing_messaging_service_or_from",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid/i.test(msg) && /phone|number|to/i.test(msg)) {
      return { ok: false, code: "invalid_phone", detail: "twilio_rejected" };
    }
    return { ok: false, code: "provider_failed", detail: "twilio_message_failed" };
  }
}
