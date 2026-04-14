#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"

if [ ! -f "$ENV_FILE" ]; then
  echo "migrate-demo: $ENV_FILE bulunamadı. infra/docker/.env.demo.example dosyasından oluşturun."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

run_compose() {
  docker compose -f infra/docker/docker-compose.demo.yml --env-file "$ENV_FILE" "$@"
}

echo "migrate-demo: api-demo içinde prisma migrate deploy..."
run_compose exec -T api-demo sh -c 'cd /app/apps/api && npx prisma migrate deploy'

echo "migrate-demo: migrate sonrası health check..."
sh "$ROOT/infra/scripts/health-check-demo.sh"
