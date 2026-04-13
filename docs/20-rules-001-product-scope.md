# Ürün kapsamı kuralları — Pointmor

**Amaç:** Çekirdek SaaS sınırlarını korumak, **loyalty** ürününe odaklanmak ve gereksiz genişlemeyi önlemek.

---

## Ürün tanımı

**Pointmor**, çok kiracılı **sadakat (loyalty) SaaS** ürünüdür; birincil kullanıcılar **restoran / kafe işletmeleri** ve operasyonlarını yöneten **SaaS operatörü** (platform) rolleridir.

**Şu anki repoda** (temizlik sonrası) **ürün özelliği olarak** yalnızca çekirdek SaaS bulunur: kimlik, kiracı, kullanıcı, plan, abonelik, temel admin UI. **Sadakat iş kuralları** (puan, ödül, kampanya, müşteri kartı vb.) **henüz uygulanmamıştır** — sonraki fazda eklenecektir.

---

## Arşiv / kapsam dışı (eski domain)

Aşağıdaki alanlar **aktif ürün parçası değildir** ve kod tabanından çıkarılmıştır:

- Veri sağlığı (Data Health), veri yönetişimi (data governance), köken (lineage)
- Veri kaynağı bağlantıları, tarama, profil çıkarma, kalite kuralları, registry import akışları

Tarihsel plan/spec dosyaları referans için durabilir; **güncel kapsam** bu dosya ve [`meta-002-project-overview.md`](./meta-002-project-overview.md) ile tanımlıdır.

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
