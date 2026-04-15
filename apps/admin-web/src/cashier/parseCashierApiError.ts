/** loyaltyFetch hata gövdesinden kullanıcı mesajı üretir. */
export function parseCashierApiError(
  err: unknown,
  t: (key: string) => string,
): string {
  const e = err as { body?: unknown; status?: number };
  const b = e.body;
  if (b && typeof b === "object" && b !== null && "error" in b) {
    const code = String((b as { error?: string }).error ?? "");
    if (code === "insufficient_points")
      return t("tenantLoyalty.cashier.errorInsufficientPoints");
    if (code === "duplicate_pending_claim")
      return t("tenantLoyalty.cashier.errorDuplicatePendingClaim");
    if (code === "not_found") return t("tenantLoyalty.cashier.errorNotFound");
    if (code === "campaign_config_corrupt")
      return t("tenantLoyalty.visits.previewError");
    if (code === "validation_error")
      return t("tenantLoyalty.visits.validation");
  }
  return t("tenantLoyalty.cashier.errorGeneric");
}
