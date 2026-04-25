# Mağaza Deneyimi Temeli — mağaza ayarları, dil, menü, kamuya açık menü

**Kapsam:** Tenant App içinde **Mağaza ayarları** + **menü yönetimi**; müşteri tarafında **salt okunur kamuya açık menü** (`/m/:tenantSlug`). **Sipariş, ödeme, mutfak, envanter yok** (bu fazın dışında).

**İlgili:** Müşteri sadakat PWA [`42-design-admin-ui.md`](./42-design-admin-ui.md) bağlamında `apps/admin-web` — rotalar [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md). Mevcut loyalty PWA: `/c/:tenantSlug/*`.

---

## 1. Mimari karar

| Yüzey | Rota | Amaç |
|--------|------|------|
| Loyalty (mevcut) | `/c/:tenantSlug/*` | Telefon + token, puan, ödül, kampanya özeti, talep |
| Public menu (yeni) | `/m/:tenantSlug` (isteğe bağlı alt rota: `/m/:slug/category/:id`) | Salt okunur menü vitrinu; oturum zorunlu değil |

- **Yeni `customer-app` yok:** Her şey **`apps/admin-web`** içinde; React Router ile route ayrımı (`AppRoutes` içinde `/m/*` ağacı, admin shell’e girmeden hafif layout).
- **Public API:** `GET /public/tenants/:slug/menu` (veya `/menu/bootstrap`) — rate limit; yazma yok.
- **Tenant API:** `PATCH /tenant/store-settings`, CRUD menü kategorileri/kalemleri — oturum + `tenantId` zorunlu.

---

## 2. Dil stratejisi (customer + public menu)

**Çözüm sırası (aynı yardımcı fonksiyon):**

1. **URL `?lang=xx`** — açık seçim (paylaşılan linklerde).
2. **localStorage** `pointmor_locale_<tenantSlug>` veya mevcut `LocaleContext` anahtarı ile **kayıtlı tercih** (sadece müşteri oturumu açıksa veya menüde “dil” seçildiyse).
3. **`navigator.languages`** — ilk eşleşen dil, **yalnızca** `supportedLanguages` içindeyse.
4. **`defaultLanguage`** (StoreSettings).

**Kural:** Desteklenmeyen dil istenirse **4**’e düş; asla rastgele çeviri yok.

**i18n:** UI metinleri mevcut `en` / `tr` / … bundle; **menü içerikleri** (kategori/kalem adları) için ilk sürümde **tek dil** (ör. `defaultLanguage`) veya JSON `translations` alanı sonraki iterasyon — overengineering yapılmaz.

---

## 3. Mağaza ayarları (Tenant App)

Tek ekran veya “Mağaza” altında bölüm:

- Görünen ad, **slug salt okunur** (değişim nadir; ayrı onay).
- Logo URL, primary color (mevcut müşteri bootstrap ile birleşir).
- `defaultLanguage`, `supportedLanguages[]` (ISO 639-1, örn. `tr`, `en`).
- `currency` (ISO 4217), `timezone` (IANA).
- Adres, iletişim (telefon, e-posta opsiyonel).
- **Görünürlük bayrakları:** `loyaltyPublicEnabled`, `menuPublicEnabled`, `menuQrEnabled` (menü linki/QR üretimini kilitle).

Kaynak: `StoreSettings` 1:1 `tenantId` (bkz. veri modeli).

---

## 4. Veri modeli (öneri)

### `StoreSettings` (1:1 Tenant)

- `tenantId` @unique
- `storeName` (Tenant.name ile senkron veya override; ürün kararı: başlangıçta Tenant.name ile aynı tutulabilir)
- `logoUrl`, `primaryColor` (hex)
- `defaultLanguage`, `supportedLanguages` (String[] veya Json)
- `currency`, `timezone`, `address` (Json veya düz metin), `contactPhone`, `contactEmail`
- `loyaltyPublicEnabled`, `menuPublicEnabled`, `menuQrEnabled`
- `showMenuPrices`, `showMenuImages` (MenuSettings ile birleştirilebilir)

### `MenuCategory`

- `tenantId`, `name`, `description`, `sortOrder`, `isActive`

### `MenuItem`

- `tenantId`, `categoryId`, `name`, `description`, `priceMinor` (veya Decimal), `currency` (store ile hizalı), `imageUrl`, `sortOrder`, `isActive`

### `MenuSettings` (opsiyonel 1:1)

- `tenantId` @unique
- `showPrices`, `showImages`, `menuQrEnabled` (StoreSettings ile çakışmayı önle: tek tabloda toplanması tercih edilebilir)

**Bütünlük:** FK cascade tenant silinince; sıralama `sortOrder` integer.

---

## 5. Menü yönetimi UI (Tenant App)

- Kenar çubukta **Menü** veya **Mağaza > Menü** (tek özellik).
- Liste: kategoriler; kategori altında kalemler; **Aktif/Pasif** toggle; sıra için sayı alanı veya ↑↓ (D&D yok).
- Form: hızlı ekle/düzenle; görsel URL opsiyonel.

---

## 6. Kamuya açık menü sayfası

- Route: **`/m/:tenantSlug`**
- Layout: `menu-public.css` — loyalty `customer-pwa.css` ile **paylaşma** minimal (marka renk CSS değişkeni).
- İçerik: başlık, kategoriler, kalemler, fiyat (ayara göre), görsel (ayara göre).
- **Checkout / sepet yok.**

---

## 7. Menü QR stratejisi

| QR | URL | Amaç |
|----|-----|------|
| **Loyalty** | `.../c/:slug` | Puan, ödül, telefon gate |
| **Menu** | `.../m/:slug` | Salt menü |

**İlk sürüm:** İki ayrı URL — karışıklık yok. Tenant **Ayarlar** ekranında: Loyalty link + QR, Menu link + QR (mevcut `TenantSettingsPage` desenini genişlet).

---

## 8. Loyalty vs menü — ürün kararı

**İlk sürüm: iki ayrı public route** (`/c/*` ve `/m/*`) — tek uygulama paketi, farklı amaç; paylaşılan branding API’si ile tutarlılık. Birleşik “tek mega PWA” gerekmez.

---

## 9. Yapılmayacaklar (bu faz)

Sipariş, masa, checkout, ödeme, mutfak, stok, POS entegrasyonu, marketplace, gelişmiş çok dilli CMS.

---

## 10. Uygulama sırası (öneri)

1. Prisma migration: `StoreSettings`, `MenuCategory`, `MenuItem` (+ isteğe bağlı `MenuSettings` birleştirme).
2. Tenant API: store settings GET/PATCH; menü CRUD.
3. Public API: `GET .../menu` (tenant + `menuPublicEnabled` kontrolü).
4. Admin-web: Store settings sayfası; Menü yönetimi; `/m/:slug` sayfası + `AppRoutes` dallanması.
5. Ayarlar: çift QR (loyalty + menu).
6. Public bootstrap’ta branding’i placeholder yerine `StoreSettings` ile doldur (loyalty ile hizala).
