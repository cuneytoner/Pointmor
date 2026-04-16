import type { StoreMessagingSettings } from "../../generated/prisma/client.js";
import { getTwilioClient } from "./twilio-client.js";

export type SendWhatsappResult =
  | { ok: true; messageSid: string }
  | {
      ok: false;
      code: "whatsapp_not_enabled" | "provider_failed" | "invalid_phone";
      detail?: string;
    };

function toWhatsappAddress(e164: string): string {
  const t = e164.trim();
  if (t.toLowerCase().startsWith("whatsapp:")) return t;
  return `whatsapp:${t}`;
}

/**
 * Twilio WhatsApp (from numarası `StoreMessagingSettings.whatsappSender` — whatsapp:+... veya +...).
 */
export async function sendTransactionalWhatsapp(input: {
  store: StoreMessagingSettings | null;
  toE164: string;
  body: string;
}): Promise<SendWhatsappResult> {
  const { store, toE164, body } = input;
  if (!store?.whatsappEnabled) {
    return { ok: false, code: "whatsapp_not_enabled" };
  }
  const rawFrom = store.whatsappSender?.trim();
  if (!rawFrom) {
    return { ok: false, code: "whatsapp_not_enabled", detail: "missing_whatsapp_sender" };
  }

  const client = getTwilioClient();
  if (!client) {
    return { ok: false, code: "provider_failed", detail: "twilio_not_configured" };
  }

  const from = toWhatsappAddress(rawFrom);
  const to = toWhatsappAddress(toE164);

  try {
    const msg = await client.messages.create({
      from,
      to,
      body: body.slice(0, 4096),
    });
    return { ok: true, messageSid: msg.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid/i.test(msg) && /phone|number|to/i.test(msg)) {
      return { ok: false, code: "invalid_phone", detail: "twilio_rejected" };
    }
    return { ok: false, code: "provider_failed", detail: "twilio_whatsapp_failed" };
  }
}
