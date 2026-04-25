# Tenant App Yönetim Bilgi Mimarisi (UI)

**Amaç:** Tenant uygulamasında mağaza ayarları, takım, mesajlaşma ve faturalamayı tek **Yönetim** çatısı altında toplamak; operasyon ekranları (müşteriler, ziyaretler, ödüller vb.) ön planda kalsın.

## Route yapısı

| Yol | İçerik |
|-----|--------|
| `/app/admin` | İndeks: owner/manager → `general`, ops → `messaging` |
| `/app/admin/general` | Genel (marka, bölge, iletişim, herkese açık bağlantılar) |
| `/app/admin/team` | Takım / role / davet yer tutucu |
| `/app/admin/messaging` | Kanal ve şablon ayarları |
| `/app/admin/billing` | Plan, kullanım, özellikler (yalnızca owner) |

**Eski URL’ler:** `/app/settings`, `/app/messaging`, `/app/billing` → ilgili admin alt yollarına kalıcı yönlendirme.

## Sidebar

**Yönetim** (`nav.workspaceAdmin`) hedefi **`/app/admin`** (indeks role bazlı yönlendirir). `/app/admin/*` altında aktif kalır.

## RBAC (kiracı uygulaması)

- Canonical RBAC kaynağı: [`41-ref-002-tenant-rbac.md`](./41-ref-002-tenant-rbac.md)
- UI route/nav enforcement: `tenant-route-access.ts` + `RequireTenantRouteAccess`
- Yönetim sekme erişimi RBAC sözlüğü ile birebir eşleşmelidir (ayrı role matrisi burada tekrar edilmez).

## Terminoloji notu

- Sistem terimi: **Tenant**
- UI label: **Workspace** (`workspaceAdmin.*`, `nav.workspaceAdmin`)

## i18n

Anahtarlar: `workspaceAdmin.*`, `nav.workspaceAdmin`. Platform dili (`/platform/*`) ile karıştırılmaz.
