# Pointmor Pre-Alpha Deployment Pack

Bu paket, Pointmor projesi için pre-alpha demo deployment ve CI/CD hazırlığına yönelik operasyonel dosyaları içerir.

## İçerik

- `docs/pointmor-cicd-plan.md`
  - Mimari kararlar, ortam stratejisi, CI/CD yaklaşımı, branch modeli, rollout planı
- `docs/repo-tree-proposal.md`
  - Repo içi önerilen dosya ağacı
- `docs/demo-deployment-runbook.md`
  - İlk kurulum, deploy, migration, seed, health check ve Cloudflare Tunnel runbook'u
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
