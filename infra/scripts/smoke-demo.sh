#!/usr/bin/env sh
# Demo smoke test: health + login (cookie) + bootstrap + tenants
#
# Kimlik bilgisi: infra/docker/.env.demo varsa yüklenir; varsayılan e-posta seed-demo ile uyumlu
# (DEMO_ADMIN_EMAIL veya admin-demo@pointmor.demo). Şifre: DEMO_ADMIN_PASSWORD veya SMOKE_ADMIN_PASSWORD.
#
# Bootstrap: seed-demo yalnızca demo-cafe üretir. Dört kiracı için önce seed-full-demo çalıştırıp
# SMOKE_EXPECT_FULL_DEMO=1 verin.
set -e

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"
API_HOST_PORT="${API_HOST_PORT:-3000}"
API_BASE="${API_BASE:-http://127.0.0.1:${API_HOST_PORT}}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  API_BASE="${API_BASE:-http://127.0.0.1:${API_HOST_PORT:-3000}}"
fi

SMOKE_ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-${DEMO_ADMIN_EMAIL:-admin-demo@pointmor.demo}}"
SMOKE_ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-${DEMO_ADMIN_PASSWORD:-}}"

if [ -z "$SMOKE_ADMIN_PASSWORD" ]; then
  echo "smoke-demo: DEMO_ADMIN_PASSWORD veya SMOKE_ADMIN_PASSWORD gerekli ($ENV_FILE veya export)."
  exit 1
fi

echo "smoke-demo: API=$API_BASE"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "1) GET /health"
curl -fsS "$API_BASE/health" >/dev/null
echo "   OK"

echo "2) POST /auth/login (platform admin, cookie jar)"
LOGIN_BODY=$(printf '{"email":"%s","password":"%s"}' "$SMOKE_ADMIN_EMAIL" "$SMOKE_ADMIN_PASSWORD")
LOGIN_STATUS="$(
  curl -sS -o /dev/null -w "%{http_code}" \
    -c "$COOKIE_JAR" \
    -H "content-type: application/json" \
    -d "$LOGIN_BODY" \
    "$API_BASE/auth/login"
)"
if [ "$LOGIN_STATUS" != "200" ]; then
  echo "   FAIL: /auth/login status=$LOGIN_STATUS"
  exit 1
fi
echo "   OK"

echo "3) GET /auth/me (session cookie)"
curl -fsS -b "$COOKIE_JAR" "$API_BASE/auth/me" >/dev/null
echo "   OK"

echo "4) GET /admin/bootstrap"
BOOTSTRAP="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE/admin/bootstrap")"
if ! printf "%s" "$BOOTSTRAP" | grep -q "\"slug\":\"demo-cafe\""; then
  echo "   FAIL: bootstrap içinde demo-cafe yok"
  exit 1
fi
if [ "${SMOKE_EXPECT_FULL_DEMO:-}" = "1" ] || [ "${SMOKE_EXPECT_FULL_DEMO:-}" = "true" ]; then
  for slug in demo-small-cafe demo-busy-cafe demo-coffee-chain; do
    if ! printf "%s" "$BOOTSTRAP" | grep -q "\"slug\":\"$slug\""; then
      echo "   FAIL: SMOKE_EXPECT_FULL_DEMO=1 — bootstrap içinde $slug yok (seed-full-demo gerekir)"
      exit 1
    fi
  done
  echo "   OK (4 tenant göründü)"
else
  echo "   OK (demo-cafe; tam 4 tenant: seed-full-demo + SMOKE_EXPECT_FULL_DEMO=1)"
fi

echo "5) GET /tenants"
curl -fsS -b "$COOKIE_JAR" "$API_BASE/tenants" >/dev/null
echo "   OK"

if [ "${ALLOW_HEALTH_SECURITY_SUMMARY:-}" = "true" ] || [ "${ALLOW_HEALTH_SECURITY_SUMMARY:-}" = "1" ]; then
  echo "6) GET /health?securitySummary=1 (preflight + metrics)"
  if [ -n "${POINTMOR_PREFLIGHT_SECRET:-}" ]; then
    HSEC="$(curl -fsS -H "X-Pointmor-Preflight-Secret: $POINTMOR_PREFLIGHT_SECRET" "$API_BASE/health?securitySummary=1")"
  else
    HSEC="$(curl -fsS "$API_BASE/health?securitySummary=1")"
  fi
  if ! printf "%s" "$HSEC" | grep -q '"metrics"'; then
    echo "   FAIL: health metrics eksik"
    exit 1
  fi
  if printf "%s" "$HSEC" | grep -q '"securityRedacted"'; then
    echo "   OK (strict: policy redacted; POINTMOR_PREFLIGHT_SECRET ile tam özet)"
  elif printf "%s" "$HSEC" | grep -q '"security"'; then
    echo "   OK (full preflight)"
  else
    echo "   FAIL: security / securityRedacted yok"
    exit 1
  fi
else
  echo "6) SKIP health security summary (ALLOW_HEALTH_SECURITY_SUMMARY=true ile etkinleşir)"
fi

echo "smoke-demo: PASS"
