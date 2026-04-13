# Phase 0.5 — Product Surface & GTM (plan)

**Durum:** Planlı (ürün ve dokümantasyon fazı; Data Health / Governance / Lineage ürün fazlarından **önce veya paralel** yürütülebilir).  
**Amaç:** Pazarlama yüzeyi, genel web portal ve tasarım sisteminin **ürün dışı kullanıcıya** tutarlı görünmesi; **Tenant App / Platform Console** ile görsel ve mesaj dilinin çakışmaması.

**İlgili:** [`10-plan-004-acquisition-and-pricing.md`](./10-plan-004-acquisition-and-pricing.md) (edinim ve mesajlaşma), [`20-rules-008-design-system.md`](./20-rules-008-design-system.md) (ikon, badge, yoğunluk, alan renkleri), [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) (slice takibi).

---

## 1. Phase tanımı (özet)

| Öğe | Açıklama |
|-----|----------|
| **Ad** | Phase 0.5 — Product Surface & GTM |
| **Kapsam** | Design system **genişletmesi** (ikon, badge, yoğunluk, alan semantiği); **marketing layer** (ICP, mesaj, konumlandırma — plan-004); **web portal** (public site; `apps/web-portal`). |
| **Dışarıda bırakılan** | Tenant ürün mantığı (registry, scan, policy motoru); bu phase **sunum ve edinim** katmanıdır. |
| **Bağımlılık** | Mevcut `VITE_MARKETING_BASE_URL` akışı; portal hazır olunca base URL bu uygulamaya işaret eder veya reverse proxy ile birleştirilir. |

---

## 2. Üç katman (birbirini tamamlar)

| Katman | Rol | Çıktı |
|--------|-----|--------|
| **Product experience (design)** | Admin ile aynı marka dili; yoğun enterprise UI kuralları | `rules-008` güncellemeleri; ikon seti tekilleştirme |
| **Marketing layer** | Kim için, ne vaat, hangi özellik öne çıkar | `plan-004` ICP + mesaj + konumlandırma |
| **Web portal** | Kamuya açık sayfalar: ilk temas, fiyat, giriş/kayıt köprüsü, dokümana giriş | `apps/web-portal` |

---

## 3. Uygulama: `apps/web-portal`

**Teknoloji (öneri):** Mevcut monorepo ile uyum için **React + Vite + TypeScript** (admin-web ile aynı aile); stil için CSS değişkenleri + `rules-008` token ilkeleri (portal’a özel hafif tema; Tenant App’in `gov-*` yoğunluğunun **kopyası değil** — daha ferah landing).

**Konum:** Monorepo kökünde `apps/web-portal` (workspace’e eklenir).

### 3.1 Route planı (MVP)

| Rota | Amaç |
|------|------|
| `/` | Landing — değer önerisi, sosyal kanıt alanı (ileride), CTA |
| `/pricing` | Planlar / özellik matrisi (API’deki `Plan` ile hizalı üst düzey anlatım) |
| `/signup` veya `/start` | **Auth entry** — kayıt/checkout başlangıcı; mevcut `buildMarketingSignupUrl` parametreleriyle uyumlu sorgu (`utm_*`, `funnel`, `locale`) |
| `/login` (opsiyonel) | Oturum açma köprüsü — admin-web giriş sayfasına yönlendirme veya ortak auth domain kararı |
| `/docs` | **Docs entry** — harici dokümantasyon (örn. GitBook, ReadMe) için köprü veya ilk sürümde statik “Dokümantasyon yakında” + iletişim |

**Not:** Gerçek ödeme ve abonelik oluşturma yine **API + webhook** hattında kalır; portal yalnızca **yönlendirme ve mesaj** taşır.

### 3.2 İçerik ve i18n

- Kaynak dil **İngilizce** (pazar genişliği); Türkçe ve diğer diller `rules-010` ile hizalı anahtarlar (portal için ayrı `messages/` veya `locales/`).
- Tenant App’ten **farklı** metin anahtarları; çapraz kopya yok.

### 3.3 Güvenlik ve ölçüm

- Form yoksa bile CSP ve `rules-005` genel ilkeleri (harici script, analytics onayı).
- Analytics / tag yönetimi ürün kararı; MVP’de minimal.

---

## 4. Slice’lar (tracker ile uyumlu)

| Slice | İçerik |
|--------|--------|
| **Design system** | `rules-008` ikon, badge, tablo/kart, alan renkleri; Lucide (veya seçilen set) tekilleştirme |
| **Web portal** | `apps/web-portal` iskeleti + yukarıdaki rotalar + deploy notu |
| **Marketing** | `plan-004` ICP, core messaging, value proposition, feature positioning |

---

## 5. Başarı ölçütleri (Phase 0.5 kapanınca)

- [ ] Ziyaretçi `/` → `/pricing` → `/signup` akışını kesintisiz görür.
- [ ] “Data Health / Governance / Lineage” ürün adları pazarlama dilinde **tutarlı** (plan-004).
- [ ] Admin’de kullanılan ikon/badge dili dokümante; yeni ekranlarda drift yok.

---

## 6. İlgili dokümanlar

| Belge | Rol |
|--------|-----|
| [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) | Phase 0.5 slice durumu |
| [`10-plan-004-acquisition-and-pricing.md`](./10-plan-004-acquisition-and-pricing.md) | Edinim + marketing içerik |
| [`20-rules-008-design-system.md`](./20-rules-008-design-system.md) | Tasarım genişlemeleri |
| [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) | Üçüncü yüzey (public portal) özeti |
