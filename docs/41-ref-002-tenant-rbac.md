# Tenant RBAC — referans

**Amaç:** Tenant uygulamasında role, izin, role eşleme ve UI/API kullanımını tek dosyada toplamak.

---

## Role'ler

| Ürün role'ü | Ham membership role örnekleri |
|-----------|-------------------------------|
| `owner` | `tenant_owner`, `tenant_admin`, `ADMIN` |
| `manager` | `tenant_manager`, `tenant_operator`, `MEMBER` |
| `staff` | `tenant_staff` |
| `ops` | `tenant_ops`, `tenant_marketing` |
| `viewer` | `viewer`, `ADVISOR` (kısıtlı erişim) |

---

## Permission kaynağı

- Tek kaynak: `packages/pointmor-rbac/src/rbac-config.ts`
- Paket: `@pointmor/rbac`
- Role çözümleme: `resolveTenantAppRoleFromMembership`

---

## Eşleme ve kullanım

### API tarafı

- `apps/api/src/lib/tenant-app-role.ts`
- `apps/api/src/lib/tenant-permissions.ts`
- Guard kullanımı:
  - `requireTenantPermission(...)`
  - `requireTenantPermissions(...)`
  - `assertPermission(...)`

### UI tarafı

- `apps/admin-web/src/lib/tenant-app-role.ts`
- `apps/admin-web/src/lib/tenant-permissions.ts`
- Route/nav kısıtları:
  - `tenant-route-access.ts`
  - `canAccessTenantPath`
  - `canAccessTenantNavTarget`

---

## Yüzey bazlı özet

| Yüzey | Örnek rota | İzin notu |
|-------|------------|-----------|
| Dashboard | `/app/dashboard` | role bazlı görünürlük |
| Customers | `/app/customers` | `customers.view` |
| Visits/Cashier | `/app/visits` | `visits.create` |
| Rewards | `/app/rewards` | `rewards.*` |
| Campaigns | `/app/campaigns` | `campaigns.*` |
| Redemptions | `/app/redemptions` | `redemptions.*` |
| Menu | `/app/menu` | `menu.*` |
| Growth/Analytics | `/app/growth` | `analytics.view` (+ plan) |
| Tenant Administration | `/app/admin/*` | bölüm bazlı erişim |
| Billing | `/app/billing` veya `/app/admin/billing` | `billing.*` |

---

## Test / doğrulama

- Paket testleri: `npm run test -w @pointmor/rbac`
- API testleri: `npm run test -w api`
- Beklenen parity:
  - UI route/nav izinleri ile API guard sonuçları çelişmez.

---

## Kısa checklist

- [ ] Yeni izin eklendiyse `rbac-config.ts` güncellendi mi?
- [ ] API guard’ları yeni izni kullanıyor mu?
- [ ] UI route/nav kontrolü eşleşiyor mu?
- [ ] Paket + API testleri geçti mi?
