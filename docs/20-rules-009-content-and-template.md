# İçerik ve şablon kuralları

**Amaç:** İçerik yapısı, şablon ve tema ayrımı net; hosted ve PDF aynı çekirdek değeri korur.

---

## Özet kararlar

| Katman | Kontrol ettiği |
|--------|----------------|
| **İçerik (model)** | Bloklar, sıra, meta — kaynak bağımsız. |
| **Template** | Bölüm düzeni (kapak, CTA), blok yerleşimi. |
| **Theme** | Renk, tipografi, spacing token’ları. |
| **Brand kit** | Logo, marka renkleri, yasal footer. |
| **Renderer** | Model → HTML; şablondan bağımsız blok HTML’i üretir. |

**Kural:** Template **iş kurallarını** içermez; sadece düzen ve hangi bölümlerin görüneceğini tanımlar.

---

## İçerik prensipleri

1. **Content first:** Metin ve yapı önce; süs sonra.
2. **Structure before decoration:** Başlık hiyerarşisi ve listeler anlamlı.
3. **Template içerikten bağımsız:** Aynı model farklı template’te çalışabilmeli.
4. **Branded output okunabilirliği bozmaz:** Logo ve renk metni okunaksız kontrastla bastırmaz.

---

## Document type (ürün kategorileri)

Örnek tipler: `proposal`, `report`, `invitation`, `client_update`, `general`.

- Tip, **varsayılan template** ve isteğe bağlı **zorunlu bölümleri** seçer (ör. davetiye için tarih alanı).
- Tip = iş kuralı etiketi; DB’de `documentType` veya `templateId` ile tutarlı.

---

## Template pack

- **Template:** Hangi section’lar (cover, header, body, CTA, footer, appendix) ve sıra.
- **Theme:** Görsel token (`20-rules-008-design-system.md`).
- **Brand kit:** Logo URL, birincil renk, yasal metin.
- **Renderer:** Blok → HTML; template sadece “CTA bloğu buraya” slot verir.

---

## Section yapısı

| Section | Ne zaman |
|---------|-----------|
| Cover | Rapor/teklif; kısa dokümanda opsiyonel. |
| Header | Logo + başlık + meta. |
| Body | Ana blok akışı. |
| CTA | Tek veya çift buton metni; template kararı. |
| Footer | Yasal / iletişim; marka zorunluluğu. |
| Appendix | Uzun tablo/ek; sayfa kırığı ile. |

Her template dokümanda hangi section’ların **opsiyonel** olduğu listelenir.

---

## Hosted ve PDF tutarlılığı

- **Tek HTML kaynağı** ürün genelinde tanımı: [20-rules-002-architecture.md](./20-rules-002-architecture.md) (hattın sahipliği) ve [20-rules-008-design-system.md](./20-rules-008-design-system.md) (görsel + `@media print`). Bu dosyada yinelenen mimari anlatılmaz; burada yalnızca **template/section** açısından aynı çıktı iki yüzeyde tutarlı olmalıdır.
- PDF yalnızca print kuralları ile genişler; hosted’da gizlenen bölüm PDF’de de yok.

---

## Fallback kuralları

| Durum | Davranış |
|--------|-----------|
| Başlık yok | `meta.title` veya “Untitled” i18n anahtarı. |
| Görsel yok | Logo slotu boş veya placeholder; layout çökmez. |
| Section eksik | Template varsayılanı: bölümü atla veya dar placeholder. |
| Unsupported block | Bilinen fallback UI + opsiyonel “orijinal içerik özeti”. |

---

## Yeni template ekleme

1. Mevcut modelde blok seti destekleniyor mu?
2. **Varyant** yeter mi (aynı template, farklı theme)? — çoğu zaman evet.
3. Gerçekten yeni düzen mi? → Yeni template id + dokümantasyon.
4. **İsimlendirme:** `proposal-v2`, `report-minimal` — kebab-case, anlamlı.

---

## Uzun / kısa / görsel ağırlıklı doküman

- **Uzun:** TOC (hosted’de), page-break (PDF), kod bloklarında kırılma.
- **Kısa:** Gereksiz cover yok; boş alan theme ile doldurulmaz “tasarımla”.
- **Çok görselli:** Grid max genişlik; lazy load hosted’da; PDF’de çözünürlük limiti.

---

## Anti-pattern’ler

- Template içinde tek bir sağlayıcıya kilitlenmiş kod.
- Her müşteri için yeni template (bakım maliyeti).
- Eksik içeriği dev tipografi veya dekorasyonla gizlemek.

---

## Kısa checklist

- [ ] Bu değişiklik renderer mı template mi theme mi?
- [ ] Hosted + PDF ikisi de gözden geçirildi mi?
- [ ] Fallback metinleri i18n ile mi?

---

## İlgili dokümanlar

- **i18n fallback anahtarları**: [20-rules-010-i18n.md](./20-rules-010-i18n.md).
- **Merkez indeks**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
