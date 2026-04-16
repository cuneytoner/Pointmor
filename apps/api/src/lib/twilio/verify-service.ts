import type { StoreMessagingSettings } from "../../generated/prisma/client.js";
import { getTwilioClient } from "./twilio-client.js";

export type VerifyStartResult =
  | { ok: true; status: string }
  | { ok: false; code: "provider_failed" | "invalid_phone"; detail?: string };

export type VerifyCheckResult =
  | { ok: true; status: string }
  | {
      ok: false;
      code: "verify_code_invalid" | "verify_code_expired" | "provider_failed";
      detail?: string;
    };

function resolveVerifyServiceSid(store: StoreMessagingSettings | null): string | undefined {
  const fromStore = store?.twilioVerifyServiceSid?.trim();
  if (fromStore) return fromStore;
  return process.env.TWILIO_VERIFY_SERVICE_SID?.trim() || undefined;
}

export async function sendVerificationSms(
  store: StoreMessagingSettings | null,
  toE164: string,
): Promise<VerifyStartResult> {
  const client = getTwilioClient();
  const serviceSid = resolveVerifyServiceSid(store);
  if (!client || !serviceSid) {
    return { ok: false, code: "provider_failed", detail: "verify_not_configured" };
  }
  try {
    const v = await client.verify.v2.services(serviceSid).verifications.create({
      to: toE164,
      channel: "sms",
    });
    return { ok: true, status: v.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid/i.test(msg) && /phone|number|to/i.test(msg)) {
      return { ok: false, code: "invalid_phone", detail: "twilio_rejected" };
    }
    return { ok: false, code: "provider_failed", detail: "twilio_verify_start_failed" };
  }
}

export async function checkVerificationCode(
  store: StoreMessagingSettings | null,
  toE164: string,
  code: string,
): Promise<VerifyCheckResult> {
  const client = getTwilioClient();
  const serviceSid = resolveVerifyServiceSid(store);
  if (!client || !serviceSid) {
    return { ok: false, code: "provider_failed", detail: "verify_not_configured" };
  }
  try {
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: toE164,
      code: code.trim(),
    });
    if (check.status === "approved") {
      return { ok: true, status: check.status };
    }
    return { ok: false, code: "verify_code_invalid", detail: check.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/expired/i.test(msg)) {
      return { ok: false, code: "verify_code_expired", detail: "expired" };
    }
    if (/not found|invalid/i.test(msg)) {
      return { ok: false, code: "verify_code_invalid", detail: "check_failed" };
    }
    return { ok: false, code: "provider_failed", detail: "twilio_verify_check_failed" };
  }
}
