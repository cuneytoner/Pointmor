# Pointmor — proje özeti

**Bu dosya, eski veri platformu çizgisine ait anlatımı taşımaz.** Kod ve Prisma şeması **Pointmor loyalty SaaS çekirdeği** ile hizalanmıştır.

## Ürün

**Pointmor**, restoran / kafe işletmeleri için **çok kiracılı (multi-tenant) sadakat (loyalty) SaaS** ürünüdür. Bu repoda **çekirdek SaaS iskeleti** bulunur: kimlik, kiracı, kullanıcı, plan ve abonelik; **admin-web** içinde **Platform Console** (`/platform/*`) ve **Tenant App** (`/app/*`); backend **Fastify + Prisma + PostgreSQL** (`apps/api`).

**Eski veri platformu domain’i** (Data Health, Governance, Lineage, connector/scan/registry) **koddan ve şemadan kaldırılmıştır**; ilgili eski plan/spec dokümanları da `docs/` içinden **temizlenmiştir** (gerekirse git geçmişi). Güncel ürün yönü **Pointmor sadakat**tir.

**Loyalty (faz 1):** Prisma modelleri ve tenant bağlamında REST uçları (`/customers`, `/visits`, `/rewards`, `/redemptions`, hesap özeti) `apps/api` içindedir; tam ürün yüzeyi (kampanya, ödeme, zengin Tenant UI) **sonraki adımlar**dır.

## Teknik yığın

- Monorepo: `apps/api`, `apps/admin-web`
- UI: React + Vite + TypeScript

## Yüzeyler

| Yüzey | Rol | Rota |
|--------|-----|------|
| Platform Console | SaaS operatörü | `/platform/*` |
| Tenant App | İşletme kullanıcısı | `/app/*` |

Detaylı kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). İlerleme özeti: [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md).
