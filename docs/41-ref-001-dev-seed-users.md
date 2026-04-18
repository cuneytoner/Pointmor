# Geliştirme ortamı — seed kullanıcıları

Bu sayfadaki **e-posta / şifre tablosunun çoğu** **yerel geliştirme** için `npm run db:seed` (`prisma/seed.ts`) ile üretilir. **Uzak demo VM** ise ayrı bir komut kullanır (`db:seed:demo`); aşağıdaki tabloya bakın.

## İki seed akışı (kıyaslama)

| Komut | Giriş dosyası | Ne oluşturur? |
|--------|----------------|---------------|
| **`npm run db:seed`** (`apps/api`) | [`prisma/seed.ts`](../apps/api/prisma/seed.ts) | Temel planlar, `demo-cafe` kiracısı, `admin@pointmor.local` / `owner@demo.pointmor.local`, mesaj şablonları; ardından **[`seed-demo-scenarios.ts`](../apps/api/prisma/seed-demo-scenarios.ts)** — üç senaryolu kiracı (küçük / yoğun / zincir), menü, müşteri, ziyaret, ödül, kampanya. |
| **`npm run db:seed:full:demo`** (`apps/api`) | [`prisma/seed-full-demo.ts`](../apps/api/prisma/seed-full-demo.ts) + [`prisma/seed.ts`](../apps/api/prisma/seed.ts) | Guard’lı full seed: yalnızca `APP_ENV=demo` ve `ALLOW_FULL_DEMO_SEED=true` ile çalışır. İçeride `SEED_FULL_DEMO=1` set eder; opsiyonel `FORCE_RESEED_DEMO=1` ile mevcut senaryo verisini silip yeniden yükler. |
| **`npm run db:seed:demo`** | [`prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts) | Demo VM / izole DB için: env şifreli **platform + işletme** kullanıcıları, `demo-cafe` + abonelik. **`seed-demo-scenarios` çalışmaz** (üç ek kiracı ve ağır veri yok). |

**Üretim benzeri DB’de** `seed-demo-scenarios` varsayılan olarak **atlanır**: `NODE_ENV=production` iken yalnızca `SEED_FULL_DEMO=1` ile açılır (aşağıdaki bölüm).

## Cloudflare / Docker demo (`api.pointmor.com` vb.)

Bu ortamda **`admin@pointmor.local` ve `owner@demo.pointmor.local` kullanıcıları yoktur** — deploy bunları otomatik oluşturmaz. Demo sunucuda ayrı bir seed vardır:

| Kaynak | Açıklama |
|--------|----------|
| Script | [`infra/scripts/seed-demo.sh`](../infra/scripts/seed-demo.sh) — `api-demo` konteyneri içinde çalışır (VM’de ayrı Node gerekmez; otomatik deploy **çalıştırmaz**) |
| Kod | [`apps/api/prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts) |
| Varsayılan e-postalar | `admin-demo@pointmor.demo` (platform admin), `owner-demo@pointmor.demo` (işletme) — `DEMO_ADMIN_EMAIL` / `DEMO_OPERATOR_EMAIL` ile değiştirilebilir |
| Şifreler | `infra/docker/.env.demo` içindeki **`DEMO_ADMIN_PASSWORD`** ve **`DEMO_OPERATOR_PASSWORD`** (≥12 karakter); dokümanda sabit şifre yok |

Cloudflare üzerinden giriş için: sunucuda seed’in en az bir kez çalıştırıldığından emin olun ve **o ortamda tanımlı e-posta + şifre** ile deneyin. Ayrıntı: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) (Demo seed bölümü), [`40-guide-005-demo-deployment-runbook.md`](./40-guide-005-demo-deployment-runbook.md) (bölüm 5).

### Demo ortamında full seed (`seed-full-demo.sh`) kullanıcıları

`./infra/scripts/seed-full-demo.sh` komutu, konteyner içinde `npm run db:seed:full:demo -w api` çağırır (`SEED_FULL_DEMO=1` + `db:seed`). Bu akışta aşağıdaki kullanıcılar oluşur/güncellenir:

| Rol | E-posta | Şifre kaynağı | Workspace |
|-----|---------|---------------|-----------|
| Platform admin | `admin@pointmor.local` | Sabit seed değeri: `PointmorDev!Admin` | *(boş)* |
| Demo işletme owner | `owner@demo.pointmor.local` | Sabit seed değeri: `PointmorDev!Demo` | `demo-cafe` |
| Senaryo owner (small) | `owner@small.pointmor.local` | `SEED_DEV_OPERATOR_PASSWORD` veya varsayılan `PointmorDev!Demo` | `demo-small-cafe` |
| Senaryo owner (busy) | `owner@busy.pointmor.local` | `SEED_DEV_OPERATOR_PASSWORD` veya varsayılan `PointmorDev!Demo` | `demo-busy-cafe` |
| Senaryo owner (chain) | `owner@chain.pointmor.local` | `SEED_DEV_OPERATOR_PASSWORD` veya varsayılan `PointmorDev!Demo` | `demo-coffee-chain` |

Notlar:
- `db:seed:demo` ile gelen `admin-demo@pointmor.demo` / `owner-demo@pointmor.demo` hesapları **ayrı akıştır**; full seed bu e-postaları üretmez.
- Demo’da owner şifresini özelleştirmek için seed öncesi konteynere `SEED_DEV_OPERATOR_PASSWORD` verilebilir.
- Full seed’in amacı yalnızca demo/staging veri zenginleştirmesidir; üretimde kullanılmamalıdır.

---

Aşağıdaki tablo **yalnızca** `npm run db:seed` (`prisma/seed.ts`) çalıştırdığınız **yerel** (veya aynı seed’i o veritabanına uyguladığınız) ortam içindir. **Üretimde kullanılmamalıdır.**

Şema değişikliği gerektirmez; kullanıcı eklemek için **migration değil**, seed çalıştırmanız yeterlidir. Veritabanını sıfırlamak isterseniz: `npm run db:reset` (veri silinir) veya yalnızca `db:seed` ile mevcut kayıtlar upsert edilir.

## Bağlantı: `.env` ve PostgreSQL

1. **Tek kaynak:** `apps/api/.env` — şablon: [`apps/api/.env.example`](../apps/api/.env.example).  
   `DATABASE_URL` **postgresql://...** olmalı.

2. **Seed sonrası doğrulama:**

   ```sql
   SELECT email, "platformAdmin" FROM "User" ORDER BY email;
   SELECT slug, name FROM "Tenant" ORDER BY slug;
   ```

   Beklenen: en az `admin@pointmor.local`, `owner@demo.pointmor.local`, üç senaryo sahibi (`owner@small|busy|chain.pointmor.local`); tenant satırlarında `demo-cafe` ve `demo-small-cafe`, `demo-busy-cafe`, `demo-coffee-chain`.

## Yerel `db:seed` veri envanteri (kodla uyumlu)

Aşağıdaki özet [`seed.ts`](../apps/api/prisma/seed.ts), [`seed-demo-scenarios.ts`](../apps/api/prisma/seed-demo-scenarios.ts) ve [`seed-message-templates.ts`](../apps/api/prisma/seed-message-templates.ts) dosyalarına göredir. Kod değişirse bu bölüm güncellenmelidir.

### A. Çekirdek (`seed.ts` — `seedDemoScenarios` çağrılmadan önce)

| Ne | Değer / not |
|----|-------------|
| **Planlar** | `starter` (free), `growth` (pro) — limit ve özellik etiketleri kodda |
| **Kiracı** | `demo-cafe` — **Pointmor Demo Cafe**, onboarding tamam |
| **Abonelik** | `id`: `seed_sub_demo`, plan **growth**, `renewsAt`: `2026-05-01` |
| **Kullanıcılar** | `admin@pointmor.local` (platform), `owner@demo.pointmor.local` (tenant_operator, `demo-cafe`) |
| **Denetim** | `AuditLog`: `action: seed`, `detail: pointmor_baseline` |
| **Mesaj şablonları** | `MESSAGE_TEMPLATE_SEED` → `messageTemplate.createMany` (ör. `FIRST_VISIT`, `DAY_1_REMINDER`, … — SMS ve WhatsApp kanalları) |

### B. Demo senaryoları (`seed-demo-scenarios.ts`)

Modül çalıştığında önce **`scale`** planı (slug `scale`, TEAM) oluşturulur/güncellenir; ardından üç kiracı doldurulur.

**Kiracı özeti**

| `slug` | Görünen ad (`Tenant.name`) | Mağaza adı (`storeSettings.storeName`) | Owner | Plan | Abonelik `id` | Hedef müşteri sayısı* |
|--------|----------------------------|----------------------------------------|-------|------|---------------|----------------------|
| `demo-small-cafe` | Artisan Small Cafe (FREE) | Artisan Small Cafe | `owner@small.pointmor.local` | `starter` | `seed_sub_demo_small` | 38 |
| `demo-busy-cafe` | Busy Corner Cafe (PRO) | Busy Corner Cafe | `owner@busy.pointmor.local` | `growth` | `seed_sub_demo_busy` | 400 |
| `demo-coffee-chain` | Metro Coffee Chain (TEAM) | Metro Coffee Chain | `owner@chain.pointmor.local` | `scale` | `seed_sub_demo_chain` | 1200 |

\*Hedef sayı kadar müşteri üretilir (isimler `Müşteri 0001` …); ardından ziyaretler, puan defteri ve sadakat bakiyeleri hesaplanır.

**Mağaza:** Her senaryoda `storeSettings`: para birimi **EUR**, `timezone` **Europe/Istanbul**, `menuPublicEnabled: true`.

**Menü şablonu:** Üç kategori — **Coffee**, **Drinks**, **Desserts** (örnek ürünler: Espresso, Latte, …; fiyatlar minor birim; görseller `picsum.photos` seed URL’leri).

**Ödüller (senaryo anahtarına göre)**

| Anahtar | Ödül adları (özet) |
|---------|-------------------|
| `small` | Free Coffee (FREE_ITEM); Pastry discount (FIXED_DISCOUNT, 500 minor) |
| `busy` | Free Coffee; 10% off bill (PERCENT_DISCOUNT); Free dessert |
| `chain` | Free Coffee; Breakfast combo -2€ (FIXED_DISCOUNT); 15% weekend; Merch mug; Free delivery |

**Kampanyalar (`type: BONUS_POINTS`, aktif, tarih aralığı yaklaşık son 30 gün + sonraki 90 gün)**

| Anahtar | Kampanyalar |
|---------|-------------|
| `small` | *(yok)* |
| `busy` | Tek: “Hafta içi +10 puan” (`config.points: 10`) |
| `chain` | “Sabah ekstra +5 puan” (`points: 5`); “Hafta sonu bonus +8 puan” (`points: 8`) |

Ziyaret üretimi bu kampanyalara göre bonus puan uygular; `VisitCampaignApplication` kayıtları oluşur.

**Örnek redemption:** En ucuz ödül için tamamlanmış talepler (senaryoya göre üst sınır: small 4, busy 48, chain 200 müşteriye kadar).

**Ortam değişkenleri (senaryo modülü)**

| Değişken | Anlam |
|----------|--------|
| `FORCE_RESEED_DEMO=1` | İlgili kiracıda zaten müşteri varsa bile önce senaryo verisini silip **baştan** yükler. |
| `NODE_ENV=production` ve `SEED_FULL_DEMO≠1` | Senaryo bloğu **çalışmaz** (log: atlandı). Demo VM’de üç kiracılı veriyi istiyorsanız konteyner/ortamda `SEED_FULL_DEMO=1` verip tam `db:seed` benzeri süreç gerekir — `seed-demo.sh` yalnızca `db:seed:demo` çalıştırır. |
| `SEED_DEV_OPERATOR_PASSWORD` | Üç senaryo owner hesabının şifresi (bcrypt); yoksa varsayılan **`PointmorDev!Demo`** (`seed.ts` ile aynı). |

Yeniden doldurmak (yerel): `FORCE_RESEED_DEMO=1 npm run db:seed`.

### C. Uzak demo (`seed-demo.ts`) — kısa

`starter` + `growth` upsert; `demo-cafe` + `seed_sub_demo` aboneliği; kullanıcılar env e-posta ile. **Senaryo kiracıları, menü, müşteri yığını yok** — bkz. üstte “İki seed akışı” tablosu.

## Kimlik bilgileri (yerel / staging)

| Senaryo | E-posta | Şifre | Workspace kodu (opsiyonel) | Not |
|---------|---------|-------|----------------------------|-----|
| **Platform admin** | `admin@pointmor.local` | `PointmorDev!Admin` | *(boş)* | `platformAdmin: true`; Platform Console. |
| **Demo işletme** | `owner@demo.pointmor.local` | `PointmorDev!Demo` | `demo-cafe` veya boş | Tenant **Pointmor Demo Cafe**; abonelik **Büyüme** (`growth`). |
| **Senaryo işletmeleri** (yerel `db:seed` + senaryo modülü) | `owner@small.pointmor.local`, `owner@busy.pointmor.local`, `owner@chain.pointmor.local` | Varsayılan **`PointmorDev!Demo`** (`SEED_DEV_OPERATOR_PASSWORD` ile değişir) | `demo-small-cafe`, `demo-busy-cafe`, `demo-coffee-chain` | Planlar sırasıyla starter / growth / scale — ayrıntı yukarıdaki envanter tablosu. |

Ayrıca seed’de **Başlangıç** (`starter`) planı oluşturulur; `demo-cafe` kiracısı varsayılan olarak **growth** aboneliğine bağlıdır.

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

- [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts) — yerel dev baseline; sonunda `seedDemoScenarios` çağrısı
- [`apps/api/prisma/seed-message-templates.ts`](../apps/api/prisma/seed-message-templates.ts) — global mesaj şablonları (`MESSAGE_TEMPLATE_SEED`)
- [`apps/api/prisma/seed-demo-scenarios.ts`](../apps/api/prisma/seed-demo-scenarios.ts) — üç senaryolu kiracı ve ağır demo veri
- [`apps/api/prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts) — uzak demo VM (`db:seed:demo`); senaryo kiracıları yok
- [`40-guide-001-run-local.md`](./40-guide-001-run-local.md) — Prisma komutları özeti
