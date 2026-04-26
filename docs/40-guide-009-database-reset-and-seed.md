# Veritabanı reset ve seed rehberi

Bu rehber local, demo ve production ortamlarında `migration` ve `seed` operasyonlarını güvenli şekilde yönetmek için kanonik akıştır.

## 1) Komut kapsamı (`apps/api`)

```bash
cd apps/api
```

- `npm run db:generate`
- `npm run db:deploy`
- `npm run db:migrate`
- `npm run db:clean`
- `npm run db:fresh`
- `npm run db:reset`
- `npm run db:seed`
- `npm run db:seed:demo`
- `npm run db:seed:full:demo`

## 2) Dev DB clean/reset/seed

### Tipik yerel güncelleme

`migration` dosyaları hazırsa:

```bash
cd apps/api
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
```

### Full yerel reset

Yalnız veri kaybı kabul ediliyorsa:

```bash
cd apps/api
npm.cmd run db:reset
```

Güvenlik notu:

- `db:reset` local veriyi tamamen siler.
- `db:reset` production için yasaktır.
- Yeni seed verisi `TenantMembership` içermelidir.
- `User.tenantId` legacy alandır; access kontrol kaynağı değildir.

### Clean/fresh akışı

```bash
cd apps/api
npm.cmd run db:clean
npm.cmd run db:fresh
```

Ne zaman kullanılır:

- local ortamı tamamen temizleyip yeni `migration` başlangıcı gerektiğinde.

Ne zaman kullanılmaz:

- demo/prod veya paylaşılan ekip veritabanları.

Beklenen etki:

- tüm tablo verileri silinir.

## 3) Seed akışları

### Komutlar

```bash
cd apps/api
npm run db:seed
npm run db:seed:demo
npm run db:seed:full:demo
```

### Farklar

- `db:seed`: local geliştirme için temel tenant/kullanıcı/veri akışı.
- `db:seed:demo`: demo ortamı için hafif senaryo verisi.
- `db:seed:full:demo`: full demo senaryosu için daha zengin veri seti.

### Seed doctrine

- Seed verisi güncel platform mimarisini temsil etmelidir.
- `TenantMembership` erişim kaynağıdır (source of truth).
- Seed kullanıcıları access için `User.tenantId` alanına dayanmaz.
- Advisor/client test senaryosu seed içinde olmalı; yoksa açık TODO olarak izlenmelidir.
- Demo/prod dokümanlarında hardcoded şifre yayınlanmamalıdır.

## 4) Safety uyarıları

- `db:reset` veri yok eder.
- Demo seed, production seed değildir.
- Production deploy explicit `migration` adımı ile yapılır.
- Seed, `TenantMembership` olmadan sessiz erişim vermemelidir.
- Yeni Tenant-scoped seed verisi `tenantId` ve membership hizasıyla eklenmelidir.

## 5) Production migration safety özeti

- `RUN_MIGRATIONS_ON_START=false` olmalıdır.
- `migration` ayrı ve gözlenebilir bir deploy adımı olarak çalıştırılmalıdır.
- Production ortamında `db:reset`, `db:seed:demo`, `db:seed:full:demo` kullanılmaz.

## 6) Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerden biri olduğunda aynı PR/task içinde ilgili dokümanlar güncellenir:

- `package.json` db scriptleri
- Prisma `schema` veya `migration` akışı
- `seed` dosyaları
- demo/production deploy scriptleri
- env var adları
- Docker Compose dosyaları
- smoke scriptleri
- `auth` / `session` / `TenantMembership` davranışı
