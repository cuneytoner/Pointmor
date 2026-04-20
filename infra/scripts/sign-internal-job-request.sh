#!/usr/bin/env sh
# Internal job HMAC başlıkları üretir (webhook ile aynı: HMAC-SHA256(secret, "<unix_ts>.<rawBody>")).
# INTERNAL_JOB_REQUIRE_HMAC=true cutover öncesi retention/hq-insights çağrılarını doğrulamak için kullanın.
# Kullanım (VM / Linux, openssl gerekir):
#   BODY='{"dryRun":true}' SECRET="$RETENTION_JOB_SECRET" ./infra/scripts/sign-internal-job-request.sh
# Çıktı: X-Internal-Job-Timestamp / X-Internal-Job-Signature / X-Internal-Job-Id (curl -H ile yapıştırın)
set -e
SECRET="${SECRET:?Set SECRET (e.g. RETENTION_JOB_SECRET)}"
BODY="${BODY:-{}}"
TS=$(date +%s)
SIG=$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
ID="${JOB_ID:-$(openssl rand -hex 8)}"
echo "X-Internal-Job-Timestamp: $TS"
echo "X-Internal-Job-Signature: v1=$SIG"
echo "X-Internal-Job-Id: $ID"
echo ""
echo "Örnek curl (retention):"
echo "  curl -sS -X POST \"\$API/internal/jobs/retention\" \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'X-Internal-Job-Timestamp: $TS' \\"
echo "    -H 'X-Internal-Job-Signature: v1=$SIG' \\"
echo "    -H 'X-Internal-Job-Id: $ID' \\"
echo "    -d '$BODY'"
echo ""
echo "Örnek curl (hq-insights):"
echo "  curl -sS -X POST \"\$API/internal/jobs/hq-insights\" \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'X-Internal-Job-Timestamp: $TS' \\"
echo "    -H 'X-Internal-Job-Signature: v1=$SIG' \\"
echo "    -H 'X-Internal-Job-Id: $ID' \\"
echo "    -d '$BODY'"
