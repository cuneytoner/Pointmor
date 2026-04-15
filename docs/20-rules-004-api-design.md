# API tasarım kuralları

**Amaç:** Tutarlı route’lar, öngörülebilir hatalar ve güvenli genişleme; **admin / ürün içi API** için zorunlu çerçeve; gelecekteki **public müşteri API’si** aynı prensipleri miras alır ([20-rules-001-product-scope.md](./20-rules-001-product-scope.md) — public API MVP dışı olabilir, tasarım dili burada kopmaz).

---

## Özet kararlar

| Konu | Kural |
|------|--------|
| Kaynak | URL’ler **isimleri** (çoğul resource) ve HTTP fiilleri anlamlı kullanım. |
| Hata | Tek yapı: `code`, `message`, isteğe bağlı `details` (validation alanları). |
| Kimlik | Public’te **slug** veya **opaque id**; ikisini aynı endpoint’te karıştırma. |
| Versiyon | Public API `/v1/` prefix; internal API versiyonu header veya path ile dokümante. |

---

## Tasarım prensipleri

1. **Tutarlılık:** Aynı kavram her yerde aynı isim (`document`, `workspace`).
2. **Tahmin edilebilirlik:** `GET /documents` liste, `GET /documents/:id` detay.
3. **Açık sözleşme:** Request/response şeması (OpenAPI veya TypeScript paylaşılan tipler).
4. **Minimal response:** İhtiyaç fazlası alan her zaman dönmez; `?expand=` ile genişletme.

---

## Route isimlendirme

- **Resource:** `/documents`, `/users`, `/subscriptions`.
- **Action endpoint:** Sadece fiil gerekliyse ve REST’e sığmıyorsa — örn. `POST /documents/:id/publish` (tek seferlik işlem).
- **Nested route:** Alt kaynak net ise — `GET /documents/:id/revisions`; derinlik 2–3 ile sınırlı.

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
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human readable",
    "details": [{ "path": "email", "message": "..." }]
  }
}
```

**HTTP status:** 4xx istemci, 5xx sunucu; `401`/`403` ayrımı net.

**Bilinen pragmatik sapma (plan):** Bazı iç uçlar (ör. entitlement ihlali) düz JSON `{ "error": "plan_limit_exceeded", "metric": "..." }` dönebilir; uzun vadede üstteki `error` nesne modeli ile hizalanması hedeflenir ([`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) — sıradaki adımlar).

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
- **Owner-only:** `document.userId === auth.userId` kontrolü middleware veya service katmanında tek yerde.

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

- Sunucuda şema zorunlu; client validation UX içindir, güvenlik değildir.

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

- **Entity ve slug veri modeli**: [20-rules-003-data-model.md](./20-rules-003-data-model.md).
- **Güvenlik derinliği**: [20-rules-005-security.md](./20-rules-005-security.md).
- **Merkez indeks**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
