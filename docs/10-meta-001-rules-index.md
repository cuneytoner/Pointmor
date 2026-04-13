# Kural dokümanları — merkez giriş noktası

**Amaç:** `docs/` altındaki kural ve ilgili belgelerin **tek giriş noktası**; kavram çakışmasını önlemek, tekrarlayan altın kuralları bir yerde toplamak ve AI/insan için hızlı yönlendirme sağlamak.

**Stratejik yön (güncel):** Ürün **data platform** (Data Health → Governance → Lineage). **Phase 1** tamam; **Phase 2** çekirdek tamam; **aktif faz: Phase 3 — Data Lineage**. Sonraki roadmap: **Phase SaaS-1** (usage, limits, enforcement — **SaaS Core**), ardından **Phase SaaS-2** (billing, ödemeler — **Billing**). **Monetization / tam ödeme entegrasyonu kasıtlı olarak sona ertelenmiştir** (önce PMF ve ürün tamamlığı). Çok kiracılı **Platform Console + Tenant App + `apps/api`**. Özet: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md), tracker: [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md). Eski **document SaaS** [`10-plan-001-document-saas.md`](./10-plan-001-document-saas.md) **arşiv**; aktif roadmap değildir.

**Dosya adları:** Rol öneki + sıra numarası + konu — ör. `20-rules-003-data-model.md`, `10-plan-005-data-platform-three-products.md`, `40-guide-001-run-local.md`. Tam liste aşağıdaki tablolarda.

**Sıralama ve seviye (L0–L4):** Liste görünümünde üst/alt dokümanları ayırt etmek için **`00-` … `40-` tier öneki** ve mevcut dosya→tier eşlemesi: [`00-doc-prefix-convention.md`](./00-doc-prefix-convention.md). Yeni dosyalarda bu kılavuza uyulması önerilir.

---

## Hızlı başlangıç (3 adım)

1. **Bu görev ürün mü teknik mi?** Ürünse önce [20-rules-001-product-scope.md](./20-rules-001-product-scope.md), teknikse aşağıdaki tablodan ilgili dosyayı aç.
2. **Aynı konu birden fazla dosyada geçiyorsa** — aşağıdaki [Konu → ana sahip dosya](#konu--ana-sahip-dosya-tekrar-etmemek-için) tablosuna bak; detay **ana sahip**te, diğerleri **referans** verir.
3. **Terim karışıklığı** — [Ortak terminoloji](#ortak-terminoloji) tablosunu kullan; yeni terim buraya eklenmeden dokümana yazılmasın.

---

## Altın kurallar (tek cümle — tekrar için burası kaynak)

| # | Kural | Ayrıntı sahibi |
|---|--------|----------------|
| G1 | **Web ve PDF aynı HTML/CSS render hattından** üretilir; ikinci bir “sadece PDF” layout yok. | [20-rules-008-design-system.md](./20-rules-008-design-system.md), [20-rules-002-architecture.md](./20-rules-002-architecture.md) |
| G2 | **Internal document model** (version’lı JSON) ile **DB entity** ve **API DTO** karıştırılmaz; UI sunucunun verdiği sözleşmeyi görür. | [20-rules-003-data-model.md](./20-rules-003-data-model.md), [20-rules-002-architecture.md](./20-rules-002-architecture.md) |
| G3 | **Dış girdi** (URL, dosya, webhook) validate + (gerekiyorsa) SSRF/XSS yüzeyi **security** kurallarında tanımlıdır. | [20-rules-005-security.md](./20-rules-005-security.md) |
| G4 | **Kullanıcıya görünen metin** hardcode değil; kaynak dil **en**, fallback **en**; interpolation `{{param}}`. | [20-rules-010-i18n.md](./20-rules-010-i18n.md) |
| G5 | **Migration** şema kararı `rules-003-data-model`; **deploy sırası ve pipeline** `rules-006-deployment-and-ops`. **Yerel dev DB:** `git pull` veya yeni migration sonrası `apps/api` içinde `npx prisma migrate deploy`. | [20-rules-003-data-model.md](./20-rules-003-data-model.md), [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md#royalty-local-db-migrate-deploy) |

---

## Ortak terminoloji

| Terim (ürün / API) | Kullanım | Not |
|--------------------|----------|-----|
| **Document** | Kullanıcının yayınladığı doküman varlığı | Slug, revision, visibility buraya bağlı. |
| **Document revision** | İçerik snapshot (immutable); `version` internal model’de | Güncelleme = yeni revision (ürün kuralı). |
| **Workspace** | Çok kiracılı yapıda org sınırı (ürün dili); **Tenant** yerine tercih | Kodda/DB’de geçici olarak `tenant` alan adı kalabilir; **UI ve dokümantasyon** Workspace der. |
| **Internal document model** | Normalize blok ağacı + meta; harici kaynaklardan bağımsız şema | Parser çıktısı doğrudan UI’a gitmez. |
| **Theme** | Görsel token (minimal / corporate / dark) | İçerik modelini taşımaz. |
| **Template** | Section düzeni (kapak, CTA, …) | İş kuralı burada değil; `rules-009-content-and-template`. |
| **Brand kit** | Logo, marka rengi, yasal footer | Theme’ten ayrı. |
| **Share link / unlisted** | Tahmin edilemez token veya URL politikası | Token loglanmaz; `rules-005-security` + `rules-003-data-model`. |
| **Internal API** | Admin ve ürün backend’i; şimdiden `rules-004-api-design`’a uyum | **Public müşteri API’si** roadmap; MVP dışı kapsam `rules-001-product-scope`. |
| **OAuthAccount / bağlı hesap** | Sağlayıcı + `providerAccountId` ile `User`’a bağlı kayıt | Detay ve sıra: `10-plan-002-auth-identity-roadmap.md`; güvenlik: `rules-005-security`. |
| **Data Registry** | DataSource → DataAsset → DataColumn (tenant kapsamı); tüm data ürünlerinin ortak metadata katmanı | [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md), [`10-plan-006-data-platform-registry-agents-spec.md`](./10-plan-006-data-platform-registry-agents-spec.md) |
| **Data Health (Faz 1)** | Profiling + kalite kuralları + skor; ilk connector yalnızca PostgreSQL; `data_health` feature gate | [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) |
| **SaaS Core** | Kullanım, **limitler**, plan kapılarının **enforcement**’ı; **Phase SaaS-1** | [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) — **Billing ile karıştırılmaz** |
| **Billing** | Ödeme tahsilatı, checkout, fatura, ödeme sağlayıcısı; **Phase SaaS-2** | [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) — **SaaS Core’dan ayrı** |

---

## Konu → ana sahip dosya (tekrar etmemek için)

| Konu | Ana sahip | Diğer dosyalarda |
|------|-----------|------------------|
| Tek HTML → hosted + PDF | `rules-002-architecture` (hattın sahipliği), `rules-008-design-system` (typography/print) | `rules-009-content-and-template`: kısa cümle + link |
| Slug, visibility, revision | `rules-003-data-model` | `rules-002-architecture`: URL/route; `rules-004-api-design`: path tasarımı |
| Migration (ne zaman / nasıl deploy) | `rules-006-deployment-and-ops` | `rules-003-data-model`: şema ve veri bütünlüğü kuralları |
| Public web portal, landing, GTM (Phase 0.5) | `plan-007-phase-0-5-product-surface-gtm` | `plan-004` edinim/mesaj; `rules-008` ikon/badge; Tenant App ile karıştırılmaz |
| Rate limit, XSS, SSRF, token, OAuth callback | `rules-005-security` | `plan-002-auth-identity-roadmap`: provider sırası ve şema; `rules-004-api-design`: endpoint |
| Tema, spacing, `@media print` | `rules-008-design-system` | `rules-009-content-and-template`: template vs theme ayrımı |
| Royalty Admin web (Plus shell, `admin-primary-btn`, `admin-secondary-btn`, `gov-*`) | [`42-design-admin-ui.md`](./42-design-admin-ui.md) | Genel ürün/PDF görseli: `rules-008-design-system` |
| Çeviri anahtarı, fallback, `Intl` | `rules-010-i18n` | `rules-007-engineering`: DoD’da i18n kontrolü |
| MVP / Data Health Faz 1 kapsamı | `rules-001-product-scope` | Teknik dosyalar bununla **çelişmez**; Lineage/Governance tam ürünü fazlı |
| Data platform stratejisi | `plan-005`, `plan-006` | Registry önce; `rules-001` ile uyum |
| Monorepo, queue, worker | `rules-002-architecture` | `rules-006-deployment-and-ops`: CPU, process, alerting |
| PR, test, AI ile çalışma | `rules-007-engineering` | — |

---

## Dosya listesi ve ne zaman okunur

| Dosya | Ne zaman |
|--------|----------|
| [20-rules-008-design-system.md](./20-rules-008-design-system.md) | UI, tema, typography, responsive, PDF/print, bileşen sözleşmesi |
| [42-design-admin-ui.md](./42-design-admin-ui.md) | **Royalty Admin** (`apps/admin-web`): Plus shell sınıfları, birincil düğme, kart/toolbar, inline stilden kaçınma |
| [20-rules-002-architecture.md](./20-rules-002-architecture.md) | Katmanlar, monorepo, **tek render hattı**, async/worker, cache, route |
| [20-rules-003-data-model.md](./20-rules-003-data-model.md) | Entity, revision, slug, visibility, migration **şema** kararları |
| [20-rules-007-engineering.md](./20-rules-007-engineering.md) | Kod stili, test, PR, DoD, AI ile çalışma |
| [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md) | Ortamlar, CI/CD, migration **deploy**, health, backup |
| [20-rules-005-security.md](./20-rules-005-security.md) | Auth, XSS, SSRF, upload, PDF güvenliği, token, webhook |
| [20-rules-001-product-scope.md](./20-rules-001-product-scope.md) | MVP sınırı, öncelik, roadmap uyumu (public API / white-label **sonra**) |
| [20-rules-004-api-design.md](./20-rules-004-api-design.md) | REST, hata modeli, auth, idempotency (iç API + gelecek public için çerçeve) |
| [20-rules-009-content-and-template.md](./20-rules-009-content-and-template.md) | Template vs theme vs renderer, section, fallback |
| [20-rules-010-i18n.md](./20-rules-010-i18n.md) | Çeviri anahtarları, interpolation, locale, PDF/e-posta metni |
| [10-plan-002-auth-identity-roadmap.md](./10-plan-002-auth-identity-roadmap.md) | Social login, magic link, MVP vs backlog; OAuth şema ve güvenlik özeti |
| [10-plan-005-data-platform-three-products.md](./10-plan-005-data-platform-three-products.md) | Health → Governance → Lineage üçlü stratejisi |
| [10-plan-006-data-platform-registry-agents-spec.md](./10-plan-006-data-platform-registry-agents-spec.md) | Data Registry, agent, monetization, Prisma özeti |
| [10-plan-007-phase-0-5-product-surface-gtm.md](./10-plan-007-phase-0-5-product-surface-gtm.md) | Phase 0.5 — web portal, GTM, tasarım/ikon genişlemesi |
| [10-plan-001-document-saas.md](./10-plan-001-document-saas.md) | **Arşiv:** Document SaaS master plan (aktif roadmap değil) |
| [40-guide-001-run-local.md](./40-guide-001-run-local.md) | Yerel API/admin, Prisma komutları; **AI/Cursor: şema/migration sonrası `db:deploy`** |

---

## Görev öncesi checklist

1. **Hangi katman?** (INPUT / PROCESS / OUTPUT / DELIVERY / PRESENTATION) → `20-rules-002-architecture.md`
2. **Veri modeli / şema?** → `20-rules-003-data-model.md` (+ gerekirse migration deploy için `20-rules-006-deployment-and-ops.md`)
3. **API sözleşmesi?** → `20-rules-004-api-design.md`
4. **Hosted / PDF görünümü?** → `20-rules-008-design-system.md` + `20-rules-009-content-and-template.md` (template mi theme mi?)
5. **Güvenlik (URL, HTML, dosya, token)?** → `20-rules-005-security.md`
6. **Yayın / pipeline / secret?** → `20-rules-006-deployment-and-ops.md`
7. **Metin / çok dil?** → `20-rules-010-i18n.md`
8. **MVP dışı mı?** → `20-rules-001-product-scope.md`
9. **Kod kalitesi / PR / test?** → `20-rules-007-engineering.md`

---

## Cursor / AI için kullanım

- **`apps/api/prisma` değişikliği:** `.cursor/rules/prisma-migrate-after-schema.mdc` tetiklenir; görev bitiminde `db:deploy` / `db:migrate` uygulanır. Ayrıntı [40-guide-001-run-local.md](./40-guide-001-run-local.md#prisma-migrate-after-schema).
- Görev prompt’una **bu dosyayı** ve ilgili 1–2 rules dosyasını ekle: `@docs/10-meta-001-rules-index.md`, `@docs/20-rules-002-architecture.md`, …
- Büyük özellik: önce **Altın kurallar** ve **Konu → ana sahip** tablosu ile çakışma kontrolü.
- Örnek:

```text
Önce docs/10-meta-001-rules-index.md (terminoloji + altın kurallar). Uyum: docs/20-rules-003-data-model.md, docs/20-rules-005-security.md
```

---

## Geliştirici için kullanım

- PR’da isteğe bağlı: `Rules: meta-001-rules-index + …` satırı.
- Mimari tartışma: `rules-002-architecture` → `rules-003-data-model` sırası.

---

## Yeni kural dokümanı ekleme

1. `docs/rules-NNN-<konu>.md` (sıradaki numara; kebab-case konu).
2. İçinde **Özet kararlar** veya **Kısa checklist**.
3. **Bu dosyada:** Dosya listesi tablosuna satır; gerekiyorsa [Konu → ana sahip](#konu--ana-sahip-dosya-tekrar-etmemek-için) tablosuna giriş.
4. Tekrarlayan “altın kural” ise [Altın kurallar](#altın-kurallar-tek-cümle--tekrar-için-burası-kaynak) tablosuna ekle veya mevcut satıra referans ver.

---

## Operasyon özeti

| Durum | Önce bak |
|--------|-----------|
| Günlük geliştirme | `rules-007-engineering` + ilgili alan |
| Yayın günü | `rules-006-deployment-and-ops` |
| Güvenlik incelemesi | `rules-005-security` |
| Ürün tartışması | `rules-001-product-scope` |
| Çok dosyayı etkileyen karar | **Bu README** + terminoloji |

Bu indeks, repo içinde **kalıcı referans** olarak güncel tutulur; yeni terim veya altın kural eklendiğinde **önce burası**, sonra ilgili uzmanlık dosyası güncellenir.

---

## `docs/` önek envanteri (şu anki dosyalar)

| Önek | Rol | Örnek dosya |
|------|-----|----------------|
| `00-` (opsiyonel) | Tier + sıra — **detay:** [`00-doc-prefix-convention.md`](./00-doc-prefix-convention.md) | `00-doc-prefix-convention.md` |
| `meta-NNN-` | Giriş, özet, durum | `10-meta-001-rules-index.md`, `10-meta-002-project-overview.md`, `10-meta-003-project-tracker.md` |
| `rules-NNN-` | Bağlayıcı kurallar (001–010) | `20-rules-001-product-scope.md` … `20-rules-010-i18n.md` |
| `plan-NNN-` | Üst düzey plan / roadmap | `10-plan-001-document-saas.md` (arşiv) … `10-plan-007-phase-0-5-product-surface-gtm.md`; aktif yön: **plan-005 / plan-006** + **plan-007 (GTM)** + **rules-001** |
| `spec-NNN-` | Sprint spesifikasyonları | `30-spec-001-sprint1-mvp.md` … `30-spec-004-sprint4-scale-differentiation.md` |
| `guide-NNN-` | Nasıl yapılır | `40-guide-001-run-local.md`, `40-guide-002-testing.md`, `40-guide-003-smoke-tests-recent.md` |
| `ref-NNN-` | Kısa referans veri | `41-ref-001-dev-seed-users.md` |
| `design-` | Admin UI rehberi (L4) | `42-design-admin-ui.md` |

Yeni dosya eklerken aynı önekte **bir sonraki boş numarayı** kullanın; çakışmada numarayı artırın. **Alfabetik listede tier grupları** için [`00-doc-prefix-convention.md`](./00-doc-prefix-convention.md) içindeki `00-` / `10-` / … önekine bakın.
