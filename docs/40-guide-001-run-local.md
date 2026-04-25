# Yerel geliştirme (kısa rehber)

## 1) Kurulum

```bash
cd d:\Projects\Pointmor
npm install
```

Gerekli temel env:

- `apps/api/.env` (`DATABASE_URL` zorunlu)
- `apps/admin-web/.env.local` (`VITE_API_BASE_URL` önerilir)

---

## 2) Uygulamayı çalıştırma

API:

```bash
npm run dev:api
```

Admin:

```bash
npm run dev:admin
```

Health:

```bash
curl http://127.0.0.1:3000/health
```

---

## 3) Build ve lint

```bash
npm run build
npm run lint
```

---

## 4) Veritabanı komutları (`apps/api`)

```bash
cd d:\Projects\Pointmor\apps\api
```

| Komut | Amaç |
|-------|------|
| `npm run db:generate` | Prisma client üretir |
| `npm run db:migrate` | Yeni migration oluşturur/uygular |
| `npm run db:deploy` | Mevcut migration’ları uygular |
| `npm run db:reset` | DB’yi sıfırlar (veri kaybı) |
| `npm run db:seed` | Dev seed verisi yükler |
| `npm run db:seed:demo` | Demo seed |
| `npm run db:seed:full:demo` | Full demo seed |

Kural:

- Schema değiştiyse migration (`db:migrate` veya `db:deploy`) çalıştır.
- Sadece örnek veri değiştiyse seed yeterli.
