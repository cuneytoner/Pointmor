/**
 * Ürün aktivasyon özeti — istemci uyumu için alanlar korunur; veri platformu
 * analitik tablosu kaldırıldığı için varsayılan tamamlanmış döndürülür.
 */
export async function getUserActivationMilestones(_userId: string): Promise<{
  scanCompleted: boolean;
  insightViewed: boolean;
  actionTaken: boolean;
  activated: boolean;
  activatedAt: string | null;
}> {
  return {
    scanCompleted: true,
    insightViewed: true,
    actionTaken: true,
    activated: true,
    activatedAt: null,
  };
}
