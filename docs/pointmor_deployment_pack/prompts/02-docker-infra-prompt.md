# Cursor Prompt 02 - Docker ve Demo Compose

Pointmor monorepo için yalnızca Docker ve demo compose altyapısını hazırla.

## İstiyorum
- apps/api/Dockerfile
- apps/admin-web/Dockerfile
- infra/docker/docker-compose.demo.yml
- infra/docker/.env.demo.example

## Beklentiler
- Çok stage'li build kullan
- API production modda çalışsın
- Admin web production build ile servis edilsin
- Demo Postgres ayrı service olsun
- Cloudflared service placeholder olarak compose içinde yer alsın
- Healthcheck ve depends_on mantıklı tanımlansın

Şimdilik GitHub Actions ekleme.
Önce planı ver, sonra dosyaları üret.
