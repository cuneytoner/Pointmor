# Mimari kuralları

**Amaç:** Monorepo içinde sınırları net, değişime açık ama gereksiz soyutlamasız bir yapı.

---

## Özet kararlar

| Katman | Tek cümle |
|--------|------------|
| INPUT | Harici veya uygulama içi kaynak (URL, dosya, form) → ham veya yarı yapılandırılmış veri. |
| PROCESS | Normalize, doğrula, zenginleştir → **internal document model**. |
| OUTPUT | Model → tek HTML string (tema ile). |
| DELIVERY | Hosted URL, PDF, e-posta eki, API yanıtı. |
| PRESENTATION | Admin UI, profil listesi, paylaşım ekranı — **modeli doğrudan DB şemasına eşitlemez**. |

**Altın kural:** **Internal document model** ile **Prisma entity** ayrı düşünülür; UI yalnızca API veya sunucu tarafından hazırlanmış DTO görür.

---

## Ana prensipler

1. **Separation of concerns:** Parser import etmez; renderer harici SDK bilmez.
2. **Tek sorumluluk:** Bir modül tek işi yapar (ör. `markdown-import` sadece Markdown → model).
3. **Modülerlik:** Özellikler `core/` + `app/api` + `lib` ile sınırlı; “god file” yok.
4. **YAGNI:** İlk aşamada microservice ve dağıtık event bus yok; ihtiyaç ölçülür.

---

## Sistem katmanları ve bağımlılıklar

```
INPUT (connectors)  →  PROCESS (normalize, validate)  →  OUTPUT (render)
                              ↓
                      STORAGE (DB, object storage)
                              ↓
DELIVERY (routes, jobs, email)  →  PRESENTATION (Next pages, PDF, iframe)
```

**İzin verilen bağımlılık yönü:**  
`INPUT` → `PROCESS` → `OUTPUT` → `DELIVERY`  
`STORAGE` ← `PROCESS`, `DELIVERY`  
`PRESENTATION` → API/route (sunucu), asla doğrudan DB’ye (client’tan) değil.

**Yasak:** `OUTPUT` (HTML renderer) modülünün `INPUT` parser’ı import etmesi.

---

## Monorepo

| Alan | Kural |
|------|--------|
| `apps/*` | Çalışan uygulama (ör. admin-web, api). |
| `packages/*` | Paylaşılan kod **gerçekten iki app’te kullanılacaksa** çıkar. |
| **Ne zaman package?** | Aynı tip tanımı + utils üçüncü kez kopyalanıyorsa; tek app’e özel ise çıkarma. |

**Shared utilities:** `packages/shared-types` veya `apps/xxx/src/core` — önce app içi `core`, tekrar edince package.

---

## Render mimarisi

1. **Internal document model** (JSON, version alanlı) tek doğruluk kaynağı.
2. **HTML üretimi** tek fonksiyon/hattı: `model + theme + brand` → string.
3. **Hosted:** Aynı HTML (veya aynı pipeline çıktısı) sunulur.
4. **PDF:** Puppeteer/playwright ile aynı HTML yüklenir; ayrı React tree üretilmez.

---

## Repository / service / route

- **Route handler:** İstek doğrula, orchestration, yanıt. İş mantığı 300 satır route içinde değil.
- **Service:** `createDocument`, `renderPdf`, `sendEmail` gibi use-case fonksiyonları.
- **Repository:** Prisma çağrıları tek yerde toplanabilir (küçük projede service içi de olabilir; büyüyünce ayrılır).

**UI:** `app/` veya `pages/` = route + composition; `components/` = yeniden kullanılabilir; `features/<name>/` = özellik kümesi (isteğe bağlı).

---

## Async job ve worker

| Ne zaman sync? | Ne zaman queue? |
|----------------|-----------------|
| Import < few s, kullanıcı bekleyebilir | Büyük doküman, toplu export |
| Tek PDF, timeout içinde | E-posta toplu gönderim, analytics batch |

**Kural:** Önce sync + timeout + kullanıcı geri bildirimi; queue, ölçüm sonrası.

**Queue gerektiren işler:** Toplu PDF, e-posta kampanyası, webhooks sonrası yeniden işleme, ağır görsel işleme.

---

## Cache

- **CDN / HTTP cache:** Hosted statik HTML ve public asset için; `Cache-Control` ve invalidation stratejisi dokümante.
- **Uygulama cache:** Redis vb. yalnız ölçülen darboğazda; **cache key** = `documentId` + `revision` veya `etag`.

---

## Feature ekleme — karar ağacı

1. Veri modeli değişiyor mu? → `20-rules-003-data-model.md` + migration planı.
2. API sözleşmesi değişiyor mu? → `20-rules-004-api-design.md`.
3. Çoklu dil metni var mı? → `20-rules-010-i18n.md`.
4. Hosted/PDF görünümü değişiyor mu? → `20-rules-008-design-system.md` + tek render hattı.
5. Secret / dış URL? → `20-rules-005-security.md`.

---

## Route ve URL

- **Slug:** İnsan okunur + çakışmada kısa suffix; immutable slug vs redirect politikası ürün kararı.
- **Public / unlisted / password:** Query veya path sözleşmesi tutarlı; token **loglanmaz**.
- **Canonical:** SEO gerekiyorsa tek canonical URL; parametreli paylaşımda `noindex` düşünülmeli.

---

## Anti-pattern’ler

- Route dosyasında iş mantığı ve DB + harici API çağrısı üst üste.
- Parser çıktısını doğrudan React props’a bağlamak (normalize adımı atlanmış).
- Prisma modelini frontend’e sızdırmak.
- İlk sprintte “her servis ayrı repo” microservice taklidi.

---

## Kısa checklist

- [ ] Yeni kod hangi katmana ait?
- [ ] Import yönü yukarıdaki kurallara uyuyor mu?
- [ ] HTML/PDF tek kaynaktan mı?
- [ ] Async gereksinimi ölçüldü mü?

---

## İlgili dokümanlar

- **Görsel/print detay** (token, `@media print`): [20-rules-008-design-system.md](./20-rules-008-design-system.md) — mimari burada tekrar edilmez.
- **Şema, revision, slug**: [20-rules-003-data-model.md](./20-rules-003-data-model.md); **migration deploy sırası**: [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md).
- **API şekli**: [20-rules-004-api-design.md](./20-rules-004-api-design.md); **rate limit / XSS / SSRF derinliği**: [20-rules-005-security.md](./20-rules-005-security.md).
- **Queue/worker operasyonu** (CPU, alert): [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md).
- **Merkez indeks, terminoloji, altın kurallar**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
