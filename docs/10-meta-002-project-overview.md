# Pointmor — proje özeti

**Bu dosya, eski veri platformu çizgisine ait anlatımı taşımaz.** Kod ve Prisma şeması **Pointmor core platform + modül yaklaşımı** ile hizalanmıştır.

## Ürün

**Pointmor**, **modüler çok kiracılı (multi-tenant) platform** ürünüdür. Bu repoda **core platform iskeleti** bulunur: kimlik, kiracı, üyelik, plan ve abonelik; **admin-web** içinde **Platform Console** (`/platform/*`) ve **Tenant App** (`/app/*`); backend **Fastify + Prisma + PostgreSQL** (`apps/api`).

**Tek doğruluk ifadesi:** **Pointmor is a modular multi-tenant platform. Users access tenants via memberships. Functionality is delivered through modules.**

**Eski veri platformu domain’i** (Data Health, Governance, Lineage, connector/scan/registry) **koddan ve şemadan kaldırılmıştır**; ilgili eski plan/spec dokümanları da `docs/` içinden **temizlenmiştir** (gerekirse git geçmişi). Güncel ürün yönü **Pointmor sadakat**tir.

**Cafe modülü (existing module):** Loyalty (faz 1) Prisma modelleri ve tenant bağlamında REST uçları (`/customers`, `/visits`, `/rewards`, `/redemptions`, hesap özeti) `apps/api` içindedir. Müşteri tarafı (PWA) **canonical** public API ile konuşur: **`/public/tenants/:tenantSlug/...`** (legacy `/public/loyalty/...` GET’leri 308 yönlendirme). Tenant App’te ödül talebi onayı ve kullanım listesi **Kullanımlar** ekranında işlenir.

**Cashier (Tenant App):** Tek ekranda visit + müşteri + ödül kullanımı için ürün/UX kararları [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md) dosyasında; varsayılan operasyon sırası **önce visit, sonra redeem**, çift CTA (Complete visit primary, Use reward secondary). **Cihaz / vardiya bağlamı (slice):** backend’de `DeviceSession` + `CashierShift` + isteğe bağlı `Branch`; işlemler header veya null ile etiketlenir; tam POS muhasebesi yok.

**Operasyonel görünürlük (slice):** Yapısal `AuditEvent` + hafif `AnomalySignal` (tekrar talep hızı, vardiyada yüksek redeem hacmi, aktif oturum/vardiya dışı kasiyer işlemi vb.). Yönetici için vardiya/şube/gün kapanış özeti API’si (`/manager/...`); finansal mutabakat veya fraud motoru kapsam dışı.

**Plan & entitlement (slice):** `Plan.limits` JSON + `featureTags`; kullanım ölçümü çoğunlukla **runtime aggregate** (persisted usage tablosu yok). Kritik yazma yollarında backend enforcement; Tenant App `GET /tenant/entitlements` ile plan, limit, kullanım, kalan ve uyarılar. **Upgrade UX (bu repo):** Tenant App üst çubukta plan rozeti, **Administration → Billing** (`/app/admin/billing`; eski `/app/billing` yönlendirir) üzerinde kullanım/limit ve demo plan değişimi (`POST /tenant/billing/demo-plan-switch`, ortamda kapatılabilir); Platform Console **Abonelikler** tablosunda plan `PATCH`. Gerçek ödeme / Stripe sonraki faz; monetization erteli, entitlement + görünürlük aktif.

## Güncel odak (ürün)

**Real-world validation (pilot):** Çekirdek özellikler repoda mevcut; sıradaki kritik faz **sahada doğrulama**dır: 1–3 gerçek restoran/kafe, demo seed’den bağımsız tenant ve veri, QR + kasiyer + müşteri akışının canlı ölçümü ve yapılandırılmış geri bildirim. Ayrıntılı pilot çerçevesi, ölçüm ve riskler: [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) **Phase 7**. Ürün önceliği kuralı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) — **validation-first**.

## Teknik yığın

- Monorepo: `apps/api`, `apps/admin-web`
- UI: React + Vite + TypeScript

## Yüzeyler

| Yüzey | Rol | Rota |
|--------|-----|------|
| Platform Console | SaaS operatörü | `/platform/*` |
| Tenant App | İşletme kullanıcısı | `/app/*` |
| Müşteri (loyalty PWA) | Müşteri — puan, ödül, talep | `/c/:tenantSlug/*` (`apps/admin-web`, admin shell yok) |
| Kamuya açık menü (planlı) | Salt okunur menü vitrinu | `/m/:tenantSlug` (aynı paket; [`42-design-store-public-menu.md`](./42-design-store-public-menu.md)) |

**Store Experience Foundation:** Mağaza ayarları (dil, para birimi, branding bayrakları), menü kategorileri/kalemleri, public menü sayfası ve menü QR — tenant yönetiminde; sipariş/ödeme yok. Müşteri loyalty PWA **mevcut**; yeni müşteri uygulaması açılmaz.

Detaylı kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). İlerleme özeti: [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md).

## Platform Evolution

- Proje, cafe/loyalty SaaS olarak başladı.
- Şimdi modüler çok kiracılı (multi-tenant) platforma evriliyor.
- Mevcut cafe işlevleri değişmeden korunur.
- Yeni modüller, çekirdek platformun üzerine eklenir.
- İlk yeni modül: **AI Act Compliance**.

- **AI Act Compliance**, platformun **first non-loyalty module** konumundadır ve birincil kullanım amacı **B2B compliance** süreçleridir.
