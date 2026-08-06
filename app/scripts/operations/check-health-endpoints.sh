#!/usr/bin/env bash
set -euo pipefail

DE_BASE="${DE_BASE:-https://varnito.de}"
US_BASE="${US_BASE:-https://varnito.com}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"

check_public_health() {
  local url="$1/api/health"
  local response

  response="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" "$url")"

  if [[ "$response" != *'"status":"ok"'* && "$response" != *'"status": "ok"'* ]]; then
    echo "[FAIL] $url returned unexpected body: $response"
    return 1
  fi

  echo "[OK] $url -> $response"
}

check_ready_if_configured() {
  local base_url="$1"

  if [[ -z "${INTERNAL_API_SECRET:-}" ]]; then
    echo "[SKIP] $base_url/api/ready (INTERNAL_API_SECRET not set)"
    return 0
  fi

  local url="$base_url/api/ready"
  local response

  response="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" --header "x-internal-api-secret: ${INTERNAL_API_SECRET}" "$url")"

  if [[ "$response" != *'"status":"ok"'* && "$response" != *'"status": "ok"'* ]]; then
    echo "[FAIL] $url returned unexpected body: $response"
    return 1
  fi

  echo "[OK] $url -> $response"
}

check_public_health "$DE_BASE"
check_public_health "$US_BASE"
check_ready_if_configured "$DE_BASE"
check_ready_if_configured "$US_BASE"

echo "All configured health checks succeeded."
