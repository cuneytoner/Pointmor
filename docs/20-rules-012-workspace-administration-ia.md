# Workspace Administration (tenant app IA)

**Amaç:** Kiracı uygulamasında mağaza ayarları, takım, mesajlaşma ve faturalamayı tek **Administration** çatısı altında toplamak; operasyon ekranları (müşteriler, ziyaretler, ödüller vb.) ön planda kalsın.

## Route yapısı

| Yol | İçerik |
|-----|--------|
| `/app/admin` | İndeks: owner/manager → `general`, ops → `messaging` |
| `/app/admin/general` | Genel (marka, bölge, iletişim, herkese açık bağlantılar) |
| `/app/admin/team` | Takım / rol / davet yer tutucu |
| `/app/admin/messaging` | Kanal ve şablon ayarları |
| `/app/admin/billing` | Plan, kullanım, özellikler (yalnızca owner) |

**Eski URL’ler:** `/app/settings`, `/app/messaging`, `/app/billing` → ilgili admin alt yollarına kalıcı yönlendirme.

## Sidebar

**Administration** (`nav.workspaceAdmin`) hedefi **`/app/admin`** (indeks rol bazlı yönlendirir). `/app/admin/*` altında aktif kalır.

## RBAC (kiracı uygulaması)

- **Kod:** `apps/admin-web/src/lib/tenant-app-role.ts` (API `membership.role` → `TenantAppRole`), `tenant-route-access.ts` (`canAccessTenantPath`, `canAccessTenantNavTarget`, `canAccessWorkspaceAdminSection`).
- **Sidebar:** Öğe tamamen gizlenir (disabled yok).
- **Route:** `RequireTenantRouteAccess` — yetkisiz URL sessizce `redirectPathForDeniedTenantRoute` ile güvenli sayfaya gider (teknik hata metni yok).

| Ürün rolü | API örnekleri (ham) | Ana navigasyon özeti |
|-----------|---------------------|----------------------|
| **owner** | `tenant_owner`, `tenant_admin` | Tam |
| **manager** | `tenant_manager`, `tenant_operator` (legacy) | Tam except Billing sekmesi |
| **staff** | `tenant_staff` | Müşteriler, ziyaretler, ödüller |
| **ops** | `tenant_ops`, `tenant_marketing` | Dashboard, müşteriler, kampanyalar, büyüme, ödül kullanımı, Administration → yalnızca Messaging |
| **viewer** | `viewer` | Yalnızca dashboard |

**Administration sekmeleri:** General & Team → owner/manager; Messaging → owner/manager/ops; Billing → owner.

**Varsayılan giriş:** staff → `/app/customers`; diğerleri → `/app/dashboard`.

## i18n

Anahtarlar: `workspaceAdmin.*`, `nav.workspaceAdmin`. Platform dili (`/platform/*`) ile karıştırılmaz.
