import type { FastifyInstance } from "fastify";
import type { NotificationChannel } from "../generated/prisma/client.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { prisma } from "../lib/prisma.js";
import { getOrCreateStoreMessagingSettings } from "../lib/messaging/store-messaging-settings.js";
import { extractTemplateVariableNames } from "../lib/messaging/template-render.js";

function requireTenantSession(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const tenantId = s?.tenant?.id;
  if (!tenantId) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}

export async function registerTenantMessagingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/messaging/settings", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const row = await getOrCreateStoreMessagingSettings(tenantId);
    return {
      tenantId: row.tenantId,
      smsEnabled: row.smsEnabled,
      whatsappEnabled: row.whatsappEnabled,
      defaultChannel: row.defaultChannel,
      allowFallbackChannel: row.allowFallbackChannel,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
      twilioVerifyServiceSid: row.twilioVerifyServiceSid,
      twilioMessagingServiceSid: row.twilioMessagingServiceSid,
      whatsappSender: row.whatsappSender,
      fromNumber: row.fromNumber,
      requireVerifiedForSession: row.requireVerifiedForSession,
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  app.put<{ Body: Record<string, unknown> }>(
    "/tenant/messaging/settings",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const b = req.body ?? {};
      const smsEnabled = b.smsEnabled === undefined ? undefined : Boolean(b.smsEnabled);
      const whatsappEnabled =
        b.whatsappEnabled === undefined ? undefined : Boolean(b.whatsappEnabled);
      const requireVerifiedForSession =
        b.requireVerifiedForSession === undefined
          ? undefined
          : Boolean(b.requireVerifiedForSession);
      const twilioVerifyServiceSid =
        b.twilioVerifyServiceSid === undefined || b.twilioVerifyServiceSid === null
          ? undefined
          : String(b.twilioVerifyServiceSid).trim() || null;
      const twilioMessagingServiceSid =
        b.twilioMessagingServiceSid === undefined || b.twilioMessagingServiceSid === null
          ? undefined
          : String(b.twilioMessagingServiceSid).trim() || null;
      const whatsappSender =
        b.whatsappSender === undefined || b.whatsappSender === null
          ? undefined
          : String(b.whatsappSender).trim() || null;
      const fromNumber =
        b.fromNumber === undefined || b.fromNumber === null
          ? undefined
          : String(b.fromNumber).trim() || null;
      let defaultChannel: "sms" | "whatsapp" | undefined;
      if (b.defaultChannel !== undefined && b.defaultChannel !== null) {
        const dc = String(b.defaultChannel).toLowerCase();
        if (dc !== "sms" && dc !== "whatsapp") {
          return reply.code(400).send({ error: "validation_error" });
        }
        defaultChannel = dc;
      }
      const allowFallbackChannel =
        b.allowFallbackChannel === undefined ? undefined : Boolean(b.allowFallbackChannel);
      const quietHoursStart =
        b.quietHoursStart === undefined || b.quietHoursStart === null
          ? undefined
          : String(b.quietHoursStart).trim() || null;
      const quietHoursEnd =
        b.quietHoursEnd === undefined || b.quietHoursEnd === null
          ? undefined
          : String(b.quietHoursEnd).trim() || null;
      const timezone =
        b.timezone === undefined || b.timezone === null
          ? undefined
          : String(b.timezone).trim() || "UTC";

      const hm = /^\d{1,2}:\d{2}$/;
      if (quietHoursStart !== undefined && quietHoursStart !== null && !hm.test(quietHoursStart)) {
        return reply.code(400).send({ error: "validation_error" });
      }
      if (quietHoursEnd !== undefined && quietHoursEnd !== null && !hm.test(quietHoursEnd)) {
        return reply.code(400).send({ error: "validation_error" });
      }

      await getOrCreateStoreMessagingSettings(tenantId);
      const row = await prisma.storeMessagingSettings.update({
        where: { tenantId },
        data: {
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(whatsappEnabled !== undefined && { whatsappEnabled }),
          ...(requireVerifiedForSession !== undefined && { requireVerifiedForSession }),
          ...(twilioVerifyServiceSid !== undefined && { twilioVerifyServiceSid }),
          ...(twilioMessagingServiceSid !== undefined && { twilioMessagingServiceSid }),
          ...(whatsappSender !== undefined && { whatsappSender }),
          ...(fromNumber !== undefined && { fromNumber }),
          ...(defaultChannel !== undefined && { defaultChannel }),
          ...(allowFallbackChannel !== undefined && { allowFallbackChannel }),
          ...(quietHoursStart !== undefined && { quietHoursStart }),
          ...(quietHoursEnd !== undefined && { quietHoursEnd }),
          ...(timezone !== undefined && { timezone }),
        },
      });
      return {
        tenantId: row.tenantId,
        smsEnabled: row.smsEnabled,
        whatsappEnabled: row.whatsappEnabled,
        defaultChannel: row.defaultChannel,
        allowFallbackChannel: row.allowFallbackChannel,
        quietHoursStart: row.quietHoursStart,
        quietHoursEnd: row.quietHoursEnd,
        timezone: row.timezone,
        twilioVerifyServiceSid: row.twilioVerifyServiceSid,
        twilioMessagingServiceSid: row.twilioMessagingServiceSid,
        whatsappSender: row.whatsappSender,
        fromNumber: row.fromNumber,
        requireVerifiedForSession: row.requireVerifiedForSession,
        updatedAt: row.updatedAt.toISOString(),
      };
    },
  );

  app.get("/tenant/message-templates", { preHandler: [authPreHandler] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    const [defaults, overrides] = await Promise.all([
      prisma.messageTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ key: "asc" }, { channel: "asc" }],
      }),
      prisma.tenantMessageTemplateOverride.findMany({ where: { tenantId } }),
    ]);
    return {
      items: defaults.map((t) => {
        const o = overrides.find((x) => x.templateKey === t.key && x.channel === t.channel);
        return {
          key: t.key,
          channel: t.channel,
          defaultContent: t.defaultContent,
          variables: t.variables,
          override: o
            ? { content: o.content, isEnabled: o.isEnabled, updatedAt: o.updatedAt.toISOString() }
            : null,
        };
      }),
    };
  });

  app.put<{ Body: Record<string, unknown> }>(
    "/tenant/message-templates/override",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const b = req.body ?? {};
      const templateKey = String(b.templateKey ?? "").trim();
      const ch = String(b.channel ?? "").toLowerCase();
      const content = b.content === undefined ? undefined : String(b.content);
      const isEnabled = b.isEnabled === undefined ? undefined : Boolean(b.isEnabled);
      if (!templateKey || (ch !== "sms" && ch !== "whatsapp")) {
        return reply.code(400).send({ error: "validation_error" });
      }
      const channel = ch as NotificationChannel;
      const base = await prisma.messageTemplate.findUnique({
        where: { key_channel: { key: templateKey, channel } },
      });
      if (!base) {
        return reply.code(404).send({ error: "not_found" });
      }
      if (content !== undefined && !content.trim()) {
        return reply.code(400).send({ error: "validation_error", message: "empty_template" });
      }
      if (content === undefined && isEnabled === undefined) {
        return reply.code(400).send({ error: "validation_error" });
      }
      const warnings: string[] = [];
      if (content !== undefined && channel === "sms" && content.length > 160) {
        warnings.push("sms_length_warning");
      }
      if (content !== undefined) {
        const declared = base.variables;
        const used = extractTemplateVariableNames(content);
        for (const u of used) {
          if (declared.length > 0 && !declared.includes(u)) {
            warnings.push(`unknown_var:${u}`);
          }
        }
      }
      const row = await prisma.tenantMessageTemplateOverride.upsert({
        where: {
          tenantId_templateKey_channel: { tenantId, templateKey, channel },
        },
        create: {
          tenantId,
          templateKey,
          channel,
          content: content !== undefined ? content.trim() : base.defaultContent,
          isEnabled: isEnabled ?? true,
        },
        update: {
          ...(content !== undefined && { content: content.trim() }),
          ...(isEnabled !== undefined && { isEnabled }),
        },
      });
      return {
        key: templateKey,
        channel,
        content: row.content,
        isEnabled: row.isEnabled,
        warnings,
        updatedAt: row.updatedAt.toISOString(),
      };
    },
  );

  app.get<{ Querystring: { take?: string } }>(
    "/tenant/notifications/deliveries",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const raw = req.query?.take;
      const take = Math.min(
        200,
        Math.max(1, raw !== undefined ? Number(raw) || 50 : 50),
      );
      const rows = await prisma.notificationDelivery.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          customerId: true,
          customerActionId: true,
          channel: true,
          provider: true,
          providerMessageId: true,
          status: true,
          errorCode: true,
          attemptNumber: true,
          fallbackFromId: true,
          retryOfId: true,
          finalOutcome: true,
          failureCategory: true,
          payloadSummary: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        items: rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      };
    },
  );
}
