# Ürün kapsamı kuralları — Pointmor

**Amaç:** Çekirdek SaaS sınırlarını korumak, **loyalty** ürününe odaklanmak ve gereksiz genişlemeyi önlemek.

---

## Ürün tanımı

**Pointmor**, çok kiracılı **sadakat (loyalty) SaaS** ürünüdür; birincil kullanıcılar **restoran / kafe işletmeleri** ve operasyonlarını yöneten **SaaS operatörü** (platform) rolleridir.

**Şu anki repoda** çekirdek SaaS (kimlik, kiracı, kullanıcı, plan, abonelik, admin UI) ve **loyalty faz 1** (müşteri, ziyaret, ödül, kullanım — Prisma + tenant kapsamlı API) bulunur. Kampanya motoru, zengin Tenant loyalty UI ve ödeme entegrasyonu **henüz tamamlanmış sayılmaz** — sonraki fazlarda genişletilir.

---

## Arşiv / kapsam dışı (eski domain)

Aşağıdaki alanlar **aktif ürün parçası değildir** ve kod tabanından çıkarılmıştır:

- Veri sağlığı (Data Health), veri yönetişimi (data governance), köken (lineage)
- Veri kaynağı bağlantıları, tarama, profil çıkarma, kalite kuralları, registry import akışları

Eski plan/spec dosyaları repodan kaldırılmıştır (gerekirse git geçmişi). **Güncel kapsam** bu dosya ve [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) ile tanımlıdır.

---

## SaaS çekirdeği (korunur)

| Alan | Açıklama |
|------|----------|
| **Kimlik / oturum** | Giriş, session, platform vs tenant bağlamı |
| **Tenant** | Kiracı yaşam döngüsü, slug, ayarlar |
| **Kullanıcı** | Üyelik, rol |
| **Plan / Subscription** | Fiyatlandırma sınıfı, özellik etiketleri, abonelik durumu |
| **Denetim** | Audit log (operasyonel) |

---

## Terminoloji

| Kavram | Kullanım |
|--------|----------|
| **Workspace / Tenant** | Kiracı; işletme veya marka hesabı |
| **Platform Console** | SaaS operatörü — tüm kiracılar |
| **Tenant App** | Tek işletmenin yönetim alanı |

**Billing** (gerçek ödeme, PSP, fatura): ürün olgunlaşana kadar **ertelenebilir**; çekirdekte abonelik kaydı ve UI iskeleti yeterlidir.

---

## Feature ekleme kriteri

Yeni özellik şunları netleştirmeli: hangi **kiracı** verisini taşıyor, **Tenant App** veya **Platform** hangisinde, **plan / limit** ile mi ilişkili. Çekirdek dışı “genel veri platformu” özellikleri **önerilmez**.
