#!/usr/bin/env sh
# Docker Compose ile demo stack: build → up → migrate → health.
# Seed çalıştırmaz; seed yalnızca manuel: infra/scripts/seed-demo.sh
#
# Kullanım: ./infra/scripts/deploy-demo.sh [--cloud]
#   --cloud  cloudflared servisini de başlatır (CLOUDFLARE_TUNNEL_TOKEN: infra/docker/.env.demo)
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"

WITH_CLOUD=0
for arg in "$@"; do
  case "$arg" in
    --cloud) WITH_CLOUD=1 ;;
    *)
      echo "deploy-demo: bilinmeyen argüman: $arg" >&2
      echo "Kullanım: $0 [--cloud]" >&2
      exit 1
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "deploy-demo: $ENV_FILE yok. Örnek: cp infra/docker/.env.demo.example infra/docker/.env.demo"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ "$WITH_CLOUD" = "1" ] && [ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  echo "deploy-demo: uyarı: --cloud kullanıldı ancak CLOUDFLARE_TUNNEL_TOKEN boş; cloudflared başlamayabilir." >&2
fi

run_compose() {
  if [ "$WITH_CLOUD" = "1" ]; then
    docker compose --profile cloudflare -f infra/docker/docker-compose.demo.yml --env-file "$ENV_FILE" "$@"
  else
    docker compose -f infra/docker/docker-compose.demo.yml --env-file "$ENV_FILE" "$@"
  fi
}

echo "deploy-demo: imajlar build ediliyor..."
run_compose build

if [ "$WITH_CLOUD" = "1" ]; then
  echo "deploy-demo: stack + Cloudflare tunnel (profile cloudflare) ayağa kalkıyor..."
  run_compose up -d postgres-demo api-demo admin-web-demo cloudflared
else
  echo "deploy-demo: stack ayağa kalkıyor (Cloudflare yok)..."
  run_compose up -d postgres-demo api-demo admin-web-demo
fi

echo "deploy-demo: prisma migrate deploy (entrypoint ile çakışsa bile idempotent)..."
run_compose exec -T api-demo sh -c 'cd /app/apps/api && npx prisma migrate deploy'

echo "deploy-demo: migrate sonrası health check..."
sh "$ROOT/infra/scripts/health-check-demo.sh"

echo "deploy-demo: tamam."
echo "  curl: curl -sS http://127.0.0.1:${API_HOST_PORT:-3000}/health"
if [ "$WITH_CLOUD" != "1" ]; then
  echo "  Cloudflare: $0 --cloud   veya: docker compose -f infra/docker/docker-compose.demo.yml --env-file \"$ENV_FILE\" --profile cloudflare up -d"
fi
echo ""
echo "deploy-demo: rollback ipucu — önceki çalışan imajı not edin: docker image ls | head"
echo "  veya: git checkout <önceki-commit> && ./infra/scripts/deploy-demo.sh"
