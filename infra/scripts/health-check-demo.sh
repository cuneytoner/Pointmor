#!/usr/bin/env sh
# API /health için localhost üzerinden yeniden denemeli kontrol.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/docker/.env.demo}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

PORT="${API_HOST_PORT:-3000}"
URL="http://127.0.0.1:${PORT}/health"
MAX="${HEALTH_CHECK_RETRIES:-30}"

http_ok() {
  if command -v curl >/dev/null 2>&1; then
    curl -sfS --connect-timeout 2 "$1" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -q --spider --timeout=2 "$1" 2>/dev/null
  else
    echo "health-check-demo: curl veya wget gerekli"
    return 1
  fi
}

echo "health-check-demo: ${URL} (en fazla ${MAX} deneme, 2s aralık)"
i=0
while [ "$i" -lt "$MAX" ]; do
  if http_ok "$URL"; then
    echo "health-check-demo: OK"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done

echo "health-check-demo: başarısız — API yanıt vermiyor (${URL})"
exit 1
