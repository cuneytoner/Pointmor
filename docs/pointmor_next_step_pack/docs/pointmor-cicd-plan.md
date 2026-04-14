# Pointmor CI/CD Planı

## Hedef akış

```text
feature/* -> Pull Request -> main -> CI -> Demo Deploy
```

## CI

Minimum kalite kapısı:
- Node 20
- `npm ci`
- lint
- build
- Prisma generate/validate odaklı kontrol
- admin-web i18n doğrulaması

## CD

`main` branch güncellendiğinde:
- Docker image build
- GHCR push
- Demo VM üzerinde `docker compose pull && up -d`
- `prisma migrate deploy`
- opsiyonel manuel `seed-demo`
- `/health` kontrolü

## Tasarım kararları

- Demo DB, dev DB’den ayrı
- Cloudflare Tunnel sadece app/api’yi dışarı açar
- Secret’lar GitHub Secrets ve sunucu `.env` dosyasından gelir
- Seed işlemi her deploy’da otomatik çalışmaz

## Rollback

İlk aşamada basit yaklaşım:
- image tag = commit SHA
- ek etiket = `demo-latest`
- gerekirse bir önceki SHA’ya dön
