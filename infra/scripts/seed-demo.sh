#!/usr/bin/env sh
# Demo DB seed — api-demo konteyneri içinde çalışır (sunucuda ayrıca Node/npm gerekmez).
# Otomatik deploy veya CI içinden çağırmayın.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/infra/docker/docker-compose.demo.yml}"
SERVICE_NAME="${SERVICE_NAME:-api-demo}"

echo "seed-demo: $SERVICE_NAME konteyneri içinde db:seed:demo (host'ta npm gerekmez)."

if [ ! -f "$ENV_FILE" ]; then
  echo "seed-demo: $ENV_FILE yok."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "$DEMO_ADMIN_PASSWORD" ] || [ -z "$DEMO_OPERATOR_PASSWORD" ]; then
  echo "seed-demo: DEMO_ADMIN_PASSWORD ve DEMO_OPERATOR_PASSWORD (min. 12 karakter) gerekli."
  exit 1
fi

if [ -z "${DATABASE_URL_DEMO:-}" ]; then
  echo "seed-demo: \$DATABASE_URL_DEMO tanımlı değil ($ENV_FILE içinde compose ağı: postgres-demo:5432)."
  exit 1
fi

cd "$ROOT"

if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$SERVICE_NAME" 2>/dev/null | grep -q .; then
  echo "seed-demo: '$SERVICE_NAME' çalışmıyor. Önce stack'i kaldırın, örn.:" >&2
  echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d postgres-demo api-demo" >&2
  exit 1
fi

echo "seed-demo: docker compose exec → npm run db:seed:demo -w api"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T \
  -e DATABASE_URL="$DATABASE_URL_DEMO" \
  -e DEMO_ADMIN_PASSWORD="$DEMO_ADMIN_PASSWORD" \
  -e DEMO_OPERATOR_PASSWORD="$DEMO_OPERATOR_PASSWORD" \
  -e "DEMO_ADMIN_EMAIL=${DEMO_ADMIN_EMAIL:-admin-demo@pointmor.demo}" \
  -e "DEMO_OPERATOR_EMAIL=${DEMO_OPERATOR_EMAIL:-owner-demo@pointmor.demo}" \
  "$SERVICE_NAME" \
  sh -c 'cd /app && npm run db:seed:demo -w api'
