# Kural dokümanları — merkez giriş (Pointmor)

**Amaç:** `docs/` altında tek yönlendirme; çelişen “altın kural” tekrarını azaltmak.

**Güncel ürün:** **Pointmor** — restoran / kafe **loyalty SaaS**; çekirdek kod `apps/api` + `apps/admin-web`. Çok kiracılı yapı, oturum ve plan/abonelik korunur; **sadakat domain’i** (müşteri, puan, ziyaret, ödül) API’de tanımlıdır.

**Stratejik yön:** Önce **loyalty çekirdeği** ve PMF; tam **ödeme / PSP** entegrasyonu ürün olgunluğuna göre. Ayrım: **SaaS çekirdeği** (tenant, kullanım, **limit + entitlement enforcement**, tenant billing görünürlüğü / demo yükseltme) vs **Billing** (tahsilat, fatura) — bkz. [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md), durum özeti [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) Phase 4.7.

**Eski içerik:** Data platform, document SaaS ve eski sprint/plan dosyaları repodan **kaldırılmıştır**; gerektiğinde git geçmişine bakın.

**Dosya adlandırma:** [`00-doc-prefix-convention.md`](./00-doc-prefix-convention.md).

---

## Altın kurallar (özet)

| # | Kural | Ayrıntı |
|---|--------|---------|
| G1 | **DB ≠ doğrudan UI modeli** — API DTO / sunucu hesaplanmış alanlar. | [`20-rules-003-data-model.md`](./20-rules-003-data-model.md), [`20-rules-002-architecture.md`](./20-rules-002-architecture.md) |
| G2 | **Kiracı izolasyonu** — tenant scoped veri; public API yoksa iç route’lar oturum ile. | [`20-rules-005-security.md`](./20-rules-005-security.md) |
| G3 | **Kullanıcıya görünen metin** hardcode değil; i18n. | [`20-rules-010-i18n.md`](./20-rules-010-i18n.md) |
| G4 | **Migration** — şema `rules-003`, deploy `rules-006`; yerel `migrate deploy`. Bootstrap **500** / P3009 / uyumsuz geçmiş: [`40-guide-001`](./40-guide-001-run-local.md#migration-errors-p3009); Cursor: [`prisma-migrate-after-schema.mdc`](../.cursor/rules/prisma-migrate-after-schema.mdc). | [`20-rules-003-data-model.md`](./20-rules-003-data-model.md), [`20-rules-006-deployment-and-ops.md`](./20-rules-006-deployment-and-ops.md) |

---

## Konu → ana sahip dosya

| Konu | Ana sahip |
|------|-----------|
| Ürün kapsamı, roadmap özeti, **pilot / Phase 7** | [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) (validation-first), [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) (güncel odak), [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) Phase 7 |
| Monorepo, katmanlar, API sınırı | [`20-rules-002-architecture.md`](./20-rules-002-architecture.md) |
| Entity, migration | [`20-rules-003-data-model.md`](./20-rules-003-data-model.md) |
| REST, hata modeli | [`20-rules-004-api-design.md`](./20-rules-004-api-design.md) |
| Auth, XSS, SSRF, çerez | [`20-rules-005-security.md`](./20-rules-005-security.md) |
| CI/CD, ortam, migrate deploy | [`20-rules-006-deployment-and-ops.md`](./20-rules-006-deployment-and-ops.md) |
| PR, test, kod stili | [`20-rules-007-engineering.md`](./20-rules-007-engineering.md) |
| Tema, tipografi, bileşen | [`20-rules-008-design-system.md`](./20-rules-008-design-system.md) |
| Admin UI (Plus shell, `admin-*` sınıfları) | [`42-design-admin-ui.md`](./42-design-admin-ui.md) |
| Tenant Cashier (tek ekran visit + redeem) | [`42-design-tenant-cashier-flow.md`](./42-design-tenant-cashier-flow.md) |
| Mağaza ayarları, kamuya açık menü (`/m/:slug`) | [`42-design-store-public-menu.md`](./42-design-store-public-menu.md) |
| Yerel çalıştırma, Prisma, `ALLOW_TENANT_DEMO_PLAN_SWITCH` (demo plan ucu) | [`40-guide-001-run-local.md`](./40-guide-001-run-local.md) |
| Seed kullanıcıları | [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md) |

---

## Cursor / AI için

- Şema değişikliği: `apps/api` içinde migration uygula; özet [`40-guide-001-run-local.md`](./40-guide-001-run-local.md).
- Prompt’a örnek: `@docs/10-meta-001-rules-index.md`, `@docs/20-rules-001-product-scope.md`, ilgili `20-rules-00x`.

---

## `docs/` envanteri (güncel tutulanlar)

| Tür | Örnek |
|-----|--------|
| Meta | `10-meta-002-project-overview.md`, `10-meta-003-project-tracker.md` |
| Kurallar | `20-rules-001` … `20-rules-010` |
| Kılavuz | `40-guide-001` … `40-guide-003` |
| Ref | `41-ref-001-dev-seed-users.md` |
| Tasarım | `42-design-admin-ui.md`, `42-design-tenant-cashier-flow.md` |

Eski **plan/spec** dosyaları (data platform, document SaaS, sprint1–4) kaldırıldı; yeni plan eklenecekse `10-plan-` öneki ve boş numara kullanın.
