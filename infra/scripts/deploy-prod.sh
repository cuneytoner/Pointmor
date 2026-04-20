#!/usr/bin/env sh
# Production deploy: pull immutable images -> migrate -> up -> health/preflight
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/infra/docker/docker-compose.prod.yml}"
SKIP_MIGRATE=0
API_IMAGE_OVERRIDE=""
ADMIN_IMAGE_OVERRIDE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --api-image)
      API_IMAGE_OVERRIDE="${2:-}"
      shift 2
      ;;
    --admin-image)
      ADMIN_IMAGE_OVERRIDE="${2:-}"
      shift 2
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    *)
      echo "deploy-prod: unknown argument: $1"
      echo "Usage: $0 [--api-image <ref>] [--admin-image <ref>] [--skip-migrate]"
      exit 1
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "deploy-prod: missing $ENV_FILE"
  echo "Copy template: cp infra/docker/.env.prod.example infra/docker/.env.prod"
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "deploy-prod: missing $COMPOSE_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -n "$API_IMAGE_OVERRIDE" ]; then
  export POINTMOR_API_IMAGE="$API_IMAGE_OVERRIDE"
fi
if [ -n "$ADMIN_IMAGE_OVERRIDE" ]; then
  export POINTMOR_ADMIN_IMAGE="$ADMIN_IMAGE_OVERRIDE"
fi

sh "$ROOT/infra/scripts/preflight-prod-env.sh"

if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "deploy-prod: logging into ghcr.io"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

echo "deploy-prod: pulling images..."
compose pull api-prod admin-web-prod

if [ "$SKIP_MIGRATE" = "0" ]; then
  echo "deploy-prod: running prisma migrate deploy on target image..."
  compose run --rm api-prod sh -c 'cd /app/apps/api && npx prisma migrate deploy'
else
  echo "deploy-prod: skipping migrate (--skip-migrate)"
fi

echo "deploy-prod: starting/updating services..."
compose up -d api-prod admin-web-prod

echo "deploy-prod: checking health/preflight..."
sh "$ROOT/infra/scripts/health-check-prod.sh"

RELEASE_SHA="${POINTMOR_RELEASE_SHA:-$(git rev-parse --short=12 HEAD 2>/dev/null || echo unknown)}"
DEPLOYED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo unknown)"
MANIFEST="$ROOT/infra/docker/.release-manifest.prod.json"

printf '%s\n' "{
  \"release_sha\": \"${RELEASE_SHA}\",
  \"deployed_at\": \"${DEPLOYED_AT}\",
  \"compose_file\": \"infra/docker/docker-compose.prod.yml\",
  \"images\": {
    \"api\": \"${POINTMOR_API_IMAGE:-}\",
    \"admin_web\": \"${POINTMOR_ADMIN_IMAGE:-}\"
  },
  \"security_policy\": {
    \"security_state_backend\": \"${SECURITY_STATE_BACKEND:-}\",
    \"customer_jti_required_after\": \"${CUSTOMER_PORTAL_JTI_REQUIRED_AFTER:-}\",
    \"customer_bearer_sunset_after\": \"${CUSTOMER_BEARER_LEGACY_SUNSET_AFTER:-}\",
    \"internal_job_legacy_auth_expires_at\": \"${INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT:-}\",
    \"internal_job_require_hmac\": \"${INTERNAL_JOB_REQUIRE_HMAC:-}\",
    \"memory_fallback_expires_at\": \"${SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT:-}\"
  }
}" > "$MANIFEST"

echo "deploy-prod: complete"
echo "deploy-prod: release_sha=$RELEASE_SHA deployed_at=$DEPLOYED_AT"
echo "deploy-prod: manifest=$MANIFEST"
