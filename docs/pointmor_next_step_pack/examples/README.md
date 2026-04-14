# Örnekler (next_step_pack)

Bu klasördeki bazı dosyalar **tarihsel / şablon** olabilir.

**Güncel ve kullanılacak Docker / Compose dosyaları** monorepo kökündedir:

| Amaç | Konum |
|------|--------|
| API Dockerfile | `apps/api/Dockerfile` |
| Admin Dockerfile | `apps/admin-web/Dockerfile` |
| Nginx SPA | `infra/docker/admin-web.nginx.conf` |
| Compose (demo) | `infra/docker/docker-compose.demo.yml` |
| Env şablonu | `infra/docker/.env.demo.example` |

**CI (Prompt 03):** `.github/workflows/ci.yml` — kök `package.json` scriptleri: `ci:prisma`, `ci:i18n` (bkz. `apps/api` `db:validate`).

**Demo deploy (Prompt 04):** `.github/workflows/deploy-demo.yml`; `infra/scripts/deploy-demo.sh`, `migrate-demo.sh`, `seed-demo.sh`, `health-check-demo.sh` / `healthcheck-demo.sh`.

Operasyon: `docs/40-guide-005-demo-deployment-runbook.md` ve `docs/demo-deployment-runbook.md`.
