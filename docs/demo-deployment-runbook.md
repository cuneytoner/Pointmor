# Demo deployment runbook (giriş)

Bu dosya, monorepo kökünde keşfedilebilir kısa giriş noktasıdır. **Ayrıntılı ve güncel operasyon rehberi:** [`40-guide-005-demo-deployment-runbook.md`](./40-guide-005-demo-deployment-runbook.md). Mimari ve GitHub Actions: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md). Cloudflare Tunnel özeti: [`cloudflare.md`](./cloudflare.md).

## Hızlı komutlar (repo kökü, Debian VM)

```bash
cp infra/docker/.env.demo.example infra/docker/.env.demo
# infra/docker/.env.demo içinde tüm sırları ve PUBLIC_API_BASE_URL / CORS_ORIGINS değiştirin

chmod +x infra/scripts/deploy-demo.sh infra/scripts/migrate-demo.sh \
  infra/scripts/health-check-demo.sh infra/scripts/seed-demo.sh

./infra/scripts/deploy-demo.sh
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
```

## Repo içi dosyalar (master plan ile uyum)

| Bileşen | Konum |
|---------|--------|
| API / Admin Dockerfile | `apps/api/Dockerfile`, `apps/admin-web/Dockerfile` |
| Compose | `infra/docker/docker-compose.demo.yml` |
| Env şablonu | `infra/docker/.env.demo.example` → `.env.demo` |
| Scriptler | `infra/scripts/deploy-demo.sh`, `migrate-demo.sh`, `health-check-demo.sh`, `seed-demo.sh` |
| CI | `.github/workflows/ci.yml` |
| Demo deploy (SSH) | `.github/workflows/deploy-demo.yml` |

**Seed** yalnızca manuel (`seed-demo.sh`); production’a taşınmaz. Demo DB, dev DB’den ayrı volume ile tanımlıdır (`postgres_demo_data`).
