import type {
  Customer,
  CustomerAction,
  CustomerContactPreference,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryFinalOutcome,
  NotificationFailureCategory,
  Prisma,
  StoreMessagingSettings,
} from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { normalizeToE164 } from "../phone-e164.js";
import { sendTransactionalSms } from "../twilio/messaging-sms.js";
import { sendTransactionalWhatsapp } from "../twilio/messaging-whatsapp.js";
import { twilioConfigured } from "../twilio/twilio-client.js";
import { getOrCreateStoreMessagingSettings } from "./store-messaging-settings.js";
import { isWithinQuietHours } from "./quiet-hours.js";
import { resolveMessageTemplate } from "./template-resolve.js";
import { orderedMessagingChannels } from "./messaging-channel-order.js";
import { buildMessageBody, mergeTemplateData } from "./retention-message-body.js";

/** Aynı kanalda geçici hata sonrası ek deneme (0 = yalnızca ilk gönderim) */
export const MAX_SAME_CHANNEL_RETRIES = 2;

const RETRY_DELAY_BASE_MS = 450;

export type SendWithFallbackParams = {
  tenantId: string;
  customerId: string;
  templateKey: string;
  /** CustomerAction.templateData veya eşdeğeri */
  templateData: Prisma.JsonValue | null | undefined;
  customerActionId?: string | null;
  /** `buildMessageBody` için ham mesaj yedekleri */
  customerAction?: Pick<CustomerAction, "message"> | null;
  /** Log / payloadSummary — PII yok */
  actionTypeHint?: string;
};

export type SendWithFallbackResult = {
  success: boolean;
  terminalDeliveryId: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function logMessaging(
  step: string,
  ctx: Record<string, string | number | boolean | null | undefined>,
): void {
  console.info("[Pointmor:messaging]", { step, ...ctx });
}

export function classifyFailureCode(
  errorCode: string | undefined,
  detail?: string | null,
): NotificationFailureCategory {
  const c = (errorCode ?? "").toLowerCase();
  const d = (detail ?? "").toLowerCase();
  if (c === "invalid_phone" || c === "phone_not_verified") return "validation";
  if (c === "opt_in_required" || c === "no_messaging_channel") return "opt_in";
  if (c === "quiet_hours") return "quiet_hours";
  if (c === "sms_not_enabled" || c === "whatsapp_not_enabled") return "configuration";
  if (c === "rate_limit" || d.includes("rate") || d.includes("429")) return "rate_limited";
  if (c === "provider_failed") {
    if (d.includes("timeout") || d.includes("econnreset") || d.includes("etimedout"))
      return "provider_transient";
    if (d.includes("twilio_not_configured") || d.includes("missing_")) return "configuration";
    return "provider_transient";
  }
  return "unknown";
}

/** Aynı kanal içinde tekrar denemeye değer mi (spam / kalıcı hatayı tekrarlama) */
export function isTransientSendFailure(errorCode: string | undefined): boolean {
  return errorCode === "provider_failed";
}

type SendResult =
  | { ok: true; messageSid: string }
  | { ok: false; code: string; detail?: string };

async function sendOnChannel(
  channel: NotificationChannel,
  store: StoreMessagingSettings,
  toE164: string,
  body: string,
): Promise<SendResult> {
  if (channel === "sms") {
    return sendTransactionalSms({ store, toE164, body });
  }
  return sendTransactionalWhatsapp({ store, toE164, body });
}

/**
 * Şablon çözümü + kanal sırası + opt-in + sessiz saat + aynı kanalda sınırlı retry.
 * Her deneme ayrı `NotificationDelivery` satırı; fallback ve retry `fallbackFromId` / `retryOfId` ile bağlanır.
 */
export async function sendWithFallback(params: SendWithFallbackParams): Promise<SendWithFallbackResult> {
  const {
    tenantId,
    customerId,
    templateKey,
    templateData,
    customerActionId,
    customerAction,
    actionTypeHint,
  } = params;

  const actionStub: Pick<CustomerAction, "message"> = customerAction ?? { message: "" };

  const [customer, store, tenant, preference] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, tenantId } }),
    getOrCreateStoreMessagingSettings(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.customerContactPreference.findUnique({ where: { customerId } }),
  ]);

  if (!customer) {
    logMessaging("abort", { reason: "customer_not_found", tenantId, customerId });
    return { success: false, terminalDeliveryId: null };
  }

  return runSendPipeline({
    customer,
    store,
    preference,
    templateKey,
    mergedData: mergeTemplateData(templateData, tenant?.name ?? "İşletme"),
    actionStub,
    customerActionId: customerActionId ?? null,
    actionTypeHint,
  });
}

type PipelineCtx = {
  customer: Customer;
  store: StoreMessagingSettings;
  preference: CustomerContactPreference | null;
  templateKey: string;
  mergedData: Record<string, string | number>;
  actionStub: Pick<CustomerAction, "message">;
  customerActionId: string | null;
  actionTypeHint?: string;
};

async function runSendPipeline(ctx: PipelineCtx): Promise<SendWithFallbackResult> {
  const { customer, store, preference, customerActionId, actionTypeHint, actionStub, templateKey, mergedData } =
    ctx;

  const basePayload = {
    actionType: actionTypeHint ?? "retention",
    templateKey,
  };

  const phoneNorm = normalizeToE164(customer.phone);
  if (!phoneNorm.ok) {
    const row = await createTerminalDelivery({
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerActionId,
      channel: "sms",
      status: "failed",
      errorCode: "invalid_phone",
      failureCategory: "validation",
      finalOutcome: "failed",
      attemptNumber: 1,
      payloadSummary: { ...basePayload, step: "validation" },
    });
    logMessaging("terminal_failed", { reason: "invalid_phone", tenantId: customer.tenantId, deliveryId: row.id });
    return { success: false, terminalDeliveryId: row.id };
  }

  if (!preference?.verifiedAt) {
    const row = await createTerminalDelivery({
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerActionId,
      channel: store.defaultChannel as NotificationChannel,
      status: "failed",
      errorCode: "phone_not_verified",
      failureCategory: "validation",
      finalOutcome: "failed",
      attemptNumber: 1,
      payloadSummary: { ...basePayload, step: "verification" },
    });
    logMessaging("terminal_failed", { reason: "phone_not_verified", tenantId: customer.tenantId, deliveryId: row.id });
    return { success: false, terminalDeliveryId: row.id };
  }

  const channels = orderedMessagingChannels(store, preference);
  if (channels.length === 0) {
    const row = await createTerminalDelivery({
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerActionId,
      channel: store.defaultChannel as NotificationChannel,
      status: "failed",
      errorCode: "no_messaging_channel",
      failureCategory: "opt_in",
      finalOutcome: "failed",
      attemptNumber: 1,
      payloadSummary: { ...basePayload, note: "no_opt_in_or_channel_disabled" },
    });
    logMessaging("terminal_failed", { reason: "no_messaging_channel", tenantId: customer.tenantId, deliveryId: row.id });
    return { success: false, terminalDeliveryId: row.id };
  }

  if (isWithinQuietHours(store)) {
    const row = await createTerminalDelivery({
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerActionId,
      channel: channels[0]!,
      status: "failed",
      errorCode: "quiet_hours",
      failureCategory: "quiet_hours",
      finalOutcome: "failed",
      attemptNumber: 1,
      payloadSummary: { ...basePayload, note: "retention_blocked_quiet_hours" },
    });
    logMessaging("terminal_failed", { reason: "quiet_hours", tenantId: customer.tenantId, deliveryId: row.id });
    return { success: false, terminalDeliveryId: row.id };
  }

  if (!twilioConfigured()) {
    const row = await createTerminalDelivery({
      tenantId: customer.tenantId,
      customerId: customer.id,
      customerActionId,
      channel: channels[0]!,
      status: "sent",
      errorCode: null,
      failureCategory: "none",
      finalOutcome: "succeeded",
      attemptNumber: 1,
      providerMessageId: null,
      payloadSummary: { ...basePayload, simulated: true, reason: "twilio_env_missing", channel: channels[0] },
    });
    logMessaging("simulated_sent", { tenantId: customer.tenantId, deliveryId: row.id, channel: channels[0]! });
    return { success: true, terminalDeliveryId: row.id };
  }

  let attemptNumber = 0;
  let lastChainDeliveryId: string | null = null;
  let previousSameChannelDeliveryId: string | null = null;

  for (let ci = 0; ci < channels.length; ci++) {
    const channel = channels[ci]!;
    const isFallbackChannel = ci > 0;
    previousSameChannelDeliveryId = null;

    for (let retry = 0; retry <= MAX_SAME_CHANNEL_RETRIES; retry++) {
      attemptNumber += 1;
      const isRetrySameChannel = retry > 0;

      const resolved = await resolveMessageTemplate({
        tenantId: customer.tenantId,
        templateKey,
        channel,
      });
      const { body, warnings } = buildMessageBody(resolved, actionStub, mergedData, channel);

      const payloadSummary = {
        ...basePayload,
        templateSource: resolved?.source ?? "fallback_raw",
        warnings,
        channelIndex: ci + 1,
        sameChannelRetry: retry,
        role: isFallbackChannel ? "fallback" : "primary",
        ...(isFallbackChannel && channels[ci - 1] ? { previousChannel: channels[ci - 1] } : {}),
      };

      const queued: NotificationDelivery = await prisma.notificationDelivery.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          customerActionId,
          channel,
          provider: "twilio",
          status: "queued",
          attemptNumber,
          fallbackFromId:
            isFallbackChannel && !isRetrySameChannel && lastChainDeliveryId ? lastChainDeliveryId : null,
          retryOfId: isRetrySameChannel && previousSameChannelDeliveryId ? previousSameChannelDeliveryId : null,
          failureCategory: "none",
          payloadSummary: payloadSummary as Prisma.InputJsonValue,
        },
      });

      previousSameChannelDeliveryId = queued.id;

      logMessaging("send_attempt", {
        tenantId: customer.tenantId,
        deliveryId: queued.id,
        attemptNumber,
        channel,
        retry,
        fallback: isFallbackChannel,
      });

      const result = await sendOnChannel(channel, store, phoneNorm.e164, body);

      if (result.ok) {
        await prisma.notificationDelivery.update({
          where: { id: queued.id },
          data: {
            status: "sent",
            providerMessageId: result.messageSid,
            errorCode: null,
            finalOutcome: "succeeded",
            failureCategory: "none",
          },
        });
        logMessaging("send_ok", {
          tenantId: customer.tenantId,
          deliveryId: queued.id,
          channel,
          attemptNumber,
        });
        return { success: true, terminalDeliveryId: queued.id };
      }

      const failCat = classifyFailureCode(result.code, result.detail);
      await prisma.notificationDelivery.update({
        where: { id: queued.id },
        data: {
          status: "failed",
          errorCode: result.code,
          failureCategory: failCat,
          payloadSummary: {
            ...payloadSummary,
            failureDetail: result.detail,
          } as Prisma.InputJsonValue,
        },
      });

      lastChainDeliveryId = queued.id;

      const transient = isTransientSendFailure(result.code);
      if (transient && retry < MAX_SAME_CHANNEL_RETRIES) {
        await sleep(RETRY_DELAY_BASE_MS + retry * 200);
        logMessaging("retry_scheduled", {
          tenantId: customer.tenantId,
          deliveryId: queued.id,
          nextRetry: retry + 1,
          channel,
        });
        continue;
      }

      logMessaging("channel_exhausted", {
        tenantId: customer.tenantId,
        channel,
        errorCode: result.code,
        transient,
      });
      break;
    }
  }

  if (lastChainDeliveryId) {
    await prisma.notificationDelivery.update({
      where: { id: lastChainDeliveryId },
      data: {
        finalOutcome: "failed",
      },
    });
  }

  logMessaging("all_channels_failed", { tenantId: customer.tenantId, customerId: customer.id });
  return { success: false, terminalDeliveryId: lastChainDeliveryId };
}

async function createTerminalDelivery(input: {
  tenantId: string;
  customerId: string;
  customerActionId: string | null;
  channel: NotificationChannel;
  status: "failed" | "sent";
  errorCode: string | null;
  failureCategory: NotificationFailureCategory;
  finalOutcome: NotificationDeliveryFinalOutcome;
  attemptNumber: number;
  providerMessageId?: string | null;
  payloadSummary: Record<string, unknown>;
}): Promise<{ id: string }> {
  return prisma.notificationDelivery.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      customerActionId: input.customerActionId,
      channel: input.channel,
      provider: "twilio",
      status: input.status,
      errorCode: input.errorCode,
      providerMessageId: input.providerMessageId ?? null,
      attemptNumber: input.attemptNumber,
      failureCategory: input.failureCategory,
      finalOutcome: input.finalOutcome,
      payloadSummary: input.payloadSummary as Prisma.InputJsonValue,
    },
  });
}
