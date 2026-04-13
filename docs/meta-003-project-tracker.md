# Pointmor — proje takipçisi

Canlı teknik/ürün özeti. Kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). Genel bakış: [`meta-002-project-overview.md`](./meta-002-project-overview.md).

---

## Mevcut durum (2026)

- **Ürün adı:** Pointmor — loyalty SaaS (restoran / kafe odaklı ürün yönü).
- **Çekirdek korundu:** Tenant, User, auth/session, Plan, Subscription, audit; Platform + Tenant admin yüzeyleri.
- **Kaldırıldı / arşiv:** Eski **data platform** modülleri (Data Health, Governance, Lineage, registry, scan, connector, import, ekip yönetimi API’si); ilgili Prisma tabloları ve migration baseline yenilendi.
- **Şema:** Basitleştirilmiş çekirdek modeller; yeni loyalty domain tabloları henüz yok (bilinçli olarak sonraki faz).

---

## Sıradaki anlamlı adımlar

| Öncelik | Konu |
|--------|------|
| 1 | Sadakat domain modeli (ör. üye, puan, kampanya) — Prisma + API + Tenant UI |
| 2 | İşletme onboarding ve plan limitleri (loyalty’ye özgü) |
| 3 | Gerçek ödeme / faturalama entegrasyonu (ürün olgunluğuna göre) |

---

## Riskler

| Risk | Not |
|------|-----|
| Eski dokümanlar | `10-plan-*` / `30-spec-*` içinde data platform anlatımı kalabilir; kodla çelişirse **kod + bu tracker** önceliklidir. |
| DB | Yeni baseline migration ile mevcut DB’ler `migrate reset` veya boş DB ile uyumlu olmalıdır. |
