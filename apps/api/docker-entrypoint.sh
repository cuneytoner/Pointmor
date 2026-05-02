#!/bin/sh
set -e
cd /app/apps/api

if [ "${POINTMOR_API_DEBUG:-}" = "1" ]; then
  echo "pointmor-api: pwd=$(pwd) NODE_ENV=${NODE_ENV:-} PORT=${PORT:-}"
  echo "pointmor-api: dist/generated prisma client:"
  ls -la dist/generated/prisma 2>/dev/null || echo "pointmor-api: WARN dist/generated/prisma missing"
fi

if [ "${RUN_MIGRATIONS_ON_START}" = "true" ]; then
  echo "pointmor-api: prisma migrate deploy..."
  npx prisma migrate deploy
  echo "pointmor-api: migrate ok"
else
  echo "pointmor-api: RUN_MIGRATIONS_ON_START not true, skipping migrate"
fi

echo "pointmor-api: starting node dist/index.js"
exec node dist/index.js
