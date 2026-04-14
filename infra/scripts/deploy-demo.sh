#!/usr/bin/env sh
# Docker Compose ile demo stack: build → up → migrate → health.
# Seed çalıştırmaz; seed yalnızca manuel: infra/scripts/seed-demo.sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"

if [ ! -f "$ENV_FILE" ]; then
  echo "deploy-demo: $ENV_FILE yok. Örnek: cp infra/docker/.env.demo.example infra/docker/.env.demo"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

run_compose() {
  docker compose -f infra/docker/docker-compose.demo.yml --env-file "$ENV_FILE" "$@"
}

echo "deploy-demo: imajlar build ediliyor..."
run_compose build

echo "deploy-demo: stack ayağa kalkıyor (Cloudflare profili hariç)..."
run_compose up -d postgres-demo api-demo admin-web-demo

echo "deploy-demo: prisma migrate deploy (entrypoint ile çakışsa bile idempotent)..."
run_compose exec -T api-demo sh -c 'cd /app/apps/api && npx prisma migrate deploy'

echo "deploy-demo: migrate sonrası health check..."
sh "$ROOT/infra/scripts/health-check-demo.sh"

echo "deploy-demo: tamam."
echo "  curl: curl -sS http://127.0.0.1:${API_HOST_PORT:-3000}/health"
echo "  Cloudflare: docker compose -f infra/docker/docker-compose.demo.yml --env-file \"$ENV_FILE\" --profile cloudflare up -d"
echo ""
echo "deploy-demo: rollback ipucu — önceki çalışan imajı not edin: docker image ls | head"
echo "  veya: git checkout <önceki-commit> && ./infra/scripts/deploy-demo.sh"
