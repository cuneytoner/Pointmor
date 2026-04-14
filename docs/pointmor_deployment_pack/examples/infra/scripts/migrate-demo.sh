#!/usr/bin/env sh
set -eu

COMPOSE_FILE="infra/docker/docker-compose.demo.yml"
ENV_FILE=".env.demo"

cd /opt/pointmor-demo

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api-demo npx prisma migrate deploy
