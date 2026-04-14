#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_HEALTHCHECK_URL:-http://127.0.0.1:3000/health}"

echo "Checking $API_URL"
curl -fsS "$API_URL" >/dev/null

echo "Health check OK"
