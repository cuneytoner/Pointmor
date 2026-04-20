#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.prod}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

API_BASE="${API_BASE:-http://127.0.0.1:${API_HOST_PORT:-3000}}"
RETRIES="${HEALTH_CHECK_RETRIES:-30}"
SLEEP_SECONDS="${HEALTH_CHECK_SLEEP_SEC:-2}"

i=0
while [ "$i" -lt "$RETRIES" ]; do
  if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
    echo "health-check-prod: /health OK at $API_BASE"
    break
  fi
  i=$((i + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "$i" -ge "$RETRIES" ]; then
  echo "health-check-prod: /health failed after ${RETRIES} retries"
  exit 1
fi

if [ -n "${POINTMOR_PREFLIGHT_SECRET:-}" ]; then
  if ! curl -fsS \
    -H "X-Pointmor-Preflight-Secret: ${POINTMOR_PREFLIGHT_SECRET}" \
    "$API_BASE/health?securitySummary=1" >/dev/null 2>&1; then
    echo "health-check-prod: /health?securitySummary=1 failed with preflight secret"
    exit 1
  fi
  echo "health-check-prod: preflight summary OK"
fi

