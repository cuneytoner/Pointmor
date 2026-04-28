# Geliştirme ortamı — seed kullanıcıları

## Komutlar

`apps/api` dizininde:

```bash
npm run db:seed
npm run db:seed:demo
npm run db:seed:full:demo
```

---

## Ortam açıklaması

| Komut | Amaç | Kısa not |
|-------|------|----------|
| `db:seed` | Yerel geliştirme seed | yalniz birincil multi-product tenant modelini uretir |
| `db:seed:demo` | Demo/izole ortam seed | daha hafif demo verisi |
| `db:seed:full:demo` | Full demo seed | yalnızca açık demo guard koşullarında çalışır |

Gerekli temel ortam:

- `DATABASE_URL`
- demo akışları için ilgili `DEMO_*` değişkenleri
- full demo için guard değişkenleri (`APP_ENV=demo`, `ALLOW_FULL_DEMO_SEED=true`, vb.)

---

## Kısa kullanıcı tablosu

| Kullanım | Örnek e-posta | Not |
|----------|---------------|-----|
| Platform admin | `admin@pointmor.local` | platform admin, tenant erişimi membership ile |
| AI Act owner | `owner@acme.pointmor.local` | `acme-ai-solutions` tenant admin membership |
| Loyalty owner | `owner@urban.pointmor.local` | `urban-coffee-group` tenant admin membership |
| Mixed owner | `owner@retailcorp.pointmor.local` | `retailcorp-eu` tenant admin membership |
| Member | `member@pointmor.local` | loyalty + mixed tenant membership |
| Advisor | `advisor@pointmor.local` | advisor tenant admin + ilgili client tenant'larda external advisor membership |

Şifreler bu dokümanda sabitlenmez; ortam değişkenlerinden yönetilir.

---

## Seed tenant tipleri ve module mapping

Temel seed akışı üç tenant tipi üretir:

| Tenant slug | Tenant tipi | Aktif module'ler | Seed odağı |
|-------------|-------------|------------------|------------|
| `acme-ai-solutions` | AI Act focused | `ai_act` aktif, `cafe` pasif | 3 AI system + assessment/obligation/task |
| `urban-coffee-group` | Loyalty focused | `cafe` aktif, `ai_act` pasif | mevcut cafe/demo loyalty verisi |
| `retailcorp-eu` | Mixed | `cafe` + `ai_act` aktif | minimal loyalty + minimal AI Act |
| `kanzlei-mueller-advisory` | Advisor | advisor odağı (tenant type `ADVISOR`) | advisor/client membership senaryosu |

Tenant erişimi için source of truth: `TenantMembership`.

---

## Seed doctrine

- Seed verisi güncel platform mimarisi ile uyumlu olmalıdır.
- Access kaynağı `TenantMembership` olmalıdır.
- `User.tenantId` legacy uyumluluk alanıdır; access kontrolü için kullanılmaz.
- Advisor/client test senaryosu seed içinde olmalı; eksikse backlog TODO olarak takip edilmelidir.
- Hardcoded şifreler demo/production operasyon dokümanlarında tutulmaz.

## Membership-first seed model

- Tüm seed akışları `TenantMembership` kaydı üretir.
- `User.tenantId` yalnız legacy uyumluluk için tutulur.
- Access membership tabanlı çalışır.

## AI Act synthetic demo scenarios

- AI Act focused tenant (`acme-ai-solutions`) için 3 sistem seed edilir:
  - `Customer Support Chatbot`
  - `CV Screening Tool`
  - `Fraud Detection AI`
- Senaryolar `LIMITED`, `HIGH`, `MINIMAL` risk seviyelerini kapsar.
- AI assessment cevapları, obligation/task kayıtları, evidence linkleri ve confidence alanları seed edilir.
- AI assessment key seti runtime ile birebir hizalıdır; tek kaynak `apps/api/src/lib/ai-act-assessment.ts` içindeki `AI_ACT_QUESTION_KEYS` tanımıdır.
- Low-confidence + review-required örnekleri özellikle eklenir.
- Seed verisi gerçek müşteri verisi içermez; yalnız sentetik/anonymized örnekler kullanılır.
- AI Act verileri tenant-scoped üretilir ve module activation (`ai_act`) açık tenant bağlamında çalışır.

---

## Seed Reality

- `db:seed`, birincil platform modeli olan 4 tenant ile calisir: `acme-ai-solutions`, `urban-coffee-group`, `retailcorp-eu`, `kanzlei-mueller-advisory`.
- Legacy cafe agir demo tenant'lari varsayilan `db:seed` cikisina dahil edilmez.
- Legacy senaryolar yalniz `db:seed:full:demo` akisinda uretilir.
- Seed ciktilari production datasi degildir; sentetik demo/gelistirme verisidir.

---

## Seed vs Doctrine Mismatch

- Bilinen legacy mismatch hedefi kapatılmıştır.
- Seed akışı erişim için `TenantMembership` kaynağına dayanır.
- `User.tenantId` alanı legacy uyumluluk alanı olarak tutulur; access kontrol mantığı bu alana dayanmaz.

---

## Güvenlik uyarıları

- `db:reset` yıkıcıdır ve seed’i otomatik yeniden çalıştırır; yalnız local geliştirmede kullanılmalıdır.
- `db:reset` sonrası veritabanı boş kalmaz.
- Demo seed production seed değildir.
- Yeni Tenant-scoped seed verisi `tenantId` ve membership hizasını açıkça içermelidir.
- Seed, `TenantMembership` olmadan sessiz erişim vermemelidir.

---

## Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerde aynı PR/task içinde bu dokümanı güncelle:

- seed scriptleri ve seed dosyaları
- oluşturulan kullanıcı/tenant senaryoları
- env var isimleri
- `auth` / `session` / `TenantMembership` davranışı

---

## İlgili dosyalar

- [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts)
- [`apps/api/prisma/seed-demo.ts`](../apps/api/prisma/seed-demo.ts)
- [`apps/api/prisma/seed-full-demo.ts`](../apps/api/prisma/seed-full-demo.ts)
