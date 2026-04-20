#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.prod}"

if [ ! -f "$ENV_FILE" ]; then
  echo "preflight-prod-env: missing $ENV_FILE"
  echo "Copy template: cp infra/docker/.env.prod.example infra/docker/.env.prod"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

MISSING=""
require_var() {
  key="$1"
  # shellcheck disable=SC2016
  eval 'val="${'"$key"':-}"'
  if [ -z "${val}" ]; then
    MISSING="$MISSING $key"
  fi
}

require_var POINTMOR_API_IMAGE
require_var POINTMOR_ADMIN_IMAGE
require_var DATABASE_URL
require_var REDIS_URL
require_var COOKIE_SECRET
require_var CUSTOMER_PORTAL_JWT_SECRET
require_var POINTMOR_PREFLIGHT_SECRET
require_var WEBHOOK_SIGNING_SECRET
require_var CORS_ORIGINS
require_var PUBLIC_API_BASE_URL
require_var CUSTOMER_PORTAL_JTI_REQUIRED_AFTER
require_var CUSTOMER_BEARER_LEGACY_SUNSET_AFTER
require_var INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT
require_var SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT

if [ -n "$MISSING" ]; then
  echo "preflight-prod-env: missing required vars:$MISSING"
  exit 1
fi

if [ "${SECURITY_STATE_BACKEND:-redis}" = "redis" ] && [ -z "${REDIS_URL:-}" ]; then
  echo "preflight-prod-env: SECURITY_STATE_BACKEND=redis requires REDIS_URL"
  exit 1
fi

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  echo "preflight-prod-env: RUN_MIGRATIONS_ON_START=true is discouraged in production"
  exit 1
fi

if [ "${INTERNAL_JOB_REQUIRE_HMAC:-true}" != "true" ]; then
  echo "preflight-prod-env: INTERNAL_JOB_REQUIRE_HMAC must be true in production"
  exit 1
fi

if [ "${WEBHOOK_AUTH_MODE:-hmac}" != "hmac" ]; then
  echo "preflight-prod-env: WEBHOOK_AUTH_MODE must be hmac in production"
  exit 1
fi

if [ "${POINTMOR_PREFLIGHT_ALLOW_QUERY:-false}" = "true" ]; then
  echo "preflight-prod-env: POINTMOR_PREFLIGHT_ALLOW_QUERY=true is not allowed in production"
  exit 1
fi

echo "preflight-prod-env: PASS"
