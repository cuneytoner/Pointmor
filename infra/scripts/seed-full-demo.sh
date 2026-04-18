#!/usr/bin/env sh
# Demo DB full seed — api-demo konteyneri içinde db:seed + senaryo verisi çalıştırır.
# Bu script ağır örnek veri üretir (çok kiracı, müşteri, ziyaret, ödül, kampanya).
set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/infra/docker/docker-compose.demo.yml}"
SERVICE_NAME="${SERVICE_NAME:-api-demo}"
FORCE_RESEED_DEMO="${FORCE_RESEED_DEMO:-1}"

echo "seed-full-demo: $SERVICE_NAME konteyneri içinde db:seed (SEED_FULL_DEMO=1)."

if [ ! -f "$ENV_FILE" ]; then
  echo "seed-full-demo: $ENV_FILE yok."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${DATABASE_URL_DEMO:-}" ]; then
  echo "seed-full-demo: \$DATABASE_URL_DEMO tanımlı değil ($ENV_FILE içinde compose ağı: postgres-demo:5432)."
  exit 1
fi

cd "$ROOT"

if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$SERVICE_NAME" 2>/dev/null | grep -q .; then
  echo "seed-full-demo: '$SERVICE_NAME' çalışmıyor. Önce stack'i kaldırın, örn.:" >&2
  echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d postgres-demo api-demo" >&2
  exit 1
fi

echo "seed-full-demo: docker compose exec → npm run db:seed:full:demo -w api"
echo "seed-full-demo: FORCE_RESEED_DEMO=$FORCE_RESEED_DEMO (1 = mevcut senaryo verisini temizleyip yeniden yükler)"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T \
  -e DATABASE_URL="$DATABASE_URL_DEMO" \
  -e APP_ENV=demo \
  -e ALLOW_FULL_DEMO_SEED=true \
  -e CONFIRM_FULL_DEMO_SEED=I_UNDERSTAND_FULL_DEMO_SEED \
  -e FORCE_RESEED_DEMO="$FORCE_RESEED_DEMO" \
  "$SERVICE_NAME" \
  sh -c 'cd /app && npm run db:seed:full:demo -w api'
