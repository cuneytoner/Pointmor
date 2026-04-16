# Geliştirme ortamı — seed kullanıcıları

Bu sayfadaki **e-posta / şifre tablosu** yalnızca **yerel geliştirme seed’i** (`npm run db:seed` → `prisma/seed.ts`) içindir.

## Cloudflare / Docker demo (`api.pointmor.com` vb.)

Bu ortamda **`admin@pointmor.local` ve `owner@demo.pointmor.local` kullanıcıları yoktur** — deploy bunları otomatik oluşturmaz. Demo sunucuda ayrı bir seed vardır:

| Kaynak | Açıklama |
|--------|----------|
| Script | [`infra/scripts/seed-demo.sh`](../infra/scripts/seed-demo.sh) — `api-demo` konteyneri içinde çalışır (VM’de ayrı Node gerekmez; otomatik deploy **çalıştırmaz**) |
| Kod | [`apps/api/prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts) |
| Varsayılan e-postalar | `admin-demo@pointmor.demo` (platform admin), `owner-demo@pointmor.demo` (işletme) — `DEMO_ADMIN_EMAIL` / `DEMO_OPERATOR_EMAIL` ile değiştirilebilir |
| Şifreler | `infra/docker/.env.demo` içindeki **`DEMO_ADMIN_PASSWORD`** ve **`DEMO_OPERATOR_PASSWORD`** (≥12 karakter); dokümanda sabit şifre yok |

Cloudflare üzerinden giriş için: sunucuda seed’in en az bir kez çalıştırıldığından emin olun ve **o ortamda tanımlı e-posta + şifre** ile deneyin. Ayrıntı: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) (Demo seed bölümü), [`40-guide-005-demo-deployment-runbook.md`](./40-guide-005-demo-deployment-runbook.md) (bölüm 5).

---

Aşağıdaki tablo **yalnızca** `npm run db:seed` (`prisma/seed.ts`) çalıştırdığınız **yerel** (veya aynı seed’i o veritabanına uyguladığınız) ortam içindir. **Üretimde kullanılmamalıdır.**

Şema değişikliği gerektirmez; kullanıcı eklemek için **migration değil**, seed çalıştırmanız yeterlidir. Veritabanını sıfırlamak isterseniz: `npm run db:reset` (veri silinir) veya yalnızca `db:seed` ile mevcut kayıtlar upsert edilir.

## Bağlantı: `.env` ve PostgreSQL

1. **Tek kaynak:** `apps/api/.env` — şablon: [`apps/api/.env.example`](../apps/api/.env.example).  
   `DATABASE_URL` **postgresql://...** olmalı.

2. **Seed sonrası doğrulama:**

   ```sql
   SELECT email, "platformAdmin" FROM "User" ORDER BY email;
   ```

   Beklenen: en az `admin@pointmor.local`, `owner@demo.pointmor.local` ve aşağıdaki senaryo sahipleri.

## Demo senaryo kiracıları (`seed-demo-scenarios.ts`)

`npm run db:seed` ayrıca üç **demo tenant** oluşturur (menü, müşteri, ziyaret, ödül, kampanya). Şifre: `SEED_DEV_OPERATOR_PASSWORD` yoksa **`PointmorDev!Demo`** (demo işletme ile aynı).

| Workspace (`slug`) | İşletme | Owner e-posta | Plan (seed) |
|--------------------|---------|----------------|-------------|
| `demo-small-cafe` | Artisan Small Cafe (FREE) | `owner@small.pointmor.local` | `starter` (FREE) |
| `demo-busy-cafe` | Busy Corner Cafe (PRO) | `owner@busy.pointmor.local` | `growth` (PRO) |
| `demo-coffee-chain` | Metro Coffee Chain (TEAM) | `owner@chain.pointmor.local` | `scale` (TEAM) |

Yeniden doldurmak (mevcut senaryo verisini silip baştan): `FORCE_RESEED_DEMO=1 npm run db:seed`. Üretimde ağır seed varsayılan olarak **kapalıdır**; açmak için `SEED_FULL_DEMO=1` gerekir.

## Kimlik bilgileri (yerel / staging)

| Senaryo | E-posta | Şifre | Workspace kodu (opsiyonel) | Not |
|---------|---------|-------|----------------------------|-----|
| **Platform admin** | `admin@pointmor.local` | `PointmorDev!Admin` | *(boş)* | `platformAdmin: true`; Platform Console. |
| **Demo işletme** | `owner@demo.pointmor.local` | `PointmorDev!Demo` | `demo-cafe` veya boş | Tenant **Pointmor Demo Cafe**; abonelik **Büyüme** (`growth`). |

Ayrıca seed’de **Başlangıç** (`starter`) planı oluşturulur; demo kiracı varsayılan olarak **growth** aboneliğine bağlıdır.

Login formunda **workspace** alanı: tenant kullanıcıları için `demo-cafe` girilebilir; boş bırakılabilir.

## Migration sonra seed

```powershell
cd d:\Projects\Pointmor\apps\api
npm run db:deploy
npm run db:seed
```

İlk kurulum veya şema sıfırdan:

```powershell
npm run db:reset
```

## İlgili dosyalar

- `apps/api/prisma/seed.ts` — kaynak tanım
- [`40-guide-001-run-local.md`](./40-guide-001-run-local.md) — Prisma komutları özeti
