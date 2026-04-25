# Çekirdek platform tanımı — Pointmor

**Amaç:** Ürün tanımında tek doğruluk kaynağı sağlamak ve tüm module'ler için ortak platform doktrinini sabitlemek.

---

## Tek doğruluk kaynağı

**Pointmor modüler çok kiracılı bir platformdur.  
Kullanıcılar tenant'lara membership üzerinden erişir.  
İşlevsellik module'ler üzerinden sunulur.**

Bu ifade, ürün kimliği ve mimari sınırlar için ana referanstır.

---

## Çekirdek platform bileşenleri

| Bileşen | Tanım |
|--------|-------|
| **Tenant** | Veri ve erişim izolasyon sınırı |
| **Membership** | Kullanıcı ↔ tenant üyelik bağı; role ve dış kullanıcı bağlamı içerir |
| **Module** | İş alanı işlevlerini tenant kapsamında sunan ürün bileşeni |
| **Advisor modeli** | Advisor tenant ve client tenant erişimini membership tabanlı yöneten model |

---

## İzolasyon prensipleri

1. Tenant izolasyonu varsayılandır.
2. Tenant erişimi yalnızca membership üzerinden verilir.
3. Module erişimi tenant + membership + role + module activation ile değerlendirilir.
4. Cross-tenant erişim, açık policy ve audit olmadan mümkün değildir.

---

## Çekirdek ve module sınırı

- Çekirdek platform: kimlik, tenant, membership, auth/session, plan/abonelik, güvenlik ve audit temelini sağlar.
- Module'ler domain işlevini sağlar (`cafe`, `ai_act`, vb.) ve core kimlik/izolasyon modelini değiştirmez.
- Cafe/loyalty alanı platformda **mevcut module (`cafe`)** olarak konumlanır.
- AI Act Compliance, platformun **ilk loyalty dışı module** örneğidir (B2B compliance kullanım durumu).

---

## Erişim doktrini (zorunlu ifade)

**Tüm access control şu temele dayanır: membership + role + module activation**

Bu ifade, RBAC, advisor modeli ve cross-tenant güvenlik dokümanlarında aynen korunur.

---

## İlgili dokümanlar

- Ürün özeti: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md)
- Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Module mimarisi: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- Advisor modeli: [`20-rules-014-advisor-client-model.md`](./20-rules-014-advisor-client-model.md)
- Cross-tenant güvenlik: [`20-rules-015-cross-tenant-access-security.md`](./20-rules-015-cross-tenant-access-security.md)
