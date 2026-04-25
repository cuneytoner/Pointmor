# Pointmor — proje takipçisi

Canlı teknik/ürün özeti. Kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). Genel bakış: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md).

---

## Mevcut durum (2026)

- **Ürün adı:** Pointmor — modüler çok kiracılı platform.
- **Tek doğruluk ifadesi:** Pointmor modüler çok kiracılı bir platformdur. Kullanıcılar tenant'lara membership üzerinden erişir. İşlevsellik module'ler üzerinden sunulur.
- **Cafe konumu:** Loyalty/cafe alanı platformdaki **existing module (`cafe`)** olarak sürer.
- **İlk loyalty dışı module:** **AI Act Compliance** (B2B compliance kullanım senaryosu).
- **Çekirdek korundu:** Tenant, User, auth/session, Plan, Subscription, audit; Platform + Tenant admin yüzeyleri.
- **Temizlik tamamlandı:** Eski data-platform bileşenleri kod ve schema'dan kaldırılmış, tracker yalnız mevcut platform ve module durumunu takip eder.
- **Loyalty (faz 1):** `Customer`, `Visit`, `Reward`, `Redemption` modelleri ve tenant kapsamlı API endpoint'leri (`apps/api`) mevcut.
- **Cashier operations (slice — cihaz / vardiya):** `Branch` (opsiyonel şube), `DeviceSession` (tablet/register oturumu), `CashierShift` (kullanıcı vardiyası). `Visit` / `Redemption` üzerinde isteğe bağlı `deviceSessionId` + `cashierShiftId` FK’lar. API: `GET /cashier/bootstrap`, `POST /cashier/device-sessions`, `POST /cashier/shifts`, `GET /cashier/shifts/:id/summary`; yazma uçlarına isteğe bağlı header’lar `X-Pointmor-Device-Session`, `X-Pointmor-Cashier-Shift`. Admin cashier ekranı açık vardiyayı bootstrap ile senkronlar ve header’ları gönderir.
- **Schema:** Çekirdek + loyalty tabloları; genişletme (kampanya, ödeme, puan kuralları) sonraki migration'larla.

### Faz 3 — Müşteri Deneyimi (PWA + public API)

**Durum:** Ürün akışı açısından kapatıldı (QR → gate/home → puan; telefon+token; ödül talebi; offline snapshot). **Canonical public müşteri API'si:** **`/public/tenants/:slug/*`** (bootstrap = `GET /public/tenants/:slug`, session, `customers/me`, `claims`, `analytics/events`). Legacy **`/public/loyalty/:slug/*`** — GET endpoint'leri 308 ile canonical'a yönlendirilir; POST endpoint'leri geçici uyumluluk için yerinde kalır. Global + public scope rate limit ve Bearer + tenant slug ile tenant izolasyonu uygulanır.

**409 ayrımı:** `insufficient_points` ve `duplicate_pending_claim` canonical (ve legacy) `claims` yanıtında `error` alanı ile ayrılır; PWA toast ile farklı metin gösterir.

### Faz 4 — Büyüme ve otomasyon (MVP)

**Durum:** **Uygulandı (backend).** `LoyaltyDomainEvent` (visit_created, reward_claimed, inactivity_detected), `CustomerAction` (pending/sent/failed), müşteri alanları `lastVisitAt`, `visitCount`, `lastActiveAt`. Ziyaret ve ödül talebi sonrası kurallar tetiklenir; bildirim katmanı **simulate/log** (`notification-provider`). Tenant API: `GET /actions`, `GET /customers/:id/actions`, `POST /automation/scan-inactivity` (cron yerine manuel/dış tetik). Kuyruk yok.

### Faz 4.6 — Operasyonel audit + kapanış özeti + anomali (hafif)

**Durum:** **Uygulandı (backend).** `AuditEvent` (immutable, tenant kapsamlı) ve `AnomalySignal` (kural tabanlı bayrak; ML yok). Kritik loyalty + kasiyer olayları (`visit_created`, `reward_claimed` / `reward_redeemed` / `reward_rejected`, vardiya/cihaz aç-kapa) yapısal payload ile kaydedilir. **Manager API:** `GET /manager/audit-events`, `GET /manager/anomalies`, `GET /manager/shifts/:shiftId/closing-summary`, `GET /manager/branches/:branchId/closing-summary?date=` — kasiyer özeti `GET /cashier/shifts/:id/summary` genişletildi (`closing` alanı). UI (Tenant App manager görünümü) sırada: kapanış kartı, anomali listesi, son audit satırları.

### Faz 4.7 — Entitlement + kullanım + plan gating (ödeme yok)

**Durum:** **Uygulandı (backend + tenant UX).** `Plan.limits` (JSON) + `featureTags`; aktif `Subscription` → plan çözümü; abonelik yoksa `starter` planı fallback. **Runtime kullanım sayımları** (tenant izolasyonlu): müşteri, aktif ödül, aktif kampanya (`status=active` ∧ `isActive`), UTC ay ziyareti, şube, staff kullanıcı. **Sert blok:** limit veya özellik yoksa 403 (`plan_limit_exceeded` / `plan_feature_disabled`). **Yumuşak uyarı:** `GET /tenant/entitlements` içinde `warnings` + `upgradeSuggested`. **Admin-web:** plan rozeti, limit/upgrade şeritleri, Billing sayfası (kullanım + demo upgrade), Kampanya/Büyüme için özellik yoksa kilit ekranı; platformda abonelik planı `PATCH`. Ödeme/checkout bu fazda yok; monetization erteli, entitlement + upgrade görünürlüğü aktif.

### Faz 4.5 — Ürün analitiği (retention / huni)

**Durum:** **Uygulandı.** Harici analitik aracı yok; olaylar DB’de toplanıyor.

- **Model:** `ProductAnalyticsEvent` + enum (`qr_opened`, `customer_viewed_home`, `visit_recorded`, `points_awarded`, `reward_viewed`, `reward_claimed`, `redemption_completed`).
- **API (tenant oturumu):** `GET /analytics/funnel`, `/analytics/retention`, `/analytics/overview`, `/analytics/reward-usage` — huni adım/düşüş, kohort D1/D3/D7, ödül kullanım özeti.
- **Yüzey:** Tenant admin → **Büyüme** (`/app/growth`): huni, tutma, ödül metrikleri, sunucu üretimi kısa öngörüler.
- **PWA:** Ödül listesi açılışında `reward_viewed` (best-effort); `GET /public/tenants/:slug` (`qr_opened`), `customers/me` (`customer_viewed_home`) ve servis katmanı diğer olayları yazar.

### Store Experience Foundation (mağaza ayarları + kamuya açık menü)

**Durum:** Planlı / tasarım hazır; kod iterasyonu sırayla ilerleyecek. Müşteri loyalty PWA zaten **`/c/:tenantSlug/*`**; aynı `apps/admin-web` paketinde kamuya açık menü **`/m/:tenantSlug`** ile ayrılacak (yeni app yok). Tenant App'te Store settings + menü yönetimi, public GET menü API'si, loyalty QR (`/c/...`) ve menü QR (`/m/...`) ayrı çalışacak. Dil çözümü: `?lang` → kayıtlı tercih → `navigator.languages` ∩ `supportedLanguages` → `defaultLanguage`. Sipariş/checkout/ödeme bu fazda yok.

**Tasarım:** [`42-design-store-public-menu.md`](./42-design-store-public-menu.md).

### Faz 7 — Gerçek dünya doğrulaması (pilot)

**Durum:** **Aktif ürün önceliği (saha / PMF).** Amaç: gerçek işletmede uçtan uca kullanımı **ölçmek** ve **öğrenmek**; yeni büyük özelliklerden önce sürtünme ve metriklerle yön vermek. Kod zorunluluğu yok; süreç + ortam + veri ayrımı esastır.

**İşletme seçimi (1–3 lokasyon):**

| Ölçüt | Not |
|--------|-----|
| Operasyonel uygunluk | Günlük POS trafiği olan, sadakat denemeye açık işletme |
| Teknik | Stabil internet; tablet veya kasa yanı cihaz; QR’ın masa/kasada görünür olması |
| İnsan | En az bir “sahip veya müdür” + 1–2 kasiyer; pilot için haftalık 15 dk check-in |
| Çeşitlilik | Mümkünse farklı yoğunluk (ör. kahvaltı yoğun vs akşam) veya farklı ortalama sepet |

**Onboarding akışı (özet):**

1. Platform: yeni **tenant** (demo seed ile karışmaması için ayrı tenant), plan limitleri pilot için yeterli Pro/Team veya manuel `PATCH`.
2. Tenant App: ödül/kural basit (1–2 ödül, gerekiyorsa tek kampanya); **Cashier** vardiya akışı eğitimi (10–15 dk); QR / müşteri giriş URL’si fiziksel olarak yerinde.
3. “Canlı günü”: ilk ziyaret → talep/onay hattı gözlemi; sorun anında Slack/telefon ile ürün ekibine.
4. Demo → gerçek: seed kullanıcıları yerine gerçek müşteri telefonları; gerekirse mevcut müşteri listesine CSV ile sınırlı import (süreç dokümante); **gerçek trafik** olmadan pilot tamamlanmış sayılmaz.

**Ölçüm planı (minimum set):**

| Metrik | Tanım / kaynak | Not |
|--------|----------------|-----|
| Kasiyer işlem süresi | Visit tamamlama: müşteri seçiminden başarılı `visit_created`/`points` yanıtına median süre (stopwatch + log zaman damgası veya `AuditEvent` / client timestamp) | Yoğun saatte örneklem |
| Ödül kullanım oranı | `redemption_completed` / uygun visit sayısı veya ödül görüntüleme sonrası redeem | Tanım pilot başında sabitlenir |
| Müşteri geri dönüş | Aynı telefon ile ikinci ziyaret veya 7/14 gün içinde tekrar `visit_recorded` | Kohort küçük; yön göstermek için |
| Günlük aktif kullanıcı (işletme) | En az bir başarılı kasiyer işlemi olan gün başına benzersiz staff veya vardiya sayısı | “DAU” tenant içi operasyon |

**Geri bildirim toplama:**

- **Kasiyer:** Haftalık 5 soruluk anket (en yavaş adım, hata mesajı, offline); mümkünse 1 oturum shadowing.
- **İşletme sahibi:** 2 haftada bir 20 dk — ROI hissi, karmaşıklık, devam / iptal kararı.
- **Müşteri:** İsteğe bağlı masa üstü QR sonrası 1 soru (NPS veya “tekrar gelir miydiniz”); PWA içinde agresif anket yok, gürültüyü azalt.

**Sürtünme analizi (çıktı):**

- Hata yoğunluğu: API/istemci hataları, `AnomalySignal`, duplicate claim, offline blokları.
- Yavaş ekranlar: kasiyer tarafında algılanan bekleme (özellikle önizleme / tamamlama).
- Anlaşılmayan UX: eğitim gerektiren adımların listesi (bir sonraki sprint’e girdi).

**Riskler (pilot):**

| Risk | Azaltma |
|------|---------|
| Veri gürültüsü | Tek tanım seti; pilot süresi 2–4 hafta |
| Operasyon yorgunluğu | Kapsamı küçük tut; özellik dondurma |
| Gizlilik | Açık rıza; telefon maskeleme politikası |

---

## Sıradaki anlamlı adımlar

| Öncelik | Konu |
|--------|------|
| **0** | **Faz 7 — Gerçek dünya doğrulaması (pilot):** işletme seçimi, onboarding, canlı veri, ölçüm + geri bildirim döngüsü (bu dosyada üst bölüm). Genel bakış: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) — *Güncel odak*. |
| 1 | Cashier / tenant ürün iyileştirmeleri — pilot bulgularına göre önceliklendirilir ([`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md) referans; tek ekran akışı üründe mevcut) |
| 2 | İşletme **onboarding** ürünleştirme (self-serve; limit/usage + billing UX Phase 4.7 ile uyumlu) |
| 3 | Gerçek ödeme / faturalama entegrasyonu (ürün olgunluğuna göre) |
| 4 | Legacy `POST /public/loyalty/...` alias'larını kaldırma veya tek module'e indirgeme (istemci tamamen canonical olduğunda) |
| 5 | Public API hata gövdesini uzun vadede `20-rules-004` ile tam hizalama (`error.code` nesnesi) |

### Platform expansion roadmap (module separation)

- Core platform: tenant/membership/auth/plan sınırlarını sert koru.
- `cafe` module: mevcut operasyon iyileştirmeleri pilot bulgularına göre sürdür.
- `ai_act` module: ilk loyalty dışı B2B compliance genişlemesi olarak ürünleştir.
- Sonraki module'ler: module activation ve tenant izolasyonu kurallarına göre kademeli eklenir.

**Tamamlanan (bu dilim):** PWA tabanı `/public/tenants/...`; Tenant App **Kullanımlar** — bekleyen/tamamlanan filtre, detay paneli, müşteri profilinde talep geçmişi; `409` mesaj ayrımı.

---

## Riskler

| Risk | Not |
|------|-----|
| Eski dokümanlar | Eski plan/spec dosyaları kaldırıldı; kodla çelişirse **kod + bu tracker** önceliklidir. |
| DB | Yeni migration’lar ile mevcut DB’ler `migrate deploy` veya bilinçli `migrate reset` ile uyumlu tutulmalıdır. |
