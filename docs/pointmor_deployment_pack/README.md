# Pointmor Pre-Alpha Deployment Pack

Bu paket, Pointmor projesi için pre-alpha demo deployment ve CI/CD hazırlığına yönelik operasyonel dosyaları içerir.

## İçerik

- [`docs/40-guide-004-demo-deployment.md`](../40-guide-004-demo-deployment.md) — demo Docker Compose, scriptler ve Cloudflare notları
- [`docs/40-guide-005-demo-deployment-runbook.md`](../40-guide-005-demo-deployment-runbook.md) — **Prompt 05:** env, ilk kurulum, deploy, migrate, seed, health, Cloudflare, sık hatalar (copy-paste odaklı)
- [`docs/demo-deployment-runbook.md`](../demo-deployment-runbook.md) — kısa giriş + hızlı komutlar
- `infra/docker/docker-compose.demo.yml`, `infra/docker/.env.demo.example` — repodaki canlı demo şablonları (kök `apps/*/Dockerfile` ile birlikte)
- `.github/workflows/deploy-demo.yml` — `main` push / manuel tetik → SSH ile sunucuda `deploy-demo.sh` (sırlar GitHub Secrets)
- `docs/pointmor-cicd-plan.md`
  - Mimari kararlar, ortam stratejisi, CI/CD yaklaşımı, branch modeli, rollout planı
- `docs/repo-tree-proposal.md`
  - Repo içi önerilen dosya ağacı
- `examples/infra/docker/docker-compose.demo.yml`
  - Demo ortamı için örnek Docker Compose taslağı
- `examples/infra/docker/.env.demo.example`
  - Demo ortamı için örnek environment dosyası
- `examples/.github/workflows/ci.yml`
  - Minimal ama ciddi CI workflow taslağı
- `examples/.github/workflows/deploy-demo.yml`
  - Demo deploy için GitHub Actions taslağı
- `prompts/*.md`
  - Cursor için parçalı çalışma promptları

## Notlar

- Bunlar başlangıç şablonlarıdır. Repo'nun mevcut script ve Docker gereksinimlerine göre uyarlanmalıdır.
- Demo DB ile dev DB kesinlikle ayrılmalıdır.
- Production ortamında demo seed kullanıcıları ve zayıf secret'lar kullanılmamalıdır.
