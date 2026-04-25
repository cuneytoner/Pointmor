# Smoke testi — son yapılan işler

Bu liste, **yakın zamanda eklenen veya değişen** parçaları doğrulamak içindir. Genel komut akışı için [`40-guide-001-run-local.md`](./40-guide-001-run-local.md) dosyasına bakın.

**Kapsam (güncel):** monorepo çalıştırma, API sağlık kontrolü, PostgreSQL + Prisma migration’ları, admin statik önizleme.

## Önkoşullar

- Node.js 20+.
- `apps/api/.env` oluşturulmuş (`DATABASE_URL`, `PORT`, `CORS_ORIGINS`). Ayrıntı: kök `.env.example`.
- Giriş testleri için seed kullanıcıları: [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md) (`npm.cmd run db:seed` içinde `apps/api`).
- `apps/admin-web/.env.local` içinde `VITE_API_BASE_URL` API ile uyumlu (ör. `http://127.0.0.1:3000`).
- Veritabanı erişilebilir (ör. VM’deki Postgres’e ağ izni).

Komut biçimi için: [`40-guide-001-run-local.md`](./40-guide-001-run-local.md).

## Smoke adımları

1. **Bağımlılıklar**  
   Repo kökünde: `npm.cmd install` (PowerShell execution policy nedeniyle `npm.cmd` kullanın).

2. **API**  
   - `npm.cmd run dev:api`  
   - Tarayıcı veya `curl`: `GET http://127.0.0.1:3000/health` → JSON içinde `"ok": true`.

3. **Prisma / DB (schema değiştiyse veya yeni klon)**  
   - `cd apps\api`  
   - `npm.cmd run db:generate`  
   - Gerekirse: `npm.cmd run db:deploy` (migration’ları uygula) veya geliştirme için `npm.cmd run db:migrate`.  
   - **Tam sıfırlama** yalnız bilinçli kullanımda: `db:clean` / `db:reset` — [`40-guide-001-run-local.md`](./40-guide-001-run-local.md).

4. **Admin web**  
   - İkinci terminal: `npm.cmd run dev:admin`  
   - `http://127.0.0.1:5173` açılır; giriş sonrası Platform Console (`/platform/*`) veya Tenant App (`/app/*`) — Plus kabuk (`admin-app`). **Hızlı entitlement / billing:** tenant oturumunda `/app/admin/billing` (veya `/app/billing` → yönlendirme) (kullanım satırları, demo plan değişimi; API’de `ALLOW_TENANT_DEMO_PLAN_SWITCH` — varsayılan açık, kapatma: [`40-guide-001-run-local.md`](./40-guide-001-run-local.md#tenant-demo-plan-switch)); platformda `/platform/subscriptions` (plan `PATCH`). Ürün özeti: [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) (Plan & entitlement).

5. **CORS / origin**  
   API `CORS_ORIGINS` içinde admin origin’i listelenmiş olmalı; admin ve API için aynı host adını kullanmaya devam edin (`127.0.0.1` veya `localhost`).

## Başarısızlıkta

- **503 / bağlantı yok:** API çalışıyor mu, port ve `VITE_API_BASE_URL` doğru mu.  
- **DB hatası:** `DATABASE_URL`, firewall, Postgres dinleme adresi.  
- **Boş sayfa / asset:** Vite portu 5173 ve `strictPort`; başka süreç portu kullanmıyor olmalı.

---

*Bu dosya, yeni özellikler (auth, yeni endpoint’ler, yeni sayfalar) eklendikçe maddeleri güncelleyin veya tarihli alt bölümler ekleyin.*
