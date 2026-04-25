# Veri modeli kuralları

**Amaç:** Pointmor platformunda tenant temelli veri sınırını, üyelik temelli erişimi ve module izolasyonunu veri modeli seviyesinde netleştirmek.

---

## Access control kaynağı

TenantMembership, erişim için source of truth'tur.

User.tenantId yalnızca backward compatibility için legacy fallback olarak tutulur
ve access control kararlarında kullanılmamalıdır.

Tüm access kararları şu temele dayanmalıdır:

- membership
- role
- module activation

---

## Terminoloji notu

- **Tenant** sistem modelidir (veri ve erişim sınırı).
- **Workspace** yalnızca bazı UI metinlerinde geçebilen gösterim terimidir.

---

## Ana entity’ler (platform çekirdeği)

| Entity | Role |
|--------|-----|
| **Tenant** | Kiracı sınırı; type, slug, yaşam döngüsü |
| **User** | Kimlik ve hesap bilgisi |
| **TenantMembership** | User ↔ Tenant erişim bağı (role, isExternal) |
| **Module** | Platform module kataloğu |
| **TenantModule** | Tenant bazında module activation |
| **Plan** | Paket/özellik ve limit tanımı |
| **Subscription** | Tenant’ın plan ilişki durumu |

---

## Audit-related entity’ler

| Entity | Role |
|--------|-----|
| **AuditLog** | Platform düzeyi yönetim/audit kayıtları |
| **AuditEvent** | Tenant-scoped yapısal operasyon kayıtları |
| **AnomalySignal** | Audit olaylarından türeyen operasyonel anomali bayrakları |

---

## Modelleme kuralları

1. Tenant-scoped tablolar `tenantId` taşır ve Tenant’a FK ile bağlanır.
2. `TenantMembership` üzerinde `@@unique([userId, tenantId])` zorunludur.
3. `TenantModule` üzerinde `@@unique([tenantId, moduleId])` zorunludur.
4. Module tabloları core erişim modelini bypass edemez.
5. API’ye dönen DTO’lar DB satırının birebir kopyası olmak zorunda değildir.

---

## Migration kuralları

- Yeni alanlar mümkünse backward-compatible eklenir (nullable/default).
- Veri kaybı riski olan migration değişikliklerinde rollback planı zorunludur.
- Seed akışları yalnız dev/demo/staging amaçlıdır; production otomatik seed yoktur.

---

## Anti-pattern’ler

- `User.tenantId` ile doğrudan erişim kararı vermek.
- Tenant filtresi olmadan sorgu çalıştırmak.
- Module activation kontrolü olmadan module verisine erişmek.
- Membership doğrulamasını service/API katmanında atlamak.

---

## Kısa checklist

- [ ] Model tenant sınırını açık taşıyor mu?
- [ ] Membership ve module activation kuralları korunuyor mu?
- [ ] FK/unique/index kısıtları yeterli mi?
- [ ] Değişiklik backward-compatible mi?

---

## İlgili dokümanlar

- Mimari sınırlar: [20-rules-002-architecture.md](./20-rules-002-architecture.md)
- API erişim kuralları: [20-rules-004-api-design.md](./20-rules-004-api-design.md)
- Güvenlik: [20-rules-005-security.md](./20-rules-005-security.md)
- Schema constraints: [20-rules-016-schema-constraints.md](./20-rules-016-schema-constraints.md)
