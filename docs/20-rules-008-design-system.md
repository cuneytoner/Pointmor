# Tasarım sistemi kuralları

**Kapsam:** Admin UI, hosted document sayfaları, editör ekranları ve **PDF çıktısı** — tek görsel ve tipografik dil.

---

## Özet kararlar

| Karar | Kural |
|--------|--------|
| Kaynak | Web ve PDF **aynı HTML/CSS render hattından** üretilir; ayrı “PDF-only” layout yok. |
| Öncelik | Okunabilirlik > dekorasyon; satır uzunluğu ve satır aralığı sabit kurallara bağlı. |
| Responsive | Tüm yüzeylerde breakpoint davranışı tanımlı; hosted sayfa mobilde okunabilir olmak zorunda. |
| Genişleme | Yeni bileşen/tema **token + mevcut component sözleşmesi** ile eklenir. |

---

## Tasarım prensipleri

1. **Readability first:** Metin gövdesi her temada WCAG’e yakın kontrast ve yeterli font boyutu ile sunulur.
2. **Pixel-perfect:** Sabit ölçüler “tahmin” ile değil; spacing scale ve type scale ile verilir. Subpixel hack’ler yerine tutarlı rounding.
3. **Responsive zorunluluğu:** `max-width` + fluid padding; küçük ekranda yatay scroll **içerik alanında** kabul edilebilir, tüm sayfa kaydırmalı olmamalı (admin/layout hariç kontrollü).
4. **Tek HTML kaynağı:** Hosted sayfa ve PDF aynı DOM/CSS yapısını paylaşır; PDF sadece `@media print` ve print-specific margin/page-break ile genişletilir.
5. **Design consistency:** Renk, tipografi ve spacing yalnızca tema token’larından gelir; hex/rastgele değer bileşen içinde dağıtılmaz.

---

## Typography

| Öğe | Kural |
|-----|--------|
| **H1** | Sayfa başlığı; tek veya belirgin hiyerarşi; font-weight semibold–bold; margin-bottom rhythm ile. |
| **H2 / H3** | Bölüm başlıkları; H3’ü gereksiz sık kullanma (çok derin outline = okunurluk düşer). |
| **Paragraf** | `line-height` 1.45–1.65 aralığında (temaya göre tek değer); paragraflar arası dikey boşluk scale’den. |
| **Liste** | `ul`/`ol` için tutarlı indent ve madde aralığı; iç içe liste max derinlik ürün kararı ile sınırlı. |
| **Quote** | Sol border veya tipografik ayrım; italic tek başına yeterli değil. |
| **Code** | Monospace; arka plan ve padding; uzun satırlar `overflow` / wrap kuralları ile. |

**Satır uzunluğu:** Gövde metni için ideal **45–75 karakter** (container `max-width` ile kontrol).

**Font weight:** Başlık ve gövde arasında net fark; gereksiz `font-weight` çeşitliliği yok.

---

## Layout

- **Max width:** İçerik kolonu (hosted + PDF) tek bir `max-width` token’ı (ör. `72ch` veya `720px` — ürün kararı) ile sınırlanır.
- **Container:** Dış container (padding) + iç content width ayrımı; tema sadece içeriği değil dış boşluğu da tanımlar.
- **Spacing scale:** 4 veya 8 tabanlı scale (örn. 4, 8, 12, 16, 24, 32); araya rastgele `13px` girmez.
- **Section rhythm:** Her blok tipi (paragraf, liste, alıntı) için üst/alt margin aynı scale’den seçilir.

---

## Responsive

| Katman | Beklenti |
|--------|-----------|
| **Mobile** | Tek kolon; dokunma hedefleri min ~44px; font-size küçültme sınırlı (okunabilirlik). |
| **Tablet** | İçerik genişliği artar; sidebar/admin’de breakpoint ile düzen değişimi. |
| **Desktop** | Tam genişlik içerik + isteğe bağlı kenar boşlukları. |
| **Hosted document** | Önce okuma; gereksiz animasyon yok; iframe kullanılıyorsa yükseklik/scroll davranışı tanımlı. |
| **Admin / editor** | Toolbar ve form alanları küçük ekranda collapse veya drawer ile taşmaz. |

---

## Tema sistemi

**Mevcut temalar (örnek):** `minimal`, `corporate`, `dark`.

- **Token mantığı:** Renk ve tipografi **CSS değişkenleri** veya tek bir tema objesi üzerinden (`--doc-bg`, `--doc-fg`, `--doc-accent`, …).
- **Yeni tema ekleme:**
  1. Token setini doldur (light/dark ayrımı net).
  2. Tüm blok tiplerinde kontrast kontrolü.
  3. Print/PDF’de aynı tema veya print override dokümante edilir.
- **Kural:** Tema = görünüm; **içerik modelini** tema dosyasına taşımak yasak.

---

## Icon sistemi (Royalty Admin + ileride web portal)

**Amaç:** Tek görsel dil; rastgele ikon karışımı ve çözünürlük drift’i yok.

| Karar | Kural |
|--------|--------|
| **Kaynak set** | **Lucide** (stroke tabanlı) — tek paket; tree-shake ile içe aktarım. Alternatif olarak **Heroicons** (outline) yalnızca ürün kararı ile ve **tam migrasyon** ile değiştirilebilir; aynı ekranda iki aile **yasak**. |
| **Stroke / ölçü** | Varsayılan stroke **1.5–2px** ile hizalı; boyutlar **16 / 20 / 24 px** grid (spacing scale ile uyumlu). |
| **Renk** | İkon rengi `currentColor` veya tema `--admin-icon-muted` / `--admin-icon-strong` benzeri token; dolgu (filled) ikonlar yalnızca **primary CTA** veya **uyarı** için sınırlı kullanım. |
| **Erişilebilirlik** | Dekoratif ise `aria-hidden="true"`; anlam taşıyorsa buton/link içinde veya `aria-label` ile. |

### Alan → ikon eşlemesi (semantik)

Ürün modülleri menü ve boş durumlarda aynı metaforu kullanır; isimler örnek (Lucide export adları):

| Alan | Önerilen metafor | Örnek (Lucide) |
|------|------------------|----------------|
| **Data Health** | ölçüm, nabız, veri kaynağı | `Activity`, `Database` |
| **Governance** | sahiplik, politika, uyum | `Shield`, `Users` |
| **Lineage** | akış, köken, bağlantı | `GitBranch`, `Share2` |
| **Policy** | kural metni, kontrol listesi | `FileText`, `ListChecks` |
| **Violation** | uyarı, risk | `AlertTriangle`, `OctagonAlert` |

**Kural:** Aynı anlam iki farklı ikonla temsil edilmez (ör. ihlal için hem `AlertCircle` hem `AlertTriangle` kullanılmaz).

---

## Badge ve durum renk eşlemesi

**Amaç:** Durum = renk sözlüğü tek kaynak; rastgele `green` / `red` sınıf dağılımı yok.

| Amaç | Rol | Tipik kullanım |
|------|-----|----------------|
| **Nötr** | Bilgi, pasif, ikincil | Gri / slate token |
| **Bilgi** | Devam eden iş, ipucu | Mavi ton (mevcut admin vurgusu ile uyumlu) |
| **Başarı / iyi** | Tamamlandı, sağlıklı skor eşiği üstü | Yeşil — **düşük doygunluk** (neon yok) |
| **Uyarı** | Dikkat, SLA yaklaşıyor | Amber / turuncu |
| **Kritik / hata** | İhlal açık, bloklayıcı | Kırmızı; metin kontrastı WCAG |

**Kural:** Tenant App’te `gov-*` ve `admin-*` badge sınıfları **önce** kullanılır; yeni durum gerekiyorsa token + bu tabloya satır eklenir (`42-design-admin-ui.md` ile çakışma kontrolü).

---

## Tablo vs kart yoğunluğu

| Öğe | Ne zaman tablo | Ne zaman kart |
|-----|----------------|----------------|
| **Tablo** | Çok satırlı listeler, sıralama, filtre, karşılaştırma (katalog, ihlal listesi, varlık tablosu) | — |
| **Kart** | Tek varlık özeti, ayar grupları, okuma akışı (asset detail bölümleri) | — |
| **Yoğunluk** | Satır yüksekliği **kompakt** (enterprise); padding tablo hücresinde tutarlı; gereksiz büyük satır aralığı yok. |
| **Karışım** | Aynı ekranda tablo + kart: **üstte özet kartları**, altta tablo **veya** sol rail kart + ana tablo — hiyerarşi net olmalı. |

**Kural:** Pazarlama / landing sayfalarında (`web-portal`) kart/grid daha ferah olabilir; **Tenant App** yoğunluğu referans alınır ve portal ile karıştırılmaz (`plan-007`).

---

## Ürün alanı renk semantiği (domain)

**Amaç:** Nav, başlık şeridi ve modül köşe renginde hafif ayırıcı; **gövde metni** her zaman nötr.

| Alan | Semantik | Uygulama |
|------|----------|----------|
| **Data Health** | Güvenilirlik, ölçüm | Soğuk mavi / teal vurgu (mevcut health vurgusu ile hizalı) |
| **Governance** | Politika, organizasyon | İndigo / slate |
| **Lineage** | Bağlantı, akış | Morumsu veya çelik mavi — **çizgi grafik** ile aynı aile |
| **Policy** | Kurallar, metin | Nötr + ince border |
| **Violation** | Risk | Uyarı kırmızısı / amber; **kritik** ile **uyarı** ayrımı badge tablosundan |

**Kural:** Domain rengi **dekoratif gradient** veya tam sayfa arka plan boyaması için kullanılmaz; ürün ciddiyeti korunur.

---

## Tenant App — enterprise yoğunluk ve UI guard (Royalty Admin)

**Kapsam:** `apps/admin-web` içindeki **Tenant App** rotaları (`/app/*`): Data Health, Governance, ekip, faturalama. **Platform Console** (`/platform/*`) aynı kabukta fakat operatör odaklıdır; tenant ekranları **daha sıkı grid**, daha az “pazarlama ferahlığı” kullanır.

| Konu | Standart |
|------|-----------|
| **İkon seti** | **Lucide** tek kaynak; boyut **16 / 20 / 24**; stroke **1.5–2**; bu dosyadaki **Icon sistemi** ve alan→metafor tablosu. Yeni ekranda rastgele ikon paketi **yok**. |
| **Status / badge** | Önce mevcut `Badge` / `gov-*` / tema tonları; yeni durum = önce **Badge ve durum renk eşlemesi** tablosuna satır eklenir. |
| **Density / spacing** | **8px tabanlı** scale (`plus-shell` / kartlar); tablolarda kompakt satır; aynı ekranda kart+tablo karışımında **hiyerarşi** (özet üstte, detay altta). |
| **Enterprise görünüm** | Sakin nötr zemin, tek vurgu rengi (mavi ailesi); neon / tam sayfa gradient **yok**; metin kontrastı okunabilir. |
| **Cursor / AI “UI guard”** | Yeni tenant ekranı veya bileşen eklerken: **önce** [`42-design-admin-ui.md`](./42-design-admin-ui.md) (`admin-primary-btn`, `admin-secondary-btn`, `gov-card` vb.); rastgele Tailwind/inline stil **yok**; ikon+badge bu dosyadaki tablolarla hizalı. Platform Console’a **governance ürün yüzeyi ekleme** (operatörden tenant ihlal yönetimi) — ürün kuralı: [`meta-002`](./10-meta-002-project-overview.md), [`meta-003`](./10-meta-003-project-tracker.md). **Data Lineage** (Phase 3) tenant ekranları aynı yoğunluk ve bileşen disiplinini izler; güncel faz/slice özeti: [`meta-003`](./10-meta-003-project-tracker.md). |

---

## Print / PDF

- `@media print` ile gereksiz UI (nav, buton) gizlenir veya print’te yok sayılır.
- **Page break:** Başlık sonrası `break-after` / `break-inside: avoid` bloklar için tanımlı.
- **Kod / görsel:** Uzun kod blokları bölünebilir; kritik tablolar mümkünse `break-inside: avoid`.
- **Margin:** `@page { margin: … }` ile üretim; tarayıcı default’una bırakma.
- **Font fallback:** PDF motoru için sistem font stack + güvenli fallback; özel font varsa embed/lisans kontrolü.

---

## Bileşen standardı (document UI)

Anlamlı isimler ve tek sorumluluk:

| Bileşen | Sorumluluk |
|---------|------------|
| `DocumentContainer` | Genişlik, yatay padding, tema sınıfı kökü. |
| `DocumentHeader` | Logo, başlık, meta; tek kaynak. |
| `DocumentContent` | Blok listesi render girişi. |
| `Heading` | Seviye + tipografi token. |
| `Paragraph` | Rich text / satır içi stil. |
| `List` | Sıralı/sırasız + iç içe kurallar. |
| `Quote` | Alıntı stili. |
| `CodeBlock` | Pre, wrap, font. |
| `ImageBlock` | `max-width: 100%`, `object-fit`, alt metin politikası. |

---

## Yasaklar

- Web ve PDF için **ayrı render pipeline** (farklı HTML üretimi) — yalnızca tek kaynak + print varyantı.
- Rastgele margin/padding (`margin: 17px`).
- Üretim kodunda **yoğun inline style** (istisna: e-posta template’i gibi zorunlu alanlar ayrı dokümante).
- **Semantik olmayan markup** (ör. tüm sayfa `div` ile; başlık için `div` + class yerine `h1`–`h3`).

---

## Genişleme

- **Yeni component:** Önce token ve mevcut blok listesine uyum; sonra Story/smoke; PDF’de görünüm kontrolü.
- **Yeni tema:** Token dosyası + iki sayfa smoke (hosted + PDF).
- **Yeni sayfa tipi:** Document type + template kurallarına uyum (`20-rules-009-content-and-template.md`).

---

## Kısa checklist (PR öncesi)

- [ ] Hosted ve PDF aynı render kaynağını kullanıyor mu?
- [ ] Spacing scale dışına çıkılmadı mı?
- [ ] Mobil genişlikte içerik taşması kontrol edildi mi?
- [ ] Print preview veya PDF’de kırılma testi yapıldı mı?

---

## İlgili dokümanlar

- **İki yüzey (Platform / Tenant), güncel faz:** [10-meta-002-project-overview.md](./10-meta-002-project-overview.md), [10-meta-003-project-tracker.md](./10-meta-003-project-tracker.md).
- **Tek HTML hattının mimari sahipliği** (parser ayrımı, PDF orchestration): [20-rules-002-architecture.md](./20-rules-002-architecture.md).
- **Template vs tema vs blok modeli** (iş kuralları tasarımda değil): [20-rules-009-content-and-template.md](./20-rules-009-content-and-template.md).
- **Çok dilli UI metinleri ve PDF `lang`**: [20-rules-010-i18n.md](./20-rules-010-i18n.md).
- **Merkez indeks ve terminoloji**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
- **Royalty Admin kabuğu (`gov-*`, butonlar)**: [42-design-admin-ui.md](./42-design-admin-ui.md).
- **Phase 0.5 — public portal + GTM**: [10-plan-007-phase-0-5-product-surface-gtm.md](./10-plan-007-phase-0-5-product-surface-gtm.md).
