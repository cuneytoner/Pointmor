#!/bin/sh
set -e
cd /app/apps/api
if [ "${RUN_MIGRATIONS_ON_START}" = "true" ]; then
  npx prisma migrate deploy
fi
exec node dist/index.js
