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

### Seed mode yapısı (tek entrypoint)

- Tüm seed akışları `apps/api/prisma/seed.ts` içindeki `runSeed({ mode })` girişinden çalışır.
- `mode` kaynağı `SEED_MODE` ortam değişkenidir; varsayılan `dev` olarak çözülür.
- Desteklenen modlar: `dev`, `demo`, `prod`.
- `seed-demo.ts` ve `seed-full-demo.ts` yalnız wrapper’dır; çekirdek akış `seedCore()` üzerinden ilerler.

### Komutlar

```bash
cd apps/api
npm run db:seed
npm run db:seed:demo
npm run db:seed:prod
npm run db:seed:full:demo
```

### Farklar

- `db:seed`: `SEED_MODE=dev` ile çalışır.
- `db:seed:demo`: `SEED_MODE=demo` ile çalışır.
- `db:seed:prod`: `SEED_MODE=prod` ile çalışır (demo kullanıcıları seed etmez, opsiyonel bootstrap admin).
- `db:seed:full:demo`: demo guard kontrollerinden sonra `runSeed({ mode: "demo", includeFullDemoScenarios: true })` çalıştırır.

### Ortak kullanıcı seti

Aşağıdaki hesaplar seed sözleşmesinin parçasıdır:

- `admin@pointmor.local`
- `owner@acme.pointmor.local`
- `owner@urban.pointmor.local`
- `owner@retailcorp.pointmor.local`
- `advisor@pointmor.local`
- `member@pointmor.local`

Access kaynağı her zaman `TenantMembership` kayıtlarıdır; `User.tenantId` yalnız legacy uyumluluk alanıdır.

### Tenant tipleri ve module aktivasyonu

Seed, cok urunlu platform yapisi icin 3 tenant tipi kurar:

| Tenant slug | Tip | Module aktivasyon |
|-------------|-----|-------------------|
| `acme-ai-solutions` | AI Act focused | `ai_act=true`, `cafe=false`, `ai_document_intelligence=true` (module varsa) |
| `urban-coffee-group` | Loyalty focused | `cafe=true`, `ai_act=false`, `ai_document_intelligence=false` (module varsa) |
| `retailcorp-eu` | Mixed | `cafe=true`, `ai_act=true`, `ai_document_intelligence=true` (module varsa) |
| `kanzlei-mueller-advisory` | Advisor | advisor tenant; advisor/client membership akisi |

Module aktivasyon kayitlari `tenant_modules` tablosunda idempotent olarak upsert edilir; veri seti ile aktivasyon her seed calismasinda yeniden hizalanir.

### Şifre çözümleme kuralı (`resolvePassword`)

- `DEV`: env varsa kullanılır, yoksa fallback kullanılır.
  - `SEED_DEV_ADMIN_PASSWORD` (fallback: `PointmorDev!Admin`)
  - `SEED_DEV_OPERATOR_PASSWORD` (fallback: `PointmorDev!Demo`)
- `DEMO`: env zorunludur, eksikse seed hata vererek durur.
  - `DEMO_ADMIN_PASSWORD` (zorunlu)
  - `DEMO_OPERATOR_PASSWORD` (zorunlu)
- `PROD`: demo kullanıcıları seed edilmez.
  - `PROD_BOOTSTRAP_ADMIN_PASSWORD` verilirse yalnız bootstrap admin oluşturulur.
  - verilmezse seed bu kısmı atlayarak çıkar.

### Mode bazlı login bilgileri

- `dev`:
  - admin: `admin@pointmor.local` + `SEED_DEV_ADMIN_PASSWORD` (yoksa `PointmorDev!Admin`)
  - owner/advisor/member: operator şifresi (`SEED_DEV_OPERATOR_PASSWORD`, yoksa `PointmorDev!Demo`)
- `demo`:
  - admin: `admin@pointmor.local` + `DEMO_ADMIN_PASSWORD`
  - owner/advisor/member: `DEMO_OPERATOR_PASSWORD`
- `prod`:
  - yalnız bootstrap admin (opsiyonel): `PROD_BOOTSTRAP_ADMIN_EMAIL` (yoksa `admin@pointmor.local`) + `PROD_BOOTSTRAP_ADMIN_PASSWORD`
  - demo kullanıcıları bu modda oluşturulmaz.

### Seed Reality

- `db:seed`, birincil multi-product platform modelini uretir (yalniz 4 tenant): `acme-ai-solutions`, `urban-coffee-group`, `retailcorp-eu`, `kanzlei-mueller-advisory`.
- Legacy cafe agir demo tenant'lari varsayilan `db:seed` akisinda uretilmez.
- Legacy genis demo senaryolari yalniz `db:seed:full:demo` ile uretilir.
- Seed ciktilari production verisi degildir; sentetik gelistirme/demo amacli veridir.

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

- `db:seed` ve uygun demo akışlarında AI Act focused tenant (`acme-ai-solutions`) için 3 sistem seed edilir.
- Sistem seti: `Customer Support Chatbot`, `CV Screening Tool`, `Fraud Detection AI`.
- Risk profilleri: `LIMITED`, `HIGH`, `MINIMAL`.
- Assessment answer, obligation, task, evidence ve confidence alanları senaryo kapsamında bulunur.
- Assessment key seti runtime ile birebir hizalıdır; tek kaynak `apps/api/src/lib/ai-act-assessment.ts` içindeki `AI_ACT_QUESTION_KEYS` tanımıdır.
- Low-confidence extraction örnekleri human review kaydıyla birlikte üretilir.
- Gerçek müşteri/veri kullanılmaz; seed yalnız sentetik içerik üretir.
- AI Act verisi tenant-scoped olarak oluşturulur ve `ai_act` module activation baglaminda test edilir.
- Mixed tenant (`retailcorp-eu`) icin minimal AI Act seed uretilir.
- Minimal AI Act sistem: `Invoice Processing AI`.

## Loyalty seed kapsamı

- Loyalty focused tenant (`urban-coffee-group`) mevcut cafe/demo veri setini korur.
- Mixed tenant (`retailcorp-eu`) icin minimal loyalty seed uretilir (en az bir customer/reward/visit).

## 4) Safety uyarıları

- `db:reset` veri yok eder.
- `db:reset` otomatik seed çalıştırır.
- Demo seed, production seed değildir.
- Production deploy explicit `migration` adımı ile yapılır.
- Seed, `TenantMembership` olmadan sessiz erişim vermemelidir.
- Yeni Tenant-scoped seed verisi `tenantId` ve membership hizasıyla eklenmelidir.

## 5) Seed vs Doctrine Mismatch

- Bilinen mismatch hedefi kapatılmıştır.
- Seed erişim modeli membership-first olarak uygulanır.
- `User.tenantId` erişim kaynağı değildir; yalnız legacy uyumluluk alanıdır.

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
