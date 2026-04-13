# Pointmor — proje özeti

## Ürün

**Pointmor**, restoran / kafe işletmeleri için **çok kiracılı (multi-tenant) sadakat (loyalty) SaaS** ürünüdür. Bu repoda **çekirdek SaaS iskeleti** bulunur: kimlik, kiracı, kullanıcı, plan ve abonelik; **admin-web** içinde **Platform Console** (`/platform/*`) ve **Tenant App** (`/app/*`); backend **Fastify + Prisma + PostgreSQL** (`apps/api`).

**Eski veri platformu domain’i** (Data Health, Governance, Lineage, connector/scan/registry) **koddan ve şemadan kaldırılmıştır** — tarihsel plan ve spec dosyaları repoda arşiv niteliğinde kalabilir; güncel ürün yönü **Pointmor sadakat**tir.

## Teknik yığın

- Monorepo: `apps/api`, `apps/admin-web`
- UI: React + Vite + TypeScript

## Yüzeyler

| Yüzey | Rol | Rota |
|--------|-----|------|
| Platform Console | SaaS operatörü | `/platform/*` |
| Tenant App | İşletme kullanıcısı | `/app/*` |

## Sonraki ürün adımları (özet)

Sadakat domain modeli (müşteri, ödül, kampanya, ödeme entegrasyonu vb.) **ayrı faz** olarak eklenecek; mevcut durum **temiz çekirdek + isimlendirme** ile yeni yöne hazırlıktır.

Detaylı kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). İlerleme özeti: [`meta-003-project-tracker.md`](./meta-003-project-tracker.md).
