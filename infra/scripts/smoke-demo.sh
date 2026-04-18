#!/usr/bin/env sh
# Demo smoke test: health + login + bootstrap + tenants
set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"
API_HOST_PORT="${API_HOST_PORT:-3000}"
API_BASE="${API_BASE:-http://127.0.0.1:${API_HOST_PORT}}"
SMOKE_ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@pointmor.local}"
SMOKE_ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-PointmorDev!Admin}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  API_BASE="${API_BASE:-http://127.0.0.1:${API_HOST_PORT:-3000}}"
fi

echo "smoke-demo: API=$API_BASE"

TMP_LOGIN="$(mktemp)"
trap 'rm -f "$TMP_LOGIN"' EXIT

echo "1) GET /health"
curl -fsS "$API_BASE/health" >/dev/null
echo "   OK"

echo "2) POST /auth/login (platform admin)"
LOGIN_BODY=$(printf '{"email":"%s","password":"%s"}' "$SMOKE_ADMIN_EMAIL" "$SMOKE_ADMIN_PASSWORD")
LOGIN_STATUS="$(
  curl -sS -o "$TMP_LOGIN" -w "%{http_code}" \
    -H "content-type: application/json" \
    -d "$LOGIN_BODY" \
    "$API_BASE/auth/login"
)"
if [ "$LOGIN_STATUS" != "200" ]; then
  echo "   FAIL: /auth/login status=$LOGIN_STATUS"
  cat "$TMP_LOGIN"
  exit 1
fi
TOKEN="$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$TMP_LOGIN")"
if [ -z "$TOKEN" ]; then
  echo "   FAIL: login token alınamadı"
  cat "$TMP_LOGIN"
  exit 1
fi
echo "   OK"

echo "3) GET /auth/me"
curl -fsS -H "authorization: Bearer $TOKEN" "$API_BASE/auth/me" >/dev/null
echo "   OK"

echo "4) GET /admin/bootstrap (4 demo tenant beklenir)"
BOOTSTRAP="$(curl -fsS -H "authorization: Bearer $TOKEN" "$API_BASE/admin/bootstrap")"
for slug in demo-cafe demo-small-cafe demo-busy-cafe demo-coffee-chain; do
  if ! printf "%s" "$BOOTSTRAP" | grep -q "\"slug\":\"$slug\""; then
    echo "   FAIL: bootstrap içinde $slug yok"
    exit 1
  fi
done
echo "   OK (4 tenant göründü)"

echo "5) GET /tenants"
curl -fsS -H "authorization: Bearer $TOKEN" "$API_BASE/tenants" >/dev/null
echo "   OK"

echo "smoke-demo: PASS"
