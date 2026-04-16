# Pointmor Admin — UI tasarım rehberi

**Kapsam:** `apps/admin-web` — **Plus shell** kabuğu (`admin-app`), **Platform Console** (`/platform/*`) ve **Tenant App** (`/app/*`) aynı bileşen ve stil disiplinini paylaşır. Yeni ekranlar **`admin-primary-btn`**, **`admin-secondary-btn`**, `admin-app__card` ve mevcut `plus-shell.css` önekleriyle uyumlu olmalıdır.

**İlgili:** [`20-rules-008-design-system.md`](./20-rules-008-design-system.md) (genel token / ikon), [`10-meta-001-rules-index.md`](./10-meta-001-rules-index.md).

---

## 1. Stil kaynağı

- Ana stil dosyası: `apps/admin-web/src/plus-shell.css` — kurallar **`.admin-app` altında**; kök uygulama stilleriyle çakışmayı önlemek için bu kapsam korunur.
- **Yeni stiller** mümkünse `plus-shell.css` içinde, mevcut öneklerle (`gov-`, `toolbar__`, `plan-card__`, `admin-app__`) tutarlı isimlendir.

---

## 2. Sayfa iskeleti

- **Giriş dışı** uygulama gövdesi: `PageShell` + `admin-app__card` (veya governance için `gov-card` / panel desenleri) ile tutarlı hiyerarşi.
- **Üst bilgi:** `PageShell` `eyebrow` / `title` / `description`; tek seferlik hero varyantları mevcut sayfa örnekleriyle uyumlu kalsın.

---

## 3. Eylemler ve bağlantılar

| Kullanım | Sınıf / bileşen |
|----------|------------------|
| **Birincil eylem** (kaydet, tarama başlat, onay) | `admin-primary-btn` |
| **İkincil eylem** veya sayfa içi ikincil navigasyon | `admin-secondary-btn` |
| **Kenar çubuğu navigasyonu** | `admin-app__nav-link` / `--active` |

**Kural:** “Yönetişim / Git / Detay” gibi **sayfa içi birincil veya ikincil eylemler** düz `<a>` veya `<Link>` ile yalnızca mavi metin olarak verilmez; düğme sınıfları veya toolbar içi bağlantı desenleri (`gov-hub-toolbar__link` vb.) kullanılır. Kenar çubuğu menü metin linkleri bu kuralın dışındadır.

---

## 4. Tenant App — Governance / yoğun ekranlar

- Kartlar, filtre çubukları, metrik grid: **`gov-card`**, **`gov-filters`**, **`gov-metric-grid`**, **`gov-panel`** vb. — önce mevcut blokları kullan; yeni yüzeyde rastgele utility sınıf yığını yok.
- **Badge / durum:** `Badge` bileşeni ve `gov-*` tonları; yeni durum rengi gerekiyorsa önce `rules-008` ile hizala.

---

## 5. Inline stil ve düzen

- **Inline `style={{}}`:** Kaçın; layout için sınıf ekle (ör. `plan-card__title-row`, `toolbar__search--block`). Gerçekten tek seferlik dinamik değer gerekiyorsa istisna ve mümkünse yorumla.
- **Spacing:** 8px tabanlı ölçek; aynı ekranda kart + tablo karışımında özet üstte, detay altta (enterprise yoğunluk).

---

## 6. Erişilebilirlik

- **Odak:** Etkileşimli kontrollerde `:focus-visible` ile görünür odak halkası (birincil düğmede tanımlı).
- Başlık hiyerarşisi anlamlı (`h1`–`h3`); yalnızca görünüm için `div` + class yerine semantik etiket tercih edilir.

---

## 7. Kısa checklist (yeni ekran / PR)

- [ ] Birincil/ikincil eylem doğru düğme sınıfında mı?
- [ ] Yeni stil `plus-shell.css` ve tutarlı önekte mi?
- [ ] Gereksiz inline stil yok mu?
- [ ] Tenant governance/lineage ekranında `gov-*` ve yoğunluk `rules-008` ile uyumlu mu?

---

## 8. Tenant App — Cashier (POS) ekranı

- **Tam sayfa** `PageShell`; modal içinde kasa akışı yok.
- **Birincil / ikincil:** Visit tamamlama `admin-primary-btn`; ödül kullanımı `admin-secondary-btn` — ayrıntılı durum kuralları ve operasyon sırası (önce visit, sonra redeem): [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md).
- **Tailwind (`apps/admin-web`):** Kasa düzeni `src/cashier/*` içinde **Tailwind utility** ile; `tailwind.config.js` içinde **preflight kapalı** — mevcut Plus shell / `plus-shell.css` ile çakışmayı azaltır. Yeni POS yüzeyleri bu dosya ağacında tutulur.

---

## 9. Tenant App — Plan / billing görünürlüğü

- **Üst çubuk:** plan rozeti (`plan-badge`); **Administration → Billing** (`/app/admin/billing`): kullanım satırları, özellik listesi, demo yükseltme modalı — stiller `plus-shell.css` içinde (ör. `usage-row`, `entitlement-alerts`, `billing-*`).
- Metinler i18n; gerçek ödeme yoktur ([`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)).
