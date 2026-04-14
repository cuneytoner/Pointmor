import type { CampaignType } from "../generated/prisma/client.js";

export type BonusPointsConfig = { points: number };
export type SpendThresholdBonusConfig = {
  thresholdMinorUnits: number;
  bonusPoints: number;
};
export type FirstVisitBonusConfig = { bonusPoints: number };

export type ParsedCampaignConfig =
  | BonusPointsConfig
  | SpendThresholdBonusConfig
  | FirstVisitBonusConfig;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function posInt(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}

/**
 * Kampanya `config` JSON doğrulaması — tip başına sabit şema (DSL yok).
 */
export function parseAndValidateCampaignConfig(
  type: CampaignType,
  raw: unknown,
): ParsedCampaignConfig {
  if (!isPlainObject(raw)) {
    const err = Object.assign(new Error("invalid_campaign_config"), {
      statusCode: 400,
    });
    throw err;
  }

  switch (type) {
    case "BONUS_POINTS": {
      const p = posInt(raw.points);
      if (p === null) {
        const err = Object.assign(new Error("invalid_campaign_config"), {
          statusCode: 400,
        });
        throw err;
      }
      return { points: p };
    }
    case "SPEND_THRESHOLD_BONUS": {
      const thresholdMinorUnits = posInt(raw.thresholdMinorUnits);
      const bonusPoints = posInt(raw.bonusPoints);
      if (thresholdMinorUnits === null || bonusPoints === null) {
        const err = Object.assign(new Error("invalid_campaign_config"), {
          statusCode: 400,
        });
        throw err;
      }
      return { thresholdMinorUnits, bonusPoints };
    }
    case "FIRST_VISIT_BONUS": {
      const bonusPoints = posInt(raw.bonusPoints);
      if (bonusPoints === null) {
        const err = Object.assign(new Error("invalid_campaign_config"), {
          statusCode: 400,
        });
        throw err;
      }
      return { bonusPoints };
    }
    default: {
      const _exhaustive: never = type;
      void _exhaustive;
      const err = Object.assign(new Error("invalid_campaign_type"), {
        statusCode: 400,
      });
      throw err;
    }
  }
}

/** Kayıt öncesi: JSON + tip uyumu (Prisma Json alanından gelen ham değer). */
export function assertCampaignConfigMatchesType(
  type: CampaignType,
  raw: unknown,
): ParsedCampaignConfig {
  return parseAndValidateCampaignConfig(type, raw);
}
