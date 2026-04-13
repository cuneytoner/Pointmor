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
- **Yeni sayfa tipi:** Document type + template kurallarına uyum (`rules-009-content-and-template.md`).

---

## Kısa checklist (PR öncesi)

- [ ] Hosted ve PDF aynı render kaynağını kullanıyor mu?
- [ ] Spacing scale dışına çıkılmadı mı?
- [ ] Mobil genişlikte içerik taşması kontrol edildi mi?
- [ ] Print preview veya PDF’de kırılma testi yapıldı mı?

---

## İlgili dokümanlar

- **Tek HTML hattının mimari sahipliği** (parser ayrımı, PDF orchestration): [rules-002-architecture.md](./rules-002-architecture.md).
- **Template vs tema vs blok modeli** (iş kuralları tasarımda değil): [rules-009-content-and-template.md](./rules-009-content-and-template.md).
- **Çok dilli UI metinleri ve PDF `lang`**: [rules-010-i18n.md](./rules-010-i18n.md).
- **Merkez indeks ve terminoloji**: [meta-001-rules-index.md](./meta-001-rules-index.md).
