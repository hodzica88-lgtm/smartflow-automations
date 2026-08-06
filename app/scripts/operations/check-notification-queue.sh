#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://varnito.de}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"

if [[ -z "${INTERNAL_API_SECRET:-}" ]]; then
  echo "INTERNAL_API_SECRET is required for queue diagnostics."
  exit 1
fi

URL="${BASE_URL}/api/internal/health"
CODE="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" --header "x-internal-api-secret: ${INTERNAL_API_SECRET}" -o /tmp/queue-health.out -w "%{http_code}" "$URL")"
BODY="$(cat /tmp/queue-health.out)"

if [[ "$CODE" != "200" && "$CODE" != "503" ]]; then
  echo "[FAIL] ${URL} returned HTTP ${CODE}"
  exit 1
fi

if [[ "$BODY" != *'"counts"'* ]]; then
  echo "[FAIL] ${URL} response missing queue counts"
  exit 1
fi

echo "[OK] ${URL} -> HTTP ${CODE}"
echo "$BODY"
