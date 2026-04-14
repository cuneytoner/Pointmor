#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker/docker-compose.demo.yml"
ENV_FILE="infra/docker/.env.demo"

export API_IMAGE="${API_IMAGE:?API_IMAGE is required}"
export WEB_IMAGE="${WEB_IMAGE:?WEB_IMAGE is required}"

cd "$(dirname "$0")/../.."

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
