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

   Beklenen: `admin@pointmor.local`, `owner@demo.pointmor.local`.

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
