# Pointmor Next Step Pack

Bu paket, Pointmor monorepo yapısına daha yakın ikinci adım taslaklarını içerir.

İçerik:
- repo içi önerilen dosya ağacı
- demo için örnek `docker-compose.demo.yml` (`examples/` altı bazen eski; canlı: `infra/docker/`)
- `.env.demo.example`
- Cursor prompt’ları (`prompts/`)

**Repoda uygulanmış (kök):** `.github/workflows/ci.yml` (Node 20, `npm ci`, Prisma validate/generate, lint, i18n, build; `cache: npm`), `.github/workflows/deploy-demo.yml`, `infra/scripts/*.sh`, Docker/Compose dosyaları.

Notlar:
- `examples/` ile kök dosyalar çelişirse **kök + `docs/40-guide-*`** esas alınır.
- `db:seed:demo` gibi scriptler örnek olarak verilmiştir. Eğer repoda yoksa eklenmelidir.
- `admin-web` static build çıkış klasörü için Vite varsayımı (`dist/`) esas alınmıştır.
