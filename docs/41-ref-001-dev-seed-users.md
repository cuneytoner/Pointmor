# Geliştirme ortamı — seed kullanıcıları

## Komutlar

`apps/api` dizininde:

```bash
npm run db:seed
npm run db:seed:demo
npm run db:seed:full:demo
```

---

## Ortam açıklaması

| Komut | Amaç | Kısa not |
|-------|------|----------|
| `db:seed` | Yerel geliştirme temel verisi | plan + tenant + kullanıcı + örnek operasyon verisi |
| `db:seed:demo` | Demo/izole ortam seed | daha hafif demo verisi |
| `db:seed:full:demo` | Full demo seed | yalnızca açık demo guard koşullarında çalışır |

Gerekli temel ortam:

- `DATABASE_URL`
- demo akışları için ilgili `DEMO_*` değişkenleri
- full demo için guard değişkenleri (`APP_ENV=demo`, `ALLOW_FULL_DEMO_SEED=true`, vb.)

---

## Kısa kullanıcı tablosu

| Kullanım | Örnek e-posta | Not |
|----------|---------------|-----|
| Platform admin (dev) | `admin@pointmor.local` / `admin-demo@pointmor.demo` | seed akışına göre değişir |
| Tenant owner (dev/demo) | `owner@demo.pointmor.local` / `owner-demo@pointmor.demo` | tenant yönetim girişi |
| Advisor admin (demo) | `advisor-admin@pointmor.demo` | advisor tenant + client tenant üyeliği |
| Advisor staff (demo) | `advisor-staff@pointmor.demo` | advisor tenant üyesi |
| Client owner (demo) | `client-owner@pointmor.demo` | client tenant admin üyesi |

Şifreler bu dokümanda sabitlenmez; ortam değişkenlerinden yönetilir.

---

## Multi-tenant / Advisor test setup

Demo seed akışı aşağıdaki yapıyı test için oluşturur:

- advisor tenant (`ADVISOR`)
- client tenant (`BUSINESS`)
- external advisor üyelik senaryosu (`isExternal=true`)
- membership-based access doğrulama

Tenant erişimi için source of truth: `TenantMembership`.

---

## İlgili dosyalar

- [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts)
- [`apps/api/prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts)
- [`apps/api/prisma/seed-full-demo.ts`](../apps/api/prisma/seed-full-demo.ts)
