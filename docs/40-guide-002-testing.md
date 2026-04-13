# Genel test stratejisi (Pointmor)

Bu doküman, projeye ölçeklenebilir test katmanlarını tanımlar. Henüz otomatik test paketi kurulmamış olabilir; aşağıdaki liste hedef çerçevedir.

## Katmanlar

| Katman | Ne zaman | Araç / yöntem (öneri) |
|--------|-----------|------------------------|
| **Lint** | Her commit / PR | `npm run lint` (kök) |
| **Derleme** | PR, release öncesi | `npm run build` |
| **Smoke (manuel)** | Yerel geliştirme, deploy sonrası | [`40-guide-003-smoke-tests-recent.md`](./40-guide-003-smoke-tests-recent.md) + güncel özellik notları |
| **Birim testi** | Kritik saf fonksiyonlar, yardımcılar | Vitest / Node test runner (ileride) |
| **API entegrasyon** | Auth, tenant CRUD | Supertest veya Fastify inject (ileride) |
| **E2E** | Ana kullanıcı akışları | Playwright (greenfield dokümanında referans) |

## Kök checklist (CI benzeri, yerel)

1. `npm run lint` — hata yok.
2. `npm run build` — tüm workspace’ler derleniyor.
3. API + admin birlikte açılıyor; tarayıcıda tek origin (ör. hep `http://127.0.0.1:5173`).
4. API `GET /health` → `{ "ok": true }`.
5. DB kullanan kod varsa: migration’lar uygulanmış ortamda API ayakta.

## Ortam tutarlılığı

- **Origin:** `localhost` ile `127.0.0.1` farklı origin sayılır; localStorage paylaşılmaz. Testleri tek adreste yürütün.
- **`.env`:** Repoda yok; `.env.example` ve ekip içi güvenli kanaldan gerçek değerler.
- **API seed kullanıcıları (admin / paid / free):** [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md).

## Gelecek (ürün olgunlaştıkça)

- PR şablonuna “lint + build + smoke” kutucukları.
- Minimal GitHub Actions / CI: `npm ci`, `lint`, `build`; DB gerektiren job’lar için konteyner veya paylaşılan test DB.
- E2E: login → dashboard (oturum modeli hazır olduktan sonra).
