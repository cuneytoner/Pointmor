# Ürün kapsamı kuralları — Pointmor

**Amaç:** Core platform sınırlarını korumak, module bazlı genişlemeyi düzenlemek ve gereksiz domain karışmasını önlemek.

---

## Ürün tanımı

**Pointmor**, modüler çok kiracılı platform ürünüdür; işlevler module'lerle sunulur. Birincil kullanıcılar tenant işletmeleri, advisor yapıları ve operasyonları yöneten platform role'leridir.

**Tek doğruluk ifadesi:** **Pointmor modüler çok kiracılı bir platformdur. Kullanıcılar tenant'lara membership üzerinden erişir. İşlevsellik module'ler üzerinden sunulur.**

**Şu anki repoda** core platform (kimlik, kiracı, membership, plan, abonelik, admin UI), desteklenen mevcut **cafe/business module (`cafe`)** ve compliance odaklı **AI Act module (`ai_act`)** bulunur. Cafe module; müşteri, ziyaret, ödül, kullanım, canonical public API, kasiyer onaylı talep → kullanım akışı ve Tenant App operasyon ekranlarını kapsar. AI Act module; AI system inventory, assessment, obligations/tasks ve compliance operasyon yüzeylerini kapsar. **Plan / entitlement:** `GET /tenant/entitlements`, yazma yollarında limit ve özellik kontrolleri, Tenant App'te kullanım ve yükseltme UX'i (demo plan değişimi; gerçek ödeme/PSP/fatura entegrasyonu ürün olgunluğuna göre sonraki adım).

**Tenant kasa yüzeyi (hedef):** Tek ekranda visit ve anında ödül kullanımı (`POST /visits`, `POST /redemptions`) — ürün sırası ve CTA kuralları [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md).

---

## Platform Evolution

Pointmor, erken operasyonel/business module'lerden daha geniş bir modüler çok kiracılı SaaS platformuna evrilmiştir. Existing loyalty/business module desteklenir; yeni stratejik yön governance, compliance, advisor workflow'ları ve AI-augmented operasyonlardır.

Bu kapsam kuralı, platformu cafe/loyalty uygulaması olarak değil, birden fazla domain module'ünü aynı tenant, membership, plan, audit ve module activation doktriniyle taşıyan compliance-capable SaaS platformu olarak tanımlar.

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
| **Kullanıcı** | Üyelik, role |
| **Plan / Subscription** | Fiyatlandırma sınıfı, özellik etiketleri, abonelik durumu |
| **Denetim** | E-posta tabanlı `AuditLog` (admin eylemleri) + **yapısal** `AuditEvent` (loyalty/kasiyer kritik olaylar; immutable, tenant kapsamlı). İkisi farklı amaçlara hizmet eder; finans/SIEM platformu değildir. |
| **Plan / entitlement** | `Plan` üzerinde `limits` (JSON) + `featureTags`; abonelik yoksa varsayılan `starter` planı. Ödeme sağlayıcısı yok; limit ve özellikler backend’de zorunlu. |

---

## Terminoloji

| Kavram | Kullanım |
|--------|----------|
| **Tenant** | Sistem modeli; kiracı/hesap sınırı |
| **Workspace** | UI terimi; bazı ekranlarda tenant karşılığı olarak görünebilir |
| **Platform Console** | SaaS operatörü — tüm tenant'lar |
| **Tenant App** | Tek işletmenin yönetim alanı |

**Billing** (gerçek ödeme, PSP, fatura): ürün olgunlaşana kadar **ertelenebilir**. Çekirdekte abonelik kaydı, platformdan plan `PATCH`, tenant’ta kullanım/limit görünürlüğü ve (ortamda açıksa) demo plan değişimi vardır; **tahsilat** yoktur.

---

## Validation-first (saha önceliği)

**Öncelik sırası:** Önce **gerçek işletme pilotunda** öğrenilen sürtünme, hata desenleri ve operasyonel metrikler; sonra backlog’a yeni özellik. Amaç, repoda “hazır” olan akışların sahada **tekrarlanabilir** ve **ölçülebilir** şekilde işlemesini doğrulamak; saf özellik genişlemesi yerine **alan doğrulaması**.

**Pilot çerçevesi** (işletme seçimi, onboarding, ölçüm, geri bildirim): [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) **Phase 7**. Ürün özeti: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) — *Güncel odak*.

**Kural:** Yeni büyük özellik (ör. yeni entegrasyon, yeni müşteri yüzeyi) önerilmeden önce pilot bulgusu veya açık metrik ihtiyacı yazılır; istisna ürün ve güvenlik gerektirir.

---

## Store ve kamuya açık menü (sınır)

**Store Experience Foundation:** Tenant başına mağaza ayarları (dil listesi, varsayılan dil, para birimi, saat dilimi, iletişim, branding, loyalty/menü kamuya açık bayrakları) ve salt okunur menü vitrini. Müşteri tarafında route `/m/:tenantSlug`; loyalty PWA `/c/:tenantSlug` ile aynı repo (`apps/admin-web`), farklı ürün amacıyla çalışır; tek "mega app" birleştirmesi zorunlu değildir. Sipariş, sepet, ödeme, mutfak ve envanter bu dilimde yoktur. Ayrıntı: [`42-design-store-public-menu.md`](./42-design-store-public-menu.md).

---

## Feature ekleme kriteri

Yeni özellik şunları netleştirmeli: hangi **kiracı** verisini taşıyor, **Tenant App** veya **Platform** hangisinde, **plan / limit** ile mi ilişkili. Çekirdek dışı “genel veri platformu” özellikleri **önerilmez**.

---

## Platform Extension Strategy

- **Mevcut business module korunur:** Cafe/loyalty kapsamı ve iş akışları bozulmadan desteklenmeye devam eder.
- **Yeni domain = module:** Yeni iş alanları çekirdek yerine module olarak eklenir.
- **Domain logic karışmaz:** Module'ler kendi domain sorumluluğunu taşır; farklı domain kuralları aynı iş akışında iç içe geçirilmez.
- **Core platform ortaktır:** auth, tenant, membership, plan/abonelik ve temel güvenlik katmanı tüm module'ler için ortak altyapıdır.

**Yeni module zorunlulukları:**

1. **Tenant-scoped** çalışmalıdır.
2. **RBAC** kurallarına uymalıdır.
3. Gerekli olduğu durumda **plan/entitlement** katmanına entegre olmalıdır.
