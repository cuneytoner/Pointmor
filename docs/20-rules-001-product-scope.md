# Ürün kapsamı kuralları — Pointmor

**Amaç:** Çekirdek SaaS sınırlarını korumak, **loyalty** ürününe odaklanmak ve gereksiz genişlemeyi önlemek.

---

## Ürün tanımı

**Pointmor**, çok kiracılı **sadakat (loyalty) SaaS** ürünüdür; birincil kullanıcılar **restoran / kafe işletmeleri** ve operasyonlarını yöneten **SaaS operatörü** (platform) rolleridir.

**Şu anki repoda** çekirdek SaaS (kimlik, kiracı, kullanıcı, plan, abonelik, admin UI) ve **loyalty faz 1** (müşteri, ziyaret, ödül, kullanım — Prisma + tenant kapsamlı API) bulunur. Müşteri PWA + canonical public API, kasiyer onaylı talep → kullanım akışı ve Tenant App’te kullanım operasyon ekranı **mevcut kapsamda**dır. **Plan / entitlement:** `GET /tenant/entitlements`, yazma yollarında limit ve özellik kontrolleri, Tenant App’te kullanım ve yükseltme UX’i (demo plan değişimi; gerçek **ödeme / PSP / fatura** entegrasyonu ürün olgunluğuna göre sonraki adım).

**Tenant kasa yüzeyi (hedef):** Tek ekranda visit ve anında ödül kullanımı (`POST /visits`, `POST /redemptions`) — ürün sırası ve CTA kuralları [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md).

---

## Arşiv / kapsam dışı (eski domain)

Aşağıdaki alanlar **aktif ürün parçası değildir** ve kod tabanından çıkarılmıştır:

- Veri sağlığı (Data Health), veri yönetişimi (data governance), köken (lineage)
- Veri kaynağı bağlantıları, tarama, profil çıkarma, kalite kuralları, registry import akışları

Eski plan/spec dosyaları repodan kaldırılmıştır (gerekirse git geçmişi). **Güncel kapsam** bu dosya ve [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) ile tanımlıdır.

---

## SaaS çekirdeği (korunur)

| Alan | Açıklama |
|------|----------|
| **Kimlik / oturum** | Giriş, session, platform vs tenant bağlamı |
| **Tenant** | Kiracı yaşam döngüsü, slug, ayarlar |
| **Kullanıcı** | Üyelik, rol |
| **Plan / Subscription** | Fiyatlandırma sınıfı, özellik etiketleri, abonelik durumu |
| **Denetim** | E-posta tabanlı `AuditLog` (admin eylemleri) + **yapısal** `AuditEvent` (loyalty/kasiyer kritik olaylar; immutable, tenant kapsamlı). İkisi farklı amaçlara hizmet eder; finans/SIEM platformu değildir. |
| **Plan / entitlement** | `Plan` üzerinde `limits` (JSON) + `featureTags`; abonelik yoksa varsayılan `starter` planı. Ödeme sağlayıcısı yok; limit ve özellikler backend’de zorunlu. |

---

## Terminoloji

| Kavram | Kullanım |
|--------|----------|
| **Workspace / Tenant** | Kiracı; işletme veya marka hesabı |
| **Platform Console** | SaaS operatörü — tüm kiracılar |
| **Tenant App** | Tek işletmenin yönetim alanı |

**Billing** (gerçek ödeme, PSP, fatura): ürün olgunlaşana kadar **ertelenebilir**. Çekirdekte abonelik kaydı, platformdan plan `PATCH`, tenant’ta kullanım/limit görünürlüğü ve (ortamda açıksa) demo plan değişimi vardır; **tahsilat** yoktur.

---

## Validation-first (saha önceliği)

**Öncelik sırası:** Önce **gerçek işletme pilotunda** öğrenilen sürtünme, hata desenleri ve operasyonel metrikler; sonra backlog’a yeni özellik. Amaç, repoda “hazır” olan akışların sahada **tekrarlanabilir** ve **ölçülebilir** şekilde işlemesini doğrulamak; saf özellik genişlemesi yerine **alan doğrulaması**.

**Pilot çerçevesi** (işletme seçimi, onboarding, ölçüm, geri bildirim): [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) **Phase 7**. Ürün özeti: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) — *Güncel odak*.

**Kural:** Yeni büyük özellik (ör. yeni entegrasyon, yeni müşteri yüzeyi) önerilmeden önce pilot bulgusu veya açık metrik ihtiyacı yazılır; istisna ürün ve güvenlik gerektirir.

---

## Store & kamuya açık menü (sınır)

**Store Experience Foundation:** Tenant başına **mağaza ayarları** (dil listesi, varsayılan dil, para birimi, saat dilimi, iletişim, branding, **loyalty/menü kamuya açık** bayrakları) ve **salt okunur menü** vitrinu. Müşteri tarafında route **`/m/:tenantSlug`**; loyalty PWA **`/c/:tenantSlug`** ile aynı repo (`apps/admin-web`), farklı ürün amacı — tek “mega app” birleştirmesi zorunlu değil. **Sipariş, sepet, ödeme, mutfak, envanter** bu slice’da yok. Ayrıntı: [`42-design-store-public-menu.md`](./42-design-store-public-menu.md).

---

## Feature ekleme kriteri

Yeni özellik şunları netleştirmeli: hangi **kiracı** verisini taşıyor, **Tenant App** veya **Platform** hangisinde, **plan / limit** ile mi ilişkili. Çekirdek dışı “genel veri platformu” özellikleri **önerilmez**.
