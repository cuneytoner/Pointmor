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

- `db:reset`, `prisma migrate reset --force` komutunu çalıştırır.
- `db:reset` yıkıcıdır ve seed adımını otomatik çalıştırır.
- `db:reset` sonrası veritabanı boş kalmaz; seed verisi yeniden yüklenir.
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

- `db:clean`, tüm `public` schema’yı düşürür.
- tüm tablolar kaldırılır ve schema durumu sıfırlanır.
- bu işlem yalnız “clean data” değildir; FULL schema reset’tir.

## 3) Seed akışları

### Komutlar

```bash
cd apps/api
npm run db:seed
npm run db:seed:demo
npm run db:seed:full:demo
```

### Farklar

- `db:seed`: local geliştirme için demo senaryo verisi de içeren geniş seed akışıdır.
- `db:seed:demo`: demo ortamı için hafif senaryo verisi.
- `db:seed:full:demo`: full demo senaryosu için daha zengin veri seti.

### Seed Reality

- `seed.ts` yalnız minimal baseline değildir; demo senaryo verisi içerir.
- `db:seed` birden fazla tenant ve kullanıcı oluşturur.
- mevcut seed çıktısı production-benzeri minimal veri seti değildir.

### Seed doctrine

- Seed verisi güncel platform mimarisini temsil etmelidir.
- `TenantMembership` erişim kaynağıdır (source of truth).
- Seed kullanıcıları access için `User.tenantId` alanına dayanmaz.
- Advisor/client test senaryosu seed içinde olmalı; yoksa açık TODO olarak izlenmelidir.
- Demo/prod dokümanlarında hardcoded şifre yayınlanmamalıdır.

## Membership-first seed model

- Tüm seed akışları kullanıcılar için `TenantMembership` kaydı üretir.
- `User.tenantId` yalnız legacy uyumluluk alanıdır.
- Access kontrolü yalnız membership tabanlıdır.

## AI Act seed kapsamı

- `db:seed` ve uygun demo akışlarında AI Act için sentetik demo verisi oluşturulur.
- En az iki risk profili eklenir: `LIMITED` (daha düşük risk) ve `HIGH` (review odaklı).
- Assessment answer, obligation, task, evidence ve confidence alanları senaryo kapsamında bulunur.
- Low-confidence extraction örnekleri human review kaydıyla birlikte üretilir.
- Gerçek müşteri/veri kullanılmaz; seed yalnız sentetik içerik üretir.
- AI Act verisi tenant-scoped olarak oluşturulur ve `ai_act` module activation bağlamında test edilir.

## 4) Safety uyarıları

- `db:reset` veri yok eder.
- `db:reset` otomatik seed çalıştırır.
- Demo seed, production seed değildir.
- Production deploy explicit `migration` adımı ile yapılır.
- Seed, `TenantMembership` olmadan sessiz erişim vermemelidir.
- Yeni Tenant-scoped seed verisi `tenantId` ve membership hizasıyla eklenmelidir.

## 5) Seed vs Doctrine Mismatch

- Mevcut seed akışında bazı senaryolar `User.tenantId` alanını kullanabilir.
- Seed içerikleri her durumda `TenantMembership` doktrinini tam yansıtmayabilir.
- Bu durum bilinen bir sınırlamadır.
- Seed akışı ileriki fazda doktrinle tam hizalanacaktır.

## 6) Production migration safety özeti

- `RUN_MIGRATIONS_ON_START=false` olmalıdır.
- `migration` ayrı ve gözlenebilir bir deploy adımı olarak çalıştırılmalıdır.
- Production ortamında `db:reset`, `db:seed:demo`, `db:seed:full:demo` kullanılmaz.

## 7) Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerden biri olduğunda aynı PR/task içinde ilgili dokümanlar güncellenir:

- `package.json` db scriptleri
- Prisma `schema` veya `migration` akışı
- `seed` dosyaları
- demo/production deploy scriptleri
- env var adları
- Docker Compose dosyaları
- smoke scriptleri
- `auth` / `session` / `TenantMembership` davranışı
