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
| `npm run db:reset` | `prisma migrate reset --force` çalıştırır, DB’yi sıfırlar ve seed’i otomatik tekrar çalıştırır |
| `npm run db:seed` | Dev seed verisi yükler |
| `npm run db:seed:demo` | Demo seed |
| `npm run db:seed:full:demo` | Full demo seed |

Kural:

- Schema değiştiyse migration (`db:migrate` veya `db:deploy`) çalıştır.
- Sadece örnek veri değiştiyse seed yeterli.

---

## 5) Dev DB clean/reset/seed akışları

Detaylı rehber: [`40-guide-009-database-reset-and-seed.md`](./40-guide-009-database-reset-and-seed.md)

### Tipik yerel güncelleme (migration mevcutsa)

```bash
cd apps/api
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
```

### Full yerel reset (veri kaybı kabul ediliyorsa)

```bash
cd apps/api
npm.cmd run db:reset
```

Uyarılar:

- `db:reset` (`prisma migrate reset --force`) yıkıcıdır ve seed’i otomatik çalıştırır.
- `db:reset` sonrası DB boş kalmaz; seed verisi tekrar yazılır.
- `db:reset` production ortamında **asla** kullanılmaz.
- Seed verisi `TenantMembership` kayıtlarını içermelidir.
- `User.tenantId` legacy alandır; access kontrolü için kullanılmaz.

### Clean/fresh akışı

```bash
cd apps/api
npm.cmd run db:clean
npm.cmd run db:fresh
```

Ne zaman:

- `db:clean`: `public` schema’yı komple düşürür; tüm tabloları siler ve schema durumunu sıfırlar.
- `db:fresh`: temiz schema + yeni migration başlangıcı için (yerel geliştirme).

Ne zaman kullanılmaz:

- paylaşılan ortamlar, demo ve production.

Beklenen etki:

- `db:clean` yalnız veri temizliği değildir; FULL schema reset etkisi yaratır.
- tüm tenant verisi ve ilişkili kayıtlar kaybolur.

---

## 6) Dokümanı Güncel Tutma Kuralı

Aynı PR/task içinde ilgili dokümanları güncelle:

- `package.json` db script değişiklikleri
- Prisma `schema` / `migration` akışı
- `seed` dosyaları
- demo/production deploy scriptleri
- env var adları
- Docker Compose dosyaları
- smoke scriptleri
- `auth` / `session` / `TenantMembership` davranışı
