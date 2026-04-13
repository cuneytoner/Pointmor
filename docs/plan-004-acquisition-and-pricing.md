# Edinim, pazarlama ve fiyatlandırma (plan notu)

Bu belge ürün planına aittir; teknik uygulama parça parça API ve marketing sitesinde yapılır.

## Akış özeti

1. **Operatör girişi** (`admin-web`) ile **hesap oluştur** bağlantısı kullanıcıyı **pazarlama sitesine** yönlendirir (`VITE_MARKETING_BASE_URL`, sorgu parametreleri ile kaynak izlenebilir).
2. **Pazarlama / kayıt** sayfasında kullanıcı iki ana yolu görür (veya A/B test edilir):
   - **Ücretli:** ödeme (checkout) ile tam erişim veya seçilen plan.
   - **Sınırlı ücretsiz:** **haftalık kota** ile ücretsiz erişim (süre veya özellik limiti net tanımlanır); yükseltme CTA’sı admin veya faturalama ile bağlanır.
3. Kayıt tamamlanınca e-posta doğrulama, tenant oluşturma ve davet akışları (greenfield bölüm 10 ile uyumlu) devreye girer.

## Teknik bağlantılar (admin-web)

- `apps/admin-web/src/lib/marketing-urls.ts` — `buildMarketingSignupUrl`, `buildMarketingForgotPasswordUrl`
- Varsayılan sorgu: `utm_source=royalty_admin`, `funnel=checkout_or_free_week`, `locale`, `entry=create_account`
- Pazarlama tarafında bu parametrelere göre **ödeme sayfası** veya **haftalık ücretsiz** teklifi gösterilir.

## Sonraki teknik işler (sırayla)

- Marketing sitesinde signup + Stripe (veya seçilen PSP) + “free week” kuralının backend’de `Plan` / `Subscription` ile modellenmesi.
- Webhook’larla abonelik durumunun API’de güncellenmesi (`docs/meta-002-project-overview.md` sıradakiler).
