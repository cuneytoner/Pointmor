import type { CustomerAction, Prisma } from "../../generated/prisma/client.js";
import { extractTemplateVariableNames, renderTemplate } from "./template-render.js";
import type { ResolvedMessageTemplate } from "./template-resolve.js";

export function mapActionTypeToTemplateKey(type: string): string {
  if (type === "first_visit_followup") return "DAY_1_REMINDER";
  if (type === "inactivity_nudge") return "DAY_7_WINBACK";
  if (type === "reward_proximity") return "REWARD_UNLOCKED";
  if (type === "retention_day_3") return "DAY_3_PROGRESS";
  return "DAY_1_REMINDER";
}

export function mergeTemplateData(
  raw: Prisma.JsonValue | null | undefined,
  storeName: string,
): Record<string, string | number> {
  const base: Record<string, string | number> = { storeName };
  if (raw !== null && raw !== undefined && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
        base[k] = typeof v === "boolean" ? (v ? "1" : "0") : v;
      }
    }
  }
  return base;
}

export function buildMessageBody(
  resolved: ResolvedMessageTemplate | null,
  action: Pick<CustomerAction, "message">,
  data: Record<string, string | number>,
  channel: "sms" | "whatsapp",
): { body: string; warnings: string[] } {
  const warnings: string[] = [];
  let body: string;
  if (resolved) {
    body = renderTemplate(resolved.content, data).trim();
    const expected = resolved.variables.length
      ? resolved.variables
      : extractTemplateVariableNames(resolved.content);
    for (const name of expected) {
      if (!(name in data) || data[name] === "") {
        warnings.push(`missing_var:${name}`);
      }
    }
    if (!body) {
      body = `[Pointmor] ${action.message}`;
      warnings.push("empty_after_render_fallback");
    }
  } else {
    body = `[Pointmor] ${action.message}`;
    warnings.push("template_not_found_fallback");
  }
  if (channel === "sms" && body.length > 160) {
    warnings.push("sms_length_warning");
  }
  if (channel === "whatsapp" && body.length > 1600) {
    warnings.push("whatsapp_length_warning");
  }
  const maxLen = channel === "sms" ? 1400 : 4096;
  return { body: body.slice(0, maxLen), warnings };
}
