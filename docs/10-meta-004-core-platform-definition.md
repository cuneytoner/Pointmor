# Core platform tanımı — Pointmor

**Amaç:** Ürün tanımında tek doğruluk kaynağı sağlamak ve tüm modüller için ortak platform doktrinini sabitlemek.

---

## Single source of truth

**Pointmor is a modular multi-tenant platform.  
Users access tenants via memberships.  
Functionality is delivered through modules.**

Bu ifade, ürün kimliği ve mimari sınırlar için ana referanstır.

---

## Core platform bileşenleri

| Bileşen | Tanım |
|--------|-------|
| **Tenant** | Veri ve erişim izolasyon sınırı |
| **Membership** | Kullanıcı ↔ tenant üyelik bağı; rol ve dış kullanıcı bağlamı içerir |
| **Module** | İş alanı işlevlerini tenant kapsamında sunan ürün bileşeni |
| **Advisor model** | Advisor tenant ve client tenant erişimini membership tabanlı yöneten model |

---

## Isolation prensipleri

1. Tenant izolasyonu varsayılandır.
2. Tenant erişimi yalnızca membership üzerinden verilir.
3. Modül erişimi tenant + membership + rol + modül aktivasyonu ile değerlendirilir.
4. Cross-tenant erişim, açık policy ve audit olmadan mümkün değildir.

---

## Core ve modül sınırı

- Core platform: kimlik, tenant, membership, auth/session, plan/abonelik, güvenlik ve audit temelini sağlar.
- Modüller: domain işlevini sağlar (`cafe`, `ai_act`, vb.), core kimlik ve izolasyon modelini değiştirmez.
- Cafe/loyalty alanı platformda **existing module (cafe module)** olarak konumlanır.
- AI Act Compliance, platformun **first non-loyalty module** örneğidir (B2B compliance use-case).

---

## Erişim doktrini (zorunlu ifade)

**All access control is based on: membership + role + module activation**

Bu ifade, RBAC, advisor modeli ve cross-tenant güvenlik dokümanlarında aynen korunur.

---

## İlgili dokümanlar

- Ürün özeti: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md)
- Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Modüler mimari: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- Advisor modeli: [`20-rules-014-advisor-client-model.md`](./20-rules-014-advisor-client-model.md)
- Cross-tenant güvenlik: [`20-rules-015-cross-tenant-access-security.md`](./20-rules-015-cross-tenant-access-security.md)
