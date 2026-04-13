# Geliştirme ortamı — seed kullanıcıları

Bu hesaplar yalnızca **`apps/api` Prisma seed** (`npm run db:seed`) ile oluşturulur veya güncellenir. **Üretimde kullanılmamalıdır.**

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
