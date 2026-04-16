# Kiracı uygulaması RBAC — matris ve parity

Tek kaynak sözlük: `apps/admin-web/src/lib/tenant-permissions.ts` ve `apps/api/src/lib/tenant-permissions.ts` (aynı içerik).

## Roller (ürün)

| Rol | Ham API örnekleri |
|-----|-------------------|
| owner | `tenant_owner`, `tenant_admin` |
| manager | `tenant_manager`, varsayılan `tenant_operator` |
| staff | `tenant_staff` |
| ops | `tenant_ops`, `tenant_marketing` |
| viewer | `viewer` |

Çözümleme: `resolveTenantAppRole` (`tenant-app-role.ts`).

## Parity ilkesi

1. **Route**: `canAccessTenantPath` + `RequireTenantRouteAccess`.
2. **Nav**: `canAccessTenantNavTarget` + özellik bayrakları (`AdminShell`).
3. **Aksiyon**: `usePermissions` / `hasPermission`.
4. **API**: `requireTenantPermission` veya servis içi kontrol; kiracı izolasyonu her zaman veri katmanında.

403 hata gövdesi: çoğunlukla `{ error: "permission_denied" }` (RBAC).

## Yüzey → izin (özet)

| Yüzey | Route örneği | Gerekli izin / not |
|-------|----------------|---------------------|
| Dashboard | `/app/dashboard` | Rol ≠ staff (nav) |
| Müşteriler | `/app/customers` | `customers.view` API; viewer nav dışı |
| Kasa / ziyaret | `/app/visits` | `visits.create` + kasa API |
| Ödüller | `/app/rewards` | `rewards.*` |
| Kampanyalar | `/app/campaigns` | `campaigns.*` |
| İptaller | `/app/redemptions` | `redemptions.*` |
| Menü | `/app/menu` | `menu.*` |
| Büyüme / analitik | `/app/growth` | `analytics.view` + plan özelliği |
| Workspace admin | `/app/admin/*` | bölüm bazlı (`canAccessWorkspaceAdminSection`) |
| Ayarlar (tam sayfa) | `/app/settings` | `settings.*` |
| Mesajlaşma | `/app/messaging` | `messaging.*` |
| Faturalama | `/app/billing` | `billing.*` (manage çoğunlukla owner) |

## Test senaryoları (elle)

Her rol için: doğru giriş URL’si → nav görünürlüğü → doğrudan URL ile yetkisiz sayfa → 403 beklenen API yazma.

---

*Güncelleme: kapanış API `isManagerRole` düzeltmesi, `GET /users`, bootstrap kullanıcı/abonelik listesi, kasa ve abonelik/onboarding yazma uçları RBAC ile hizalandı.*
