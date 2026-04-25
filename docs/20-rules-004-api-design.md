# API tasarım kuralları

**Amaç:** Tutarlı route'lar, öngörülebilir hatalar ve güvenli genişleme; admin/ürün içi API için zorunlu çerçeveyi tanımlamak. Gelecekteki public müşteri API'si de aynı prensipleri izler ([20-rules-001-product-scope.md](./20-rules-001-product-scope.md)).

---

## Özet kararlar

| Konu | Kural |
|------|--------|
| Kaynak | URL’ler **isimleri** (çoğul resource) ve HTTP fiilleri anlamlı kullanım. |
| Hata | Kanonik yapı: `{ "error": "string" }`. |
| Kimlik | Public’te **slug** veya **opaque id**; ikisini aynı endpoint’te karıştırma. |
| Versiyon | Public API `/v1/` prefix; internal API versiyonu header veya path ile dokümante. |

---

## Tasarım prensipleri

1. **Tutarlılık:** Aynı kavram her yerde aynı isim (`tenant`, `membership`, `module`).
2. **Tahmin edilebilirlik:** `GET /tenants` liste, `GET /tenants/:id` detay.
3. **Açık sözleşme:** Request/response schema'sı (OpenAPI veya TypeScript paylaşılan tipler).
4. **Minimal response:** İhtiyaç fazlası alan her zaman dönmez; `?expand=` ile genişletme.

---

## Route isimlendirme

- **Resource:** `/tenants`, `/users`, `/subscriptions`, `/modules`.
- **Action endpoint:** Sadece fiil gerekliyse ve REST’e sığmıyorsa — örn. `POST /tenant/modules` (aktivasyon işlemi).
- **Nested route:** Alt kaynak net ise — `GET /tenants/:id/memberships`; derinlik 2–3 ile sınırlı.

---

## Versiyonlama

| API | Öneri |
|-----|--------|
| **Internal (admin)** | Breaking’de path veya `Accept` version. |
| **Public** | `/v1/` sabit; v2 ayrı prefix; v1 deprecation süresi duyurulur. |

---

## Request / response

**Success:**

```json
{ "data": { ... }, "meta": { "requestId": "..." } }
```

veya liste için `{ "data": [...], "pagination": { ... } }` — proje tek stile bağlansın.

**Error:**

```json
{ "error": "validation_error" }
```

**HTTP status:** 4xx istemci, 5xx sunucu; `401`/`403` ayrımı net.

**Gelecek iyileştirme (plan):** Nested hata formatı (ör. `code`/`message`/`details` nesnesi) ileride değerlendirilebilir. Mevcut kanonik ve uygulanmış format `{ "error": "string" }` olarak korunur.

---

## Pagination, filtre, sıralama

- `?cursor=` veya `?page=` + `limit` — birini seç ve her yerde aynı kullan.
- Filtre: `?status=active`; sıralama: `?sort=createdAt&order=desc`.
- **Id vs slug:** Public paylaşımda slug; admin’de genelde internal id + opsiyonel slug lookup ayrı endpoint.

---

## Auth

- **Session/cookie:** Tarayıcı admin UI.
- **Bearer token:** API ve mobil/script.
- **API key:** Sunucu-to-sunucu; scope başına izin (`documents:read`).
- **Tenant-only:** tenant erişimi membership üzerinden middleware veya service katmanında tek yerde doğrulanır.

**Zorunlu erişim doğrulama kuralı:** Her API isteği şunları sağlamalıdır:

1. tenant context çözülmeli
2. membership doğrulanmalı
3. role izinleri doğrulanmalı
4. module activation durumu doğrulanmalı

`tenantId` zorunlu olmalı (path/header/session) ve tüm query'ler bu değere göre scope edilmelidir.

**Çok katmanlı enforcement açıklaması:** Access control çok katmanda enforce edilir:

- API layer
- service layer
- database layer

---

## Idempotency

Şu işlemlerde idempotency key veya doğal idempotent tasarım:

- Webhook işleme (olay id ile tek işlenir).
- `POST` export / e-posta gönderimi (aynı key tekrar = aynı sonuç veya no-op).
- Abonelik güncellemesi (provider event id).

---

## Async endpoint

| Senaryo | Tasarım |
|---------|---------|
| Hızlı iş | Sync 200 + body. |
| Uzun iş | `202` + `{ "jobId": "...", "statusUrl": "/jobs/..." }` veya webhook. |
| Durum | `GET /jobs/:id` polling; veya tamamlanınca webhook. |

---

## Rate limiting ve abuse

- IP + kimlik bazlı; header’da `X-RateLimit-*` (isteğe bağlı).
- Public ve auth’lu endpoint için farklı limitler.
- **Kota, abuse, token sızıntısı önlemleri (detay)**: [20-rules-005-security.md](./20-rules-005-security.md).

---

## Validation

- Sunucuda schema zorunludur; client validation yalnız UX içindir, güvenlik yerine geçmez.

---

## Dokümantasyon ve deprecation

- OpenAPI veya eşdeğeri repo’da güncel.
- **Deprecation:** `Deprecation` header + changelog; minimum 90 gün (ürün kararı).

---

## Anti-pattern’ler

- Aynı işi yapan iki route (`/createDocument` + `POST /documents`).
- UI’ın anlık ihtiyacına göre dağınık endpoint’ler.
- `200` ile hata gövdesi.
- Alan adlarında `snake_case` / `camelCase` karışıklığı (JSON’da proje genelinde tek stil).

---

## Kısa checklist

- [ ] Yeni endpoint REST ve isimlendirme kurallarına uyuyor mu?
- [ ] Hata gövdesi standart mı?
- [ ] Auth ve idempotency düşünüldü mü?
- [ ] OpenAPI güncellendi mi?

---

## İlgili dokümanlar

- **Tenant/membership/module veri modeli**: [20-rules-003-data-model.md](./20-rules-003-data-model.md).
- **Güvenlik derinliği**: [20-rules-005-security.md](./20-rules-005-security.md).
- **Merkez indeks**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
