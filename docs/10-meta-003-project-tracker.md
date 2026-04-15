# Pointmor — proje takipçisi

Canlı teknik/ürün özeti. Kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). Genel bakış: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md).

Eski veri platformu faz tablosu bu dosyada tutulmaz; kod tabanı **Pointmor loyalty SaaS çekirdeği** ile uyumludur.

---

## Mevcut durum (2026)

- **Ürün adı:** Pointmor — loyalty SaaS (restoran / kafe odaklı ürün yönü).
- **Çekirdek korundu:** Tenant, User, auth/session, Plan, Subscription, audit; Platform + Tenant admin yüzeyleri.
- **Kaldırıldı:** Eski **data platform** modülleri (Data Health, Governance, Lineage, registry, scan, connector, import, ekip yönetimi API’si); ilgili Prisma tabloları ve migration baseline yenilendi.
- **Loyalty (faz 1):** `Customer`, `Visit`, `Reward`, `Redemption` modelleri ve tenant kapsamlı API route’ları (`apps/api`) mevcut.
- **Cashier operations (slice — cihaz / vardiya):** `Branch` (opsiyonel şube), `DeviceSession` (tablet/register oturumu), `CashierShift` (kullanıcı vardiyası). `Visit` / `Redemption` üzerinde isteğe bağlı `deviceSessionId` + `cashierShiftId` FK’lar. API: `GET /cashier/bootstrap`, `POST /cashier/device-sessions`, `POST /cashier/shifts`, `GET /cashier/shifts/:id/summary`; yazma uçlarına isteğe bağlı header’lar `X-Pointmor-Device-Session`, `X-Pointmor-Cashier-Shift`. Admin cashier ekranı açık vardiyayı bootstrap ile senkronlar ve header’ları gönderir.
- **Şema:** Çekirdek + loyalty tabloları; genişletme (kampanya, ödeme, puan kuralları) sonraki migration’larla.

### Phase 3 — Customer Experience (PWA + public API)

**Durum:** Ürün akışı açısından **kapatıldı** (QR → gate/home → puan; telefon+token; ödül talebi; offline snapshot). **Canonical public müşteri API’si:** **`/public/tenants/:slug/*`** (bootstrap = `GET /public/tenants/:slug`, oturum, `customers/me`, `claims`, `analytics/events`). Legacy **`/public/loyalty/:slug/*`** — GET uçları **308** ile canonical’a yönlendirilir; POST uçları geçici uyumluluk için yerinde kalır. Global + public scope **rate limit** ve **Bearer + tenant slug** ile tenant izolasyonu uygulanıyor.

**409 ayrımı:** `insufficient_points` vs `duplicate_pending_claim` canonical (ve legacy) `claims` yanıtında `error` stringi ile ayrılır; PWA toast ile farklı metin gösterir.

### Phase 4 — Growth & automation (MVP)

**Durum:** **Uygulandı (backend).** `LoyaltyDomainEvent` (visit_created, reward_claimed, inactivity_detected), `CustomerAction` (pending/sent/failed), müşteri alanları `lastVisitAt`, `visitCount`, `lastActiveAt`. Ziyaret ve ödül talebi sonrası kurallar tetiklenir; bildirim katmanı **simulate/log** (`notification-provider`). Tenant API: `GET /actions`, `GET /customers/:id/actions`, `POST /automation/scan-inactivity` (cron yerine manuel/dış tetik). Kuyruk yok.

### Phase 4.6 — Operasyonel audit + kapanış özeti + anomali (hafif)

**Durum:** **Uygulandı (backend).** `AuditEvent` (immutable, tenant kapsamlı) ve `AnomalySignal` (kural tabanlı bayrak; ML yok). Kritik loyalty + kasiyer olayları (`visit_created`, `reward_claimed` / `reward_redeemed` / `reward_rejected`, vardiya/cihaz aç-kapa) yapısal payload ile kaydedilir. **Manager API:** `GET /manager/audit-events`, `GET /manager/anomalies`, `GET /manager/shifts/:shiftId/closing-summary`, `GET /manager/branches/:branchId/closing-summary?date=` — kasiyer özeti `GET /cashier/shifts/:id/summary` genişletildi (`closing` alanı). UI (Tenant App manager görünümü) sırada: kapanış kartı, anomali listesi, son audit satırları.

### Phase 4.7 — Entitlement + usage + plan gating (ödeme yok)

**Durum:** **Uygulandı (backend + tenant UX).** `Plan.limits` (JSON) + `featureTags`; aktif `Subscription` → plan çözümü; abonelik yoksa `starter` planı fallback. **Runtime kullanım sayımları** (tenant izolasyonlu): müşteri, aktif ödül, aktif kampanya (`status=active` ∧ `isActive`), UTC ay ziyareti, şube, staff kullanıcı. **Sert blok:** limit veya özellik yoksa 403 (`plan_limit_exceeded` / `plan_feature_disabled`). **Yumuşak uyarı:** `GET /tenant/entitlements` içinde `warnings` + `upgradeSuggested`. **Admin-web:** plan rozeti, limit/upgrade şeritleri, Billing sayfası (kullanım + demo upgrade), Kampanya/Büyüme için özellik yoksa kilit ekranı; platformda abonelik planı `PATCH`. Ödeme/checkout bu fazda yok; monetization erteli, entitlement + upgrade görünürlüğü aktif.

### Phase 4.5 — Ürün analitiği (retention / huni)

**Durum:** **Uygulandı.** Harici analitik aracı yok; olaylar DB’de toplanıyor.

- **Model:** `ProductAnalyticsEvent` + enum (`qr_opened`, `customer_viewed_home`, `visit_recorded`, `points_awarded`, `reward_viewed`, `reward_claimed`, `redemption_completed`).
- **API (tenant oturumu):** `GET /analytics/funnel`, `/analytics/retention`, `/analytics/overview`, `/analytics/reward-usage` — huni adım/düşüş, kohort D1/D3/D7, ödül kullanım özeti.
- **Yüzey:** Tenant admin → **Büyüme** (`/app/growth`): huni, tutma, ödül metrikleri, sunucu üretimi kısa öngörüler.
- **PWA:** Ödül listesi açılışında `reward_viewed` (best-effort); `GET /public/tenants/:slug` (`qr_opened`), `customers/me` (`customer_viewed_home`) ve servis katmanı diğer olayları yazar.

---

## Sıradaki anlamlı adımlar

| Öncelik | Konu |
|--------|------|
| 0 | **Cashier single-screen** — ürün/UX spec tamam: [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md) (visit → redeem sırası, çift CTA, acceptance criteria). **Sırada:** `CashierPage` + paneller ile Tenant App’te implementasyon (mevcut `/app/visits` POS ile birleştirme veya yeni rota). |
| 1 | İşletme **onboarding** akışını derinleştirme (limit/usage sayaçları ve entitlement backend + tenant billing UX mevcut; bkz. Phase 4.7) |
| 2 | Gerçek ödeme / faturalama entegrasyonu (ürün olgunluğuna göre) |
| 3 | Legacy `POST /public/loyalty/...` alias’larını kaldırma veya tek modüle indirgeme (istemci tamamen canonical olduğunda) |
| 4 | Public API hata gövdesini uzun vadede `20-rules-004` ile tam hizalama (`error.code` nesnesi) |

**Tamamlanan (bu dilim):** PWA tabanı `/public/tenants/...`; Tenant App **Kullanımlar** — bekleyen/tamamlanan filtre, detay paneli, müşteri profilinde talep geçmişi; `409` mesaj ayrımı.

---

## Riskler

| Risk | Not |
|------|-----|
| Eski dokümanlar | Eski plan/spec dosyaları kaldırıldı; kodla çelişirse **kod + bu tracker** önceliklidir. |
| DB | Yeni migration’lar ile mevcut DB’ler `migrate deploy` veya bilinçli `migrate reset` ile uyumlu tutulmalıdır. |
