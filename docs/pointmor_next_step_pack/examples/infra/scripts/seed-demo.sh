#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker/docker-compose.demo.yml"
ENV_FILE="infra/docker/.env.demo"

cd "$(dirname "$0")/../.."

echo "Running demo seed. Do not use in production."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api-demo npm run db:seed:demo
