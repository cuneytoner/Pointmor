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
| `db:seed` | Yerel geliştirme seed | demo senaryo verisi dahil, çok tenant + çok kullanıcı üretir |
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
| Platform admin (dev) | `admin@pointmor.local` / `admin-demo@pointmor.demo` | seed akışına göre değişir |
| Tenant owner (dev/demo) | `owner@demo.pointmor.local` / `owner-demo@pointmor.demo` | tenant yönetim girişi |
| Advisor admin (demo) | `advisor-admin@pointmor.demo` | advisor tenant + client tenant üyeliği |
| Advisor staff (demo) | `advisor-staff@pointmor.demo` | advisor tenant üyesi |
| Client owner (demo) | `client-owner@pointmor.demo` | client tenant admin üyesi |

Şifreler bu dokümanda sabitlenmez; ortam değişkenlerinden yönetilir.

---

## Multi-tenant / Advisor test setup

Demo seed akışı aşağıdaki yapıyı test için oluşturur:

- advisor tenant (`ADVISOR`)
- client tenant (`BUSINESS`)
- external advisor üyelik senaryosu (`isExternal=true`)
- membership-based access doğrulama

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

- Seed akışı AI Act için sentetik senaryolar üretir (`Customer Support Chatbot`, `Employee Performance Scoring`).
- Senaryolar `LIMITED` ve `HIGH` risk seviyelerini içerir.
- AI assessment cevapları, obligation/task kayıtları, evidence linkleri ve confidence alanları seed edilir.
- Low-confidence + review-required örnekleri özellikle eklenir.
- Seed verisi gerçek müşteri verisi içermez; yalnız sentetik/anonymized örnekler kullanılır.
- AI Act verileri tenant-scoped üretilir ve module activation (`ai_act`) açık tenant bağlamında çalışır.

---

## Seed Reality

- `seed.ts` demo senaryosu verilerini içerir.
- `db:seed` yalnız base data değildir.
- `db:seed` birden fazla tenant ve kullanıcı oluşturur.
- seed çıktısı production-benzeri minimal veri modeli değildir.

---

## Seed vs Doctrine Mismatch

- Mevcut seed akışında bazı kayıtlar `User.tenantId` kullanımını içerebilir.
- Bazı seed senaryoları `TenantMembership` doktrinini tam enforce etmeyebilir.
- Bu bilinen bir sınırlamadır.
- Seed akışı gelecek fazda doktrinle hizalanacaktır.

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
