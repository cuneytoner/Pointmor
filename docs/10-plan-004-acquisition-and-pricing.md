# Edinim, pazarlama ve fiyatlandırma (plan notu)

Bu belge ürün planına aittir; teknik uygulama parça parça API ve marketing sitesinde yapılır.

**İlgili:** [Phase 0.5 — Product Surface & GTM](./10-plan-007-phase-0-5-product-surface-gtm.md) (`apps/web-portal`, tasarım genişlemesi); bu dosya **marketing layer** içerik ve edinim akışını detaylandırır.

---

## Marketing layer — konumlandırma (özet)

### İdeal müşteri profili (ICP)

| Boyut | Tanım |
|--------|--------|
| **Organizasyon** | B2B; çok kiracılı SaaS veya büyük ekip içi **veri platformu** sorumluları (data/engineering leadership). |
| **Problem** | Veri kaynakları dağınık; kalite ve uyum görünür değil; **sahiplik ve politika** ile operasyonel risk birikiyor. |
| **Teknik olgunluk** | PostgreSQL ile başlar; kod yazmadan **registry + tarama + skor** bekler; ileri analitik veya ETL satıcısı aramaz (MVP sınırı). |
| **Satın alma tetikleyicisi** | Denetim / güvenlik baskısı, yeni veri ürünü öncesi “envanter”, ekip içi şeffaflık. |

### Core messaging (çekirdek mesaj)

- **Tek cümle:** Veri envanterinizi bağlayın, sağlığını ölçün, yönetişim kurallarını uygulayın — tek çok kiracılı platformda.  
- **İkincil:** “Önce görünürlük (Data Health), sonra sahiplik ve politika (Governance), sonra köken (Lineage).” — faz sırası ile uyumlu ([`plan-005`](./10-plan-005-data-platform-three-products.md)).

### Value proposition (değer önerisi)

| Vaat | Karşılık (ürün) |
|------|------------------|
| **Görünürlük** | Kayıt + tarama + profil + kalite skoru (Phase 1) |
| **Uyum ve sahiplik** | Sınıflandırma, etiket, politika, ihlal (Phase 2) |
| **Etki ve köken** | Varlık düzeyinde lineage (Phase 3) |
| **Operasyonel güven** | Tenant izolasyonu, özellik kapıları, denetim izi (API) |

### Feature positioning (özellik konumlandırması)

| Özellik | Müşteriye dil | Konum |
|---------|----------------|--------|
| **Data Health** | “Verilerinizin nerede ne kadar sağlıklı olduğunu görün.” | Giriş ürünü; ilk CTA |
| **Governance** | “Kim sorumlu, hangi sınıfta, hangi kural ihlal edildi?” | Orta huni; plan yükseltmesi |
| **Lineage** | “Bu tablo nereden geliyor, değişince ne etkilenir?” | İleri değer; teknik alıcı |
| **Policy / Violation** | “Kurallarınızı otomatik kontrol edin; ihlalleri envanterle birleştirin.” | Governance ile birlikte anlatılır |

**Kural:** Public sitede (web portal) özellik adları, Tenant App içi etiketler ve dokümantasyon **aynı sözlükten** (`rules-010` anahtarları ile uyumlu İngilizce kaynak).

---

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
- Webhook’larla abonelik durumunun API’de güncellenmesi (`docs/10-meta-002-project-overview.md` sıradakiler).
