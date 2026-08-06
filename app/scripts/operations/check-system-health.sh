#!/usr/bin/env bash
set -euo pipefail

DE_BASE="${DE_BASE:-https://varnito.de}"
US_BASE="${US_BASE:-https://varnito.com}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"

fetch_json() {
  local url="$1"
  curl --silent --show-error --max-time "$TIMEOUT_SECONDS" "$url"
}

assert_contains() {
  local body="$1"
  local marker="$2"
  local source="$3"

  if [[ "$body" != *"$marker"* ]]; then
    echo "[FAIL] $source missing marker: $marker"
    exit 1
  fi
}

check_public_endpoint() {
  local base_url="$1"
  local endpoint="$2"
  local url="${base_url}${endpoint}"
  local body
  local code

  code="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" -o /tmp/system-health.out -w "%{http_code}" "$url")"
  body="$(cat /tmp/system-health.out)"

  if [[ "$code" != "200" ]]; then
    echo "[FAIL] ${url} returned HTTP ${code}"
    exit 1
  fi

  assert_contains "$body" '"status"' "$url"
  echo "[OK] ${url} -> HTTP 200"
}

check_internal_ready_if_configured() {
  local base_url="$1"
  local url="${base_url}/api/ready"

  if [[ -z "${INTERNAL_API_SECRET:-}" ]]; then
    echo "[SKIP] ${url} (INTERNAL_API_SECRET not set)"
    return
  fi

  local code
  local body
  code="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" --header "x-internal-api-secret: ${INTERNAL_API_SECRET}" -o /tmp/ready.out -w "%{http_code}" "$url")"
  body="$(cat /tmp/ready.out)"

  if [[ "$code" != "200" ]]; then
    echo "[FAIL] ${url} returned HTTP ${code}: ${body}"
    exit 1
  fi

  assert_contains "$body" '"status":"ok"' "$url"
  echo "[OK] ${url} -> HTTP 200"
}

check_internal_health_if_configured() {
  local base_url="$1"
  local url="${base_url}/api/internal/health"

  if [[ -z "${INTERNAL_API_SECRET:-}" ]]; then
    echo "[SKIP] ${url} (INTERNAL_API_SECRET not set)"
    return
  fi

  local code
  code="$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" --header "x-internal-api-secret: ${INTERNAL_API_SECRET}" -o /tmp/internal-health.out -w "%{http_code}" "$url")"

  if [[ "$code" != "200" && "$code" != "503" ]]; then
    echo "[FAIL] ${url} returned unexpected HTTP ${code}"
    exit 1
  fi

  echo "[OK] ${url} -> HTTP ${code}"
}

echo "Checking public health endpoints..."
check_public_endpoint "$DE_BASE" "/api/health"
check_public_endpoint "$US_BASE" "/api/health"

echo "Checking readiness and internal health (if configured)..."
check_internal_ready_if_configured "$DE_BASE"
check_internal_ready_if_configured "$US_BASE"
check_internal_health_if_configured "$DE_BASE"
check_internal_health_if_configured "$US_BASE"

echo "System health checks completed successfully."
