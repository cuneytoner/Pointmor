# Yerel çalıştırma ve migration komutları

PowerShell’de `npm` bazen `npm.ps1` ile çalışır ve execution policy engeline takılır. Aşağıdaki komutlarda **`npm.cmd`** kullanın (veya `cmd.exe` içinde klasik `npm`).

Tüm yollar repo kökü `Pointmor` (ör. `d:\Projects\Pointmor`) varsayılarak yazılmıştır.

## Ortam dosyaları

| Dosya | İçerik özeti |
|--------|----------------|
| `apps/api/.env` | `PORT`, `CORS_ORIGINS`, `DATABASE_URL` — **git’e eklenmez.** |
| `apps/admin-web/.env.local` | `VITE_API_BASE_URL` (API tabanı); isteğe bağlı `VITE_MARKETING_BASE_URL` (hesap oluştur / pazarlama). |
| Kök `.env.example` | Kopyalama şablonu; gerçek sırlar burada tutulmaz. |

Örnek oluşturma: kök `.env.example` satırlarını ilgili dosyalara kopyalayın ve değerleri doldurun.

## Tek seferlik: bağımlılıklar

```powershell
cd d:\Projects\Pointmor
npm.cmd install
```

`apps/api` için `postinstall` Prisma Client üretir; ilk kurulumda `DATABASE_URL` geçerli olmalı veya sadece `prisma generate` için yeterli bağlantı sağlanmalıdır.

## Geliştirme: API + admin (iki terminal)

**Terminal 1 — API (varsayılan port 3000)**

```powershell
cd d:\Projects\Pointmor
npm.cmd run dev:api
```

**Terminal 2 — Admin web (Vite, port 5173)**

```powershell
cd d:\Projects\Pointmor
npm.cmd run dev:admin
```

Tarayıcı: **`http://127.0.0.1:5173`** (veya hep `localhost`; `127.0.0.1` ile karıştırmayın — localStorage farklıdır).

**Sağlık kontrolü**

```powershell
curl http://127.0.0.1:3000/health
```

Beklenen: `{"ok":true}` (veya eşdeğer JSON).

## Diğer kök scriptler

```powershell
npm.cmd run build
npm.cmd run lint
```

## Prisma ve veritabanı (`apps/api`)

Komutları **`apps\api`** dizininden çalıştırın:

```powershell
cd d:\Projects\Pointmor\apps\api
```

| Komut | Ne işe yarar |
|--------|----------------|
| `npm.cmd run db:generate` | Prisma Client üretir (`src/generated/prisma`). |
| `npm.cmd run db:migrate` | Geliştirme migration’ı (şema değişikliği sonrası; etkileşimli isim isteyebilir). |
| `npm.cmd run db:deploy` | Üretim / CI: mevcut migration dosyalarını DB’ye uygular (`migrate deploy`). |
| `npm.cmd run db:reset` | Veriyi siler, migration’ları baştan uygular (`migrate reset --force`). **Dikkat: veri kaybı.** |
| `npm.cmd run db:clean` | `public` şemasını SQL ile sıfırlar; ardından genelde `db:migrate` veya `db:deploy` gerekir. |
| `npm.cmd run db:fresh` | `db:clean` + `prisma migrate dev --name init` — özel senaryolar; ilk kurulumda dikkatli kullanın. |
| `npm.cmd run db:seed` | Örnek kiracı / kullanıcı / plan. Senaryo başına kullanıcı ve şifreler: [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md). `prisma.config.ts` içinde seed komutu tanımlı. |

**Not:** Yalnızca seed verisi değiştiğinde (yeni kullanıcı vb.) **migration gerekmez**; `db:seed` yeterlidir. Şema (`schema.prisma`) değiştiyse `db:migrate` kullanın.

**PostgreSQL:** `Plan.planType` enum ve `User.defaultWorkspaceId` için migration: `apps/api/prisma/migrations/20260411135200_add_plan_type_and_workspace_prep` — geçerli `DATABASE_URL` ile `db:deploy` veya `db:migrate`.

**Not:** Prisma 7 sunucu tarafında PostgreSQL için `pg` + `@prisma/adapter-pg` kullanılır; `DATABASE_URL` zorunludur.

**İlk kurulum veya şema güncellemesi (tipik geliştirici akışı)**

```powershell
cd d:\Projects\Pointmor\apps\api
npm.cmd run db:generate
npm.cmd run db:migrate
```

Şema repoya işlendiyse ve sadece DB’yi güncellemek yeterliyse:

```powershell
npm.cmd run db:deploy
```

---

### Bakım (asistan / PR sahipleri)

- `package.json` içinde `db:*` scriptleri veya Prisma dosya yolları değişirse **bu dosyayı güncelleyin**.
- Yeni migration akışı eklenirse tabloya yeni satır ekleyin; mümkünse tek kaynak burası olsun.

---

<a id="prisma-migrate-after-schema"></a>

## AI / Cursor: şema veya migration değiştiyse (zorunlu)

Repoda `schema.prisma` güncellendi veya `prisma/migrations/` altına yeni klasör eklendiyse, **görevi bitirmeden önce** geliştirme veritabanına migration uygulanmalıdır. Aksi halde Prisma şeması DB’den ileri kalır; tipik belirti:

- `/auth/login` veya başka endpoint’ler **500**
- API log: `PrismaClientKnownRequestError` **P2022** — `column ... does not exist`

**Asistanın yapması (PowerShell, repo kökünden):**

```powershell
cd d:\Projects\Pointmor\apps\api
npm.cmd run db:deploy
```

- Repoya **yeni migration dosyası** sen ürettiysen (geliştirme): `npm.cmd run db:migrate` (isim sorabilir).
- Sadece seed metni değiştiyse migration gerekmez; `db:seed` yeter (yukarıdaki tablo).

İlgili: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md) altın kural **G5**, [20-rules-007-engineering.md](./20-rules-007-engineering.md) Definition of Done, [.cursor/rules/prisma-migrate-after-schema.mdc](../.cursor/rules/prisma-migrate-after-schema.mdc) (Prisma dosyalarıyla otomatik bağlama).

## VM / SSH ile `postgre.sh` okuma (isteğe bağlı)

Kökte `scripts/fetch-vm-postgre-sh.mjs` ve `ssh2` kullanılır; host / kullanıcı / şifre ortam değişkenleri ile:

```powershell
cd d:\Projects\Pointmor
$env:VM_HOST="192.168.1.20"
$env:VM_USER="cc"
$env:VM_PASSWORD="..."
node scripts/fetch-vm-postgre-sh.mjs
```

Çıktıyı referans alarak `DATABASE_URL` oluşturun; sırları repoya koymayın.
