# Pointmor — proje takipçisi

Canlı teknik/ürün özeti. Kurallar: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md). Genel bakış: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md).

Eski veri platformu faz tablosu bu dosyada tutulmaz; kod tabanı **Pointmor loyalty SaaS çekirdeği** ile uyumludur.

---

## Mevcut durum (2026)

- **Ürün adı:** Pointmor — loyalty SaaS (restoran / kafe odaklı ürün yönü).
- **Çekirdek korundu:** Tenant, User, auth/session, Plan, Subscription, audit; Platform + Tenant admin yüzeyleri.
- **Kaldırıldı:** Eski **data platform** modülleri (Data Health, Governance, Lineage, registry, scan, connector, import, ekip yönetimi API’si); ilgili Prisma tabloları ve migration baseline yenilendi.
- **Loyalty (faz 1):** `Customer`, `Visit`, `Reward`, `Redemption` modelleri ve tenant kapsamlı API route’ları (`apps/api`) mevcut.
- **Şema:** Çekirdek + loyalty tabloları; genişletme (kampanya, ödeme, puan kuralları) sonraki migration’larla.

### Phase 3 — Customer Experience (PWA + public API)

**Durum:** Ürün akışı açısından **kapatıldı** (QR → gate/home → puan; telefon+token; ödül talebi; offline snapshot). API’de hem **`/public/loyalty/:slug/*`** (PWA’nın kullandığı) hem Phase 3 **`/public/tenants/:slug/*`** yüzeyi kayıtlı; global + public scope **rate limit** ve **Bearer + tenant slug** ile tenant izolasyonu uygulanıyor.

**Bilinen teknik borç (kısa fix):** Müşteri PWA’da `409` yanıtı hem yetersiz puan hem **duplicate pending claim** için aynı metinle gösterilebilir; istemci gövde (`error`) ayrımı veya toast ile netleştirilmeli. İstemci hâlâ legacy path kullanıyor; istenirse taban URL **`/public/tenants/...`** ile hizalanır.

---

## Sıradaki anlamlı adımlar

| Öncelik | Konu |
|--------|------|
| 1 | PWA `customer-portal-api` tabanını `/public/tenants/...` ile hizalama; `409` gövde ayrımı (duplicate vs insufficient) |
| 2 | Tenant App’te loyalty operasyon ekranları (pending redemption onayı vb.) — müşteri claim ile uçtan uca test |
| 3 | İşletme onboarding ve plan limitleri (loyalty’ye özgü kullanım sayaçları) |
| 4 | Gerçek ödeme / faturalama entegrasyonu (ürün olgunluğuna göre) |

---

## Riskler

| Risk | Not |
|------|-----|
| Eski dokümanlar | Eski plan/spec dosyaları kaldırıldı; kodla çelişirse **kod + bu tracker** önceliklidir. |
| DB | Yeni migration’lar ile mevcut DB’ler `migrate deploy` veya bilinçli `migrate reset` ile uyumlu tutulmalıdır. |
