# Sprint 4 — Büyüme, farklılaşma ve global ölçek

**Amaç:** Ürünü **ölçeklenebilir** ve **farklılaştırıcı** hale getirmek: analytics, içe aktarma genişlemesi, AI ile düzenleme, white-label, genel API. Sprint 1–3’teki çekirdek akışın üzerine eklenir.

---

## 1. Scalable architecture önerisi

### Prensipler

| Prensip | Uygulama |
|---------|----------|
| **Okuma/yazma ayrımı** | Doküman okuma (hosted) yüksek QPS → CDN + edge cache; yazma ve ağır işler API’de. |
| **Async işler** | PDF, uzun import, AI → kuyruk (SQS / Redis / BullMQ); worker pool ayrı ölçeklenir. |
| **Durumsuz API** | Horizontal scale; oturum JWT veya external session store. |
| **Çok kiracı hazırlığı** | `tenantId` veya `workspaceId` (white-label müşterisi) ileride kolon olarak eklenir. |

### Önerilen topoloji (hedef)

```text
                    ┌─────────────┐
                    │   CDN/WAF   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌────────────┐    ┌─────────────┐
   │ Web (SSR)│    │ API (state)│    │ Worker pool │
   └──────────┘    └─────┬──────┘    └──────┬──────┘
                       │                   │
                       ▼                   ▼
                 ┌──────────┐       ┌──────────┐
                 │ Postgres │       │  Queue   │
                 └──────────┘       └──────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │  Redis    │ │ S3/R2    │ │ ClickHouse / │
   │  cache    │ │ assets   │ │  events (?)  │
   └──────────┘ └──────────┘ └──────────────┘
```

**Sprint 4 pragmatik adım:** Postgres’te event tabloları + günlük agregasyon; trafik artınca **ClickHouse / BigQuery** veya **Tinybird** ile analitik taşınır. Worker için en az **bir** kuyruk (Redis tabanlı) devreye alınır.

---

## 2. Analytics tracking sistemi

### Olaylar (event şeması)

| Event | Alanlar | Amaç |
|-------|---------|------|
| `document.viewed` | `documentId`, `viewerHash?`, `path`, `referrer?` | View count |
| `document.export.pdf` | `documentId`, `source` | Dönüşüm |
| `profile.viewed` | `username` | Profil trafiği |
| `link.shared` | `documentId`, `channel` | Engagement proxy |
| `session.engaged` | `documentId`, `seconds`, `scrollDepth?` | Okuma süresi (opsiyonel) |

**View count:** idempotent değil; her görüntülemede `+1` veya **benzersiz günlük ziyaret** (cookie/localStorage + server dedup) — ürün kararı.

**Engagement:** basit: `time_on_page` (heartbeat POST her N saniye, throttle); gelişmiş: scroll depth yüzdesi.

### Uygulama

1. **Client:** hosted sayfada `POST /api/analytics/beacon` veya `navigator.sendBeacon` (sayfa kapanırken).
2. **Server:** hızlı insert → `AnalyticsEvent` tablosu (append-only) veya message queue → batch insert.
3. **Agregasyon:** cron veya materialized view: `DocumentStats { documentId, viewsTotal, views7d, exportsTotal }`.
4. **Dashboard:** sahibe `/dashboard/analytics` — grafik (Sprint 4 UI).

### Gizlilik

- IP hash veya kaldır; KVKK/GDPR için cookie banner ve “analytics opt-in” (AB’de sıkı).
- Ham log retention süresi (ör. 90 gün).

---

## 3. Parser genişletme stratejisi

### Ortak arayüz

Tüm kaynaklar **`InternalDocument`** (Sprint 1 modeli) üretir:

```text
ExternalAdapter → InternalDocument
GDocsAdapter   → InternalDocument
UrlAdapter     → InternalDocument
MarkdownPaste  → InternalDocument
```

### Google Docs

- **OAuth** ile Drive/Docs API veya **“Publish to web” HTML export URL** (kısıtlı format).
- Büyük dokümanlar: sayfa sayfa veya export batch → **async job**; tamamlanınca revision.

### URL → document

- **Readability** / **Mozilla Readability** ile ana içerik çıkarımı → tek `article` veya paragraflar.
- **SSRF koruması:** private IP bloklama, redirect limiti, allowlist (opsiyonel), timeout.
- Sonuç: `BlockNode[]` veya tek `paragraph` zinciri.

### AI cleanup & structuring

- **Girdi:** ham `InternalDocument` veya düz metin.
- **Çıktı:** başlık hiyerarşisi, liste düzeltme, gereksiz tekrar kırpma (LLM veya kural tabanlı ön işleme + LLM).
- **Async:** `POST /api/documents/:id/ai-structure` → job → revision güncelleme.
- **Maliyet:** Pro kullanıcı kota (ör. ayda N istek); API anahtarı sunucuda.

### Versiyonlama

- Her import/AI sonrası yeni **Revision**; kullanıcı geri alabilir (Sprint 4 veya 5).

---

## 4. White-label mimarisi

### Seviyeler

| Seviye | Açıklama |
|--------|----------|
| **Subdomain** | `acme.app.example.com` — wildcard DNS + TLS (cert-manager veya Cloudflare) |
| **Custom domain** | `docs.acme.com` — CNAME → platform; domain doğrulama (TXT) + SSL |

### Veri modeli

**`WhiteLabelConfig`** (org veya power-user başına):

| Alan | Örnek |
|------|--------|
| `ownerId` | User veya Team |
| `subdomain` | `acme` |
| `customDomain` | `docs.acme.com` |
| `verificationToken` | DNS TXT |
| `sslStatus` | pending \| active |
| `brandOverride` | BrandKit referansı |

### Routing

- **Host header** middleware: `request.headers.host` → config lookup → aynı uygulama, farklı `baseUrl` ve tema.
- **Cookie domain:** custom domain’de izole oturum dikkat gerektirir (cross-subdomain SSO sonraya).

### API / faturalama

- Genelde **Enterprise / Pro+** özelliği; Paddle’da ayrı ürün veya manuel faturalama.

---

## 5. API design (public API)

### Kimlik

- **API keys:** `sk_live_...` — hash’li saklama, prefix ile listeleme.
- **Scope:** `documents:read`, `documents:write`, `exports:pdf`, `analytics:read`.

### REST örnekleri

| Method | Path | Açıklama |
|--------|------|----------|
| `GET` | `/v1/documents` | Liste (pagination) |
| `POST` | `/v1/documents` | Oluştur (JSON veya import job) |
| `GET` | `/v1/documents/:id` | Detay + son revision özeti |
| `POST` | `/v1/documents/:id/export/pdf` | Job veya sync PDF URL |
| `GET` | `/v1/documents/:id/analytics` | Agregat istatistik |

### Sürümleme

- URL prefix `/v1/`; kırıcı değişiklikte `/v2/`.

### Limitler

- Rate limit: IP + API key başına (Redis sliding window).
- Webhook (outbound): `document.ready`, `export.completed` — imzalı payload.

### OpenAPI

- `openapi.yaml` yayınlanır; Postman collection üretimi.

---

## 6. Sprint 4 özellik eşlemesi

| Özellik | Ana teknik yük |
|---------|----------------|
| Analytics | Event store + agregasyon + beacon endpoint |
| Google Docs | OAuth + adapter + async job |
| URL → doc | Readability + SSRF güvenliği |
| AI yapılandırma | LLM + kota + async |
| White-label | DNS, TLS, host middleware |
| API | API keys, OpenAPI, rate limit |

---

## 7. Bu belgenin yeri

- Önceki sprintler: [`30-spec-001-sprint1-mvp.md`](./30-spec-001-sprint1-mvp.md) … [`30-spec-003-sprint3-monetization.md`](./30-spec-003-sprint3-monetization.md)  
- Üst roadmap: [`10-plan-001-document-saas.md`](./10-plan-001-document-saas.md)

**Not:** Bu sprint **yüksek mühendislik ve operasyon** içerir; özellikleri alt sprint’lere bölmek (4a: analytics + API, 4b: import + AI, 4c: white-label) önerilir.
