#!/usr/bin/env sh
# Yalnızca manuel veya ilk kurulum — deploy-demo.sh veya CI içinden çağırmayın.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"

echo "seed-demo: manuel/ilk kurulum senaryosu (otomatik deploy ile çalışmaz)."
if [ ! -f "$ENV_FILE" ]; then
  echo "seed-demo: $ENV_FILE yok."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

export DATABASE_URL="${DATABASE_URL_SEED:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "seed-demo: infra/docker/.env.demo içinde DATABASE_URL_SEED ekleyin (ör. 127.0.0.1:\${POSTGRES_DEMO_PORT:-55432})."
  exit 1
fi

if [ -z "$DEMO_ADMIN_PASSWORD" ] || [ -z "$DEMO_OPERATOR_PASSWORD" ]; then
  echo "seed-demo: DEMO_ADMIN_PASSWORD ve DEMO_OPERATOR_PASSWORD (min. 12 karakter) gerekli."
  exit 1
fi

echo "seed-demo: npm run db:seed:demo -w api"
cd "$ROOT"
npm run db:seed:demo -w api
