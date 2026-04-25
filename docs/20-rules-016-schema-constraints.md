# Schema Constraints (Platform Doktrininin Enforcement'u)

**Amaç:** Platform doktrinini veritabanı seviyesinde enforce etmek.

---

## 1) Membership benzersizliği

Bir kullanıcı aynı tenant için yinelenen membership kaydına sahip olmamalıdır.

Constraint:  
`UNIQUE (userId, tenantId)`

---

## 2) Foreign key enforcement

Tüm tenant kapsamlı tablolar şunları içermelidir:

- `tenantId` (FK → `Tenant.id`)
- doğru `ON DELETE` davranışı (`RESTRICT` veya `CASCADE` açıkça tanımlı)

---

## 3) Module isolation

Module tabloları şunları sağlamalıdır:

- `tenantId` içermeli
- diğer module tablolarına doğrudan referans vermemeli
- çekirdek tabloları (`User`, `Tenant`, `Membership`) değiştirmemeli

---

## 4) Advisor güvenliği

`isExternal = true` ise:

- varsayılan olarak `ADMIN` yetkisi verilmemeli
- role kontrolleri açık olmalı

---

## 5) Indexing (zorunlu)

TenantMembership:
- @@index([userId])
- @@index([tenantId])
- @@index([role])

TenantModule:
- @@unique([tenantId, moduleId])

TenantInvitation:
- @@index([tenantId])
- @@index([email])
- @@index([status])

---

## 6) Soft delete / audit (önerilen)

- `createdAt`, `updatedAt` zorunlu
- cross-tenant işlemler için audit log

---

## 7) Değişmezler

- Her request tam olarak bir tenant'a çözülmelidir
- Açık membership olmadan cross-tenant query olmamalıdır

---

## 8) Enforcement sınırı

Database constraints yapıyı enforce eder,
ancak access control runtime'da membership tabanlı guard'lar ile enforce edilir.

Tek başına database, erişim kurallarını enforce etmek için yeterli değildir.
