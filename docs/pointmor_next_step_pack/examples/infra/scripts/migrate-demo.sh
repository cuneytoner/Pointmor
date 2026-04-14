#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker/docker-compose.demo.yml"
ENV_FILE="infra/docker/.env.demo"

cd "$(dirname "$0")/../.."

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api-demo npm run db:migrate:deploy
