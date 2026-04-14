import type { Campaign, CampaignType } from "../generated/prisma/client.js";
import {
  type ParsedCampaignConfig,
  parseAndValidateCampaignConfig,
} from "./loyalty-campaign-config.js";

export type VisitCampaignEvalContext = {
  amountMinor: number;
  /** Bu ziyaret kaydı oluşturulmadan önceki ziyaret sayısı */
  priorVisitCount: number;
  basePoints: number;
  now: Date;
};

export function isCampaignRunnable(
  c: Pick<Campaign, "status" | "isActive" | "startAt" | "endAt">,
  now: Date,
): boolean {
  if (!c.isActive || c.status !== "active") return false;
  if (c.startAt && now < c.startAt) return false;
  if (c.endAt && now > c.endAt) return false;
  return true;
}

function bonusForType(
  type: CampaignType,
  cfg: ParsedCampaignConfig,
  ctx: VisitCampaignEvalContext,
): number {
  switch (type) {
    case "BONUS_POINTS":
      return (cfg as { points: number }).points;
    case "SPEND_THRESHOLD_BONUS": {
      const c = cfg as {
        thresholdMinorUnits: number;
        bonusPoints: number;
      };
      return ctx.amountMinor >= c.thresholdMinorUnits ? c.bonusPoints : 0;
    }
    case "FIRST_VISIT_BONUS": {
      const pts = (cfg as { bonusPoints: number }).bonusPoints;
      return ctx.priorVisitCount === 0 ? pts : 0;
    }
    default: {
      const _e: never = type;
      void _e;
      return 0;
    }
  }
}

export function evaluateCampaignBonus(
  campaign: Pick<Campaign, "type" | "config">,
  ctx: VisitCampaignEvalContext,
): number {
  const cfg = parseAndValidateCampaignConfig(campaign.type, campaign.config);
  const raw = bonusForType(campaign.type, cfg, ctx);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
}
