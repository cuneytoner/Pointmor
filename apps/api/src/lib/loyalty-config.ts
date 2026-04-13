/**
 * Visit `amount` para biriminin küçük birimleri (ör. kuruş / cent).
 * Kazanılan 1 puan için gereken küçük birim sayısı (varsayılan 100 → 1,00 birim = 1 puan).
 */
export function minorUnitsPerEarnedPoint(): number {
  const raw = process.env.LOYALTY_MINOR_UNITS_PER_POINT;
  const n = raw ? Number.parseInt(raw, 10) : 100;
  return Number.isFinite(n) && n > 0 ? n : 100;
}

/** amount (küçük birim) → kazanılacak tam puan (aşağı yuvarlanır). */
export function visitAmountToPointsEarned(amount: number): number {
  if (amount <= 0) return 0;
  const per = minorUnitsPerEarnedPoint();
  return Math.floor(amount / per);
}

export function normalizeCustomerPhone(raw: string): string {
  return raw.trim();
}
