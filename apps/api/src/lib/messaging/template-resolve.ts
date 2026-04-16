import type { NotificationChannel } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { extractTemplateVariableNames } from "./template-render.js";

export type ResolvedMessageTemplate = {
  templateKey: string;
  channel: NotificationChannel;
  content: string;
  variables: string[];
  source: "override" | "default";
};

/**
 * Tenant override → yoksa global MessageTemplate.
 */
export async function resolveMessageTemplate(input: {
  tenantId: string;
  templateKey: string;
  channel: NotificationChannel;
}): Promise<ResolvedMessageTemplate | null> {
  const { tenantId, templateKey, channel } = input;

  const override = await prisma.tenantMessageTemplateOverride.findUnique({
    where: {
      tenantId_templateKey_channel: { tenantId, templateKey, channel },
    },
  });

  if (override) {
    if (override.isEnabled && override.content.trim()) {
      return {
        templateKey,
        channel,
        content: override.content.trim(),
        variables: extractTemplateVariableNames(override.content),
        source: "override",
      };
    }
    /** `isEnabled: false` → varsayılan şablona dön */
  }

  const base = await prisma.messageTemplate.findUnique({
    where: {
      key_channel: { key: templateKey, channel },
    },
  });

  if (!base || !base.isActive) return null;

  return {
    templateKey,
    channel,
    content: base.defaultContent,
    variables: base.variables.length > 0 ? base.variables : extractTemplateVariableNames(base.defaultContent),
    source: "default",
  };
}
