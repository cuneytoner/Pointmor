# Cursor Prompt 02 - Docker ve Compose

Pointmor için aşağıdaki dosyaları üret:
- apps/api/Dockerfile
- apps/admin-web/Dockerfile
- infra/docker/docker-compose.demo.yml
- infra/docker/.env.demo.example

Beklentiler:
- multi-stage build
- API container production modda başlasın
- Admin web static build'i servis etsin
- Postgres demo ayrı service olsun
- Cloudflared service compose içinde placeholder olsun
- healthcheck tanımla
- env isimlerini Pointmor bağlamına uygun seç

Önce plan, sonra dosyaları üret.
