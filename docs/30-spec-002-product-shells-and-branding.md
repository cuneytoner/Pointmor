# Ürün shell’leri ve branding (spec)

**Amaç:** Tek platform çekirdeği üzerinde birden fazla ürün yüzeyinin nasıl konumlandığını netleştirmek.

---

## Çekirdek fikir

- **Single backend:** Ortak API/backend altyapısı kullanılır.
- **Multiple product surfaces:** Farklı ürün deneyimleri ayrı shell/yüzey olarak sunulur.

Bu modelde ürünler ayrı hissedilir; platform çekirdeği ise ortak kalır.

---

## Örnek yüzeyler

| Ürün yüzeyi | Kapsam |
|-------------|--------|
| **Pointmor** | Cafe/loyalty modülü odaklı ürün yüzeyi |
| **AI Act product** | AI Act uyum modülü için ayrı ürün yüzeyi |

---

## Kurallar

1. Tüm ürün yüzeyleri ortak **auth**, **tenant** ve **billing** çekirdeğini paylaşır.
2. Tüm ürün yüzeyleri ortak UI **design system** ilkelerine uyar.
3. Ürün yüzeyi ayrımı, core veri modeli ve tenant izolasyonunu bozmaz.

---

## Routing

- Cafe yüzeyi: `/app/cafe/*`
- AI Act yüzeyi: `/app/ai-act/*`

**Kural:** Route ayrımı ürün deneyimi içindir; güvenlik ve tenant erişim kontrolleri ortak core tarafından uygulanır.

---

## Branding yaklaşımı

1. Ürünler ayrı landing page / mesajlaşma dili kullanabilir.
2. Buna rağmen altyapı olarak aynı platform core’unu paylaşır.
3. Marka farklılaşması, kimlik/erişim modelinde ayrık platform anlamına gelmez.

---

## Hedef

Platform üzerinde **micro-SaaS hissi** üretmek: kullanıcıya ürün bazlı net deneyim sunarken, işletme tarafında tek çekirdekten yönetim ve ölçeklenebilirlik sağlamak.

---

## İlgili dokümanlar

- Modüler mimari kuralları: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- AI Act modül spec’i: [`30-spec-001-ai-act-module.md`](./30-spec-001-ai-act-module.md)
- Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
