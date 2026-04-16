# RBAC tek kaynak ve regression testleri

## Tek kaynak

- **İzin sözlüğü ve rol → izin matrisi:** `packages/pointmor-rbac/src/rbac-config.ts` (paket adı `@pointmor/rbac`).
- **Ham `membership.role` → `TenantAppRole`:** `resolveTenantAppRoleFromMembership` (aynı dosya).
- **Uygulama sarmalayıcıları:**
  - Admin: `apps/admin-web/src/lib/tenant-app-role.ts` (oturum + platform admin), `tenant-permissions.ts` (`hasPermission`, `hasAnyPermission`).
  - API: `apps/api/src/lib/tenant-app-role.ts`, `tenant-permissions.ts` (`hasPermissionForSession`).
- **Route / nav kuralları:** `apps/admin-web/src/lib/tenant-route-access.ts` (UI’ye özgü; matristen ayrı tutulur).

## Yardımcılar (isimler)

| Amaç | Admin | API |
|------|-------|-----|
| İzin kontrolü | `hasPermission`, `canRenderAction` (= alias) | `hasPermissionForSession` |
| Rota | `canAccessTenantPath`, `canAccessRoute` (= alias) | — |
| Route handler | — | `requireTenantPermission` / `requirePermission` |
| Servis (sync) | — | `assertPermission` |

## Testler

- **Paket:** `npm run test -w @pointmor/rbac` — rol matrisi ve ham rol çözümlemesi.
- **API:** `npm run test -w api` — oturum + `hasPermissionForSession` / `assertPermission` parity.

## Yeni özellik checklist

1. Gerekliyse `TENANT_PERMISSIONS` ve `PERMISSIONS_BY_ROLE` güncelle (`rbac-config.ts`).
2. Backend route’a `requireTenantPermission(...)` ekle.
3. UI’da `PermissionGate` / `hasPermission` ile aynı izni kullan.
4. Nav/route için `tenant-route-access.ts` güncelle.
5. `@pointmor/rbac` testlerine allow/deny senaryosu ekle; API’de ilgili parity testi ekle.

## Smoke / regression

- `npm run build` (kök) — önce `@pointmor/rbac` derlenir.
- `npm run test` (kök) — rbac paketi + api testleri.
