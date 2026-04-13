# Global doküman SaaS — master plan

> **Arşiv / referans (aktif roadmap değil)**  
> Bu metin, monorepoda daha önce hedeflenen **document SaaS** ürünü için tutulmuş **tarihsel üst düzey plandır**. Uygulama kodu kaldırılmıştır. **Güncel stratejik yön:** çok kiracılı backbone üzerinde **Data Health → Governance → Lineage** — [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md), [`10-plan-005-data-platform-three-products.md`](./10-plan-005-data-platform-three-products.md), [`10-plan-006-data-platform-registry-agents-spec.md`](./10-plan-006-data-platform-registry-agents-spec.md).  
> Document yönü yeniden gündeme gelirse bu belge **bilinçli olarak** [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) ve mimari kurallarla yeniden hizalanmalıdır.

---

Bu belge, metin ve şablonlardan **PDF, barındırılmış HTML, güvenli paylaşım ve profil arşivi** sunan ürünün **tek üst düzey planı**dır. Amaç: **önce çalışan MVP**, sonra iteratif geliştirme; gereksiz karmaşadan kaçınılır.

**Detaylı sprint teknikleri** ayrı dosyalarda tutulur (aşağıda linkler). Bu dosya **özet + yön + sprint birleşik haritası** içerir.

---

## Ürün özeti

| Vaat | Açıklama |
|------|----------|
| **Tek kaynak** | Aynı içerik → branded PDF + hosted HTML |
| **Paylaşım** | Public, unlisted (token), şifre |
| **Profil** | Kullanıcı altında arşiv ve sergileme |
| **Büyüme** | Ödeme (Paddle), planlar, API, white-label (sprintlere göre) |

---

## Katmanlı mimari (4 katman)

| Katman | Rol | Örnek bileşenler |
|--------|-----|------------------|
| **1. INPUT** | Ham içeriği toplama ve normalize etme | Uygulama içi başlık/bloklar; ileride Markdown, harici kaynaklar, URL |
| **2. PROCESS** | İşleme, şablon, tema, brand | `InternalDocument`, tema, şablon paketi, brand kit |
| **3. OUTPUT** | Artefact üretme | Puppeteer PDF, HTML snapshot |
| **4. DELIVERY** | Yayın, erişim, profil, e-posta, ödeme | Route’lar, visibility, Paddle, analytics, API |

Veri akışı: **INPUT → (Document + Revision) → PROCESS → OUTPUT → DELIVERY**.

---

## Modüler mimari (özet)

- **`ingestion`**: Uygulama içi oluşturma; ileride Markdown / (Sprint 4) GDocs, URL adapter → ortak **InternalDocument**.
- **`render`**: Tema + şablon → HTML.
- **`export`**: HTML → PDF (Puppeteer).
- **`publishing`**: Slug, visibility, paylaşım token’ı.
- **`identity`**: Kullanıcı, profil (`username`); **Sprint 2+** e-posta+şifre; **Sprint 3 veya Auth+ slice** ile planlı **OAuth (önce Google)** — ayrıntı [`10-plan-002-auth-identity-roadmap.md`](./10-plan-002-auth-identity-roadmap.md).
- **`billing`**: (Sprint 3) Paddle, plan, capability.
- **`analytics`**: (Sprint 4) Olaylar + agregasyon.

Monolit ile başlanır; ağır işler için **kuyruk + worker** (Sprint 2+).

### Veri katmanı (gelecek uygulama)

Document ürünü için kalıcı depolama **henüz bu monorepoda yok** (önceki Next.js uygulaması kaldırıldı). Hedef mimaride SQLite veya PostgreSQL, `apps/api` ile birleşme vb. **ürün ve ölçek tetikleyicilerine** bağlıdır — şema disiplini: [`20-rules-003-data-model.md`](./20-rules-003-data-model.md), deploy: [`20-rules-006-deployment-and-ops.md`](./20-rules-006-deployment-and-ops.md).

---

## Önerilen monorepo yapısı (özet)

```
apps/
  web/          # Next.js (SSR): editor, /p veya /u/... hosted, pricing
  api/          # REST / auth / webhooks (veya Route Handlers tek repo)
  worker/       # PDF, e-posta, import job (ölçekte zorunlu)
packages/
  core/         # Document modeli, capabilities
  render/       # HTML + tema
  adapters/       # İleride harici kaynak adapter’ları
```

---

## Master roadmap — 4 sprint (her biri ~1–2 hafta)

Aşağıdaki tablo **tüm sprint belgelerinin birleşik özeti**dir. Uygulama ayrıntısı ilgili `sprintN-*.md` dosyasında.

| Sprint | Odak | Çıktı (kısa) | Detay belge |
|--------|------|--------------|-------------|
| **1** | Çekirdek MVP | Minimal doküman modeli (başlık + bloklar), normalize JSON, HTML renderer, 3 tema, logo, Puppeteer PDF, hosted sayfa, **public + unlisted (token)**; route: `/p/[slug]` veya doğrudan Sprint 2’ye uyumlu slug modeli | [**30-spec-001-sprint1-mvp.md**](./30-spec-001-sprint1-mvp.md) |
| **2** | Delivery + profil | `/u/[username]`, `/u/[username]/docs/[slug]`, visibility (**public / unlisted / password**), **showOnProfile**, e-posta ile PDF + link, auth + erişim middleware | [**30-spec-002-sprint2-delivery-profile.md**](./30-spec-002-sprint2-delivery-profile.md) |
| **3** | Monetization (+ planlı ilk OAuth) | **Paddle**, **free / pro**, capability (watermark, premium tema, unlimited export, şablonlar, brand kit), `/pricing`, template packs; **Google OAuth** istenirse bu sprint içinde ayrı milestone veya hemen sonrası — [**30-spec-003-sprint3-monetization.md**](./30-spec-003-sprint3-monetization.md), [**10-plan-002-auth-identity-roadmap.md**](./10-plan-002-auth-identity-roadmap.md) |
| **4** | Ölçek + farklılaşma | **Analytics** (view, engagement), **Google Docs** + **URL→doc**, **AI cleanup**, **white-label** (custom domain / subdomain), **public API** (keys, OpenAPI) | [**30-spec-004-sprint4-scale-differentiation.md**](./30-spec-004-sprint4-scale-differentiation.md) |

### Sprint 1 — özet görevler

- Document JSON modeli + minimal bloklar → `render-html` + tema + logo.
- `POST /api/documents`, `POST /api/preview`, `POST .../export/pdf`.
- Hosted: `/p/[slug]`; paylaşım: public | unlisted + token.
- UI: tercihen tek sayfa wizard.

### Sprint 2 — özet görevler

- **User** (`username`) + **Document** (`@@unique([ownerId, slug])`), `visibility`, `passwordHash`, `showOnProfile`. **Social login bu sprintte yok**; OAuth için yalnızca roadmap ve (isteğe bağlı) `OAuthAccount` şema taslağı — [`10-plan-002-auth-identity-roadmap.md`](./10-plan-002-auth-identity-roadmap.md).
- Canonical URL: **`/u/[username]/docs/[slug]`** (Sprint 1 `/p/[slug]` 301 ile birleştirilebilir).
- `POST .../send-email`, erişim: `assertDocumentAccess`.
- Bileşenler: `ProfileLayout`, `DocumentLayout`, `PasswordGate`, `SendEmailDialog`.

### Sprint 3 — özet görevler

- **Auth (planlı):** Ödeme ve kullanıcı kimliği netleştikten sonra **Google ile giriş** öncelikli; Paddle ile **paralel veya checkout sonrası** slice — çakışma: yok (davet/workspace ile aynı `User` üzerinden). GitHub / Microsoft / Apple / magic link sonraki fazlar.
- **Team / Workspace (tam uygulama):** Şema ön-hazırlığı repo içinde (ör. `Document.workspaceId`, `User.defaultWorkspaceId`, `Plan.planType: free | pro | team`); Sprint 3’te **Workspace** tablosu, FK’lar, üyelik ve faturalama ile tamamlanır — breaking change olmaması için alanlar önceden eklendi.
- Paddle checkout + **webhook** (imzalı, idempotent).
- `getCapabilities(planKey)` → `planType` + watermark, `themes.premium`, `export.unlimited`, `templates.*`, `brandKit`.
- Template packs klasör yapısı + Pro gate.
- Brand kit tablosu + CSS değişkenleri → PDF/HTML.

### Sprint 4 — özet görevler

- Event pipeline + agregasyon; beacon endpoint; gizlilik.
- Adapter’lar: GDocs, URL (SSRF-safe), AI job async.
- White-label: Host middleware, DNS/TLS.
- API: `/v1`, API keys, rate limit, OpenAPI.

---

## Öncelik sırası (neden bu sıra)

| Önce | Çünkü |
|------|--------|
| Güvenli parse + HTML | PDF ve hosted tek doğruluk kaynağı |
| Tema + logo | Ürün “export aracı” gibi görünmez |
| PDF + hosted | çift teslimat vaadi |
| Profil + şifre + e-posta | paylaşım ve güven |
| Paddle + capabilities | gelir |
| Analytics, API, WL | operasyon ve ölçek yüzeyi |

---

## Feature → sprint eşlemesi (güncel)

| Alan | Sprint |
|------|--------|
| Minimal doküman, tema×3, logo, PDF, hosted, public/unlisted | 1 |
| Profil `/u/...`, doc URL, password, e-posta PDF, `showOnProfile`, e-posta+şifre auth | 2 |
| Paddle, `planType` (free/pro/team), Team/Workspace FK’ları, watermark, premium tema, kota, şablon, brand kit; **planlı: Google OAuth** | 3 |
| Analytics, GDocs, URL import, AI, white-label, public API | 4 |
| Ek OAuth (GitHub, Microsoft, …), magic link, Apple (ihtiyaç) | Backlog (Sprint 4 sonrası) |

---

## MVP tanımı (Sprint 1 sonu)

Üretimde çalışan: içe aktarma → normalize → HTML + tema + logo → PDF → hosted sayfa → public/unlisted link.  
**Kullanıcı profili ve şifreli paylaşım** Sprint 2’de tamamlanır (MVP “tek link” ile bile piyasaya çıkabilir; ürün kararı).

---

## Riskler (kısa)

- **Harici kaynak import (Sprint 4):** URL fetch ve üçüncü parti API’ler — ToS, kota ve SSRF; tek strateji seçin.
- **PDF:** Serverless timeout → VM veya kuyruk.
- **XSS:** Her zaman sanitize; PDF aynı pipeline.
- **Paddle:** Sandbox’ta uçtan uca test; webhook olmadan prod yok.
- **SSRF (Sprint 4 URL import):** Private IP bloklama, redirect limiti.

---

## Detaylı sprint belgeleri (kaynak)

| Dosya | İçerik |
|-------|--------|
| [30-spec-001-sprint1-mvp.md](./30-spec-001-sprint1-mvp.md) | Klasör yapısı, API route’ları, document JSON, akış diyagramı, UI |
| [30-spec-002-sprint2-delivery-profile.md](./30-spec-002-sprint2-delivery-profile.md) | DB şeması, auth, middleware, e-posta, routing, bileşenler |
| [30-spec-003-sprint3-monetization.md](./30-spec-003-sprint3-monetization.md) | Paddle, capabilities, pricing, template mimarisi, brand kit |
| [30-spec-004-sprint4-scale-differentiation.md](./30-spec-004-sprint4-scale-differentiation.md) | Ölçek topolojisi, analytics, parser genişleme, WL, API |
| [10-plan-002-auth-identity-roadmap.md](./10-plan-002-auth-identity-roadmap.md) | Social login, magic link, MVP vs backlog, güvenlik ve şema notları |

---

## Royalty monorepo ile ilişki

Bu **document SaaS** ürün planı, **Royalty** deposundaki operatör admin paneli ([`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md), [`10-plan-003-greenfield-admin-prompts.md`](./10-plan-003-greenfield-admin-prompts.md)) ile **ayrı ürün çizgileri** olarak durur; ileride tek şirket altında birleştirilirse: ortak auth, faturalama veya paylaşılan API gateway buradan türetilir.

---

## Belge revizyonu

- **Master birleştirme:** Tüm sprint özetleri bu dosyada toplandı; ayrıntı sprint dosyalarında kaldı.
- Güncelleme yaparken: önce ilgili `sprintN-*.md`, sonra bu dosyadaki özet tabloları senkron tutun.
