# Pointmor Demo Deployment Runbook

## Gerekenler

Sunucuda:
- Docker Engine
- Docker Compose plugin
- demo için ayrı klasör
- `infra/docker/.env.demo` gerçek değerlerle oluşturulmuş

GitHub tarafında:
- `DEMO_HOST`
- `DEMO_USER`
- `DEMO_SSH_KEY`
- `DEMO_ENV_FILE`
- `CLOUDFLARE_TUNNEL_TOKEN`
- `GHCR_PAT` veya uygun `GITHUB_TOKEN` yetkileri

## İlk kurulum

1. Sunucuda proje klasörü oluştur
2. `docker-compose.demo.yml` ve scriptleri kopyala
3. `.env.demo` dosyasını yerleştir
4. İlk kez çalıştır:

```bash
cd /opt/pointmor-demo
cp infra/docker/.env.demo.example infra/docker/.env.demo
# gerçek secret'larla doldur

docker compose -f infra/docker/docker-compose.demo.yml up -d postgres-demo
./infra/scripts/migrate-demo.sh
./infra/scripts/seed-demo.sh
```

## Deploy

```bash
./infra/scripts/deploy-demo.sh
./infra/scripts/migrate-demo.sh
./infra/scripts/healthcheck-demo.sh
```

## Seed politikası

- Sadece demo/local
- Production’da kullanılmaz
- Otomatik her deploy’da koşmaz

## Sorun çözme

### API ayağa kalkmıyor
- `docker compose logs api-demo`
- `DATABASE_URL` doğru mu kontrol et
- migration tamamlandı mı bak

### Admin web API’ye erişemiyor
- `VITE_API_BASE_URL` doğru mu bak
- Tunnel route doğru servise gidiyor mu kontrol et

### Health check fail
- API container loglarını oku
- `/health` endpoint’inin container içinden cevap verdiğini doğrula
