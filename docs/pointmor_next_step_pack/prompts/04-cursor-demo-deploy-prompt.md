# Cursor Prompt 04 - Demo Deploy

Pointmor için demo deploy workflow'u üret:
- `.github/workflows/deploy-demo.yml`
- `infra/scripts/deploy-demo.sh`
- `infra/scripts/migrate-demo.sh`
- `infra/scripts/seed-demo.sh`
- `infra/scripts/healthcheck-demo.sh`

Varsayımlar:
- hedef Debian VM'de Docker/Compose var
- image'lar GHCR'de tutulacak
- demo deploy `main` branch'ten yapılacak
- Cloudflare Tunnel compose ile çalışacak

Kurallar:
- seed her deploy'da otomatik çalışmasın
- migration deploy sonrası health check olsun
- gerekli GitHub Secrets listesini not düş
