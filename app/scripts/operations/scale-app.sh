#!/usr/bin/env bash
set -euo pipefail

tools_app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
app_dir="${VARNITO_APP_DIR:-$tools_app_dir}"
cd "$app_dir"
primary=anfragepilot-app
replicas=(anfragepilot-app-2 anfragepilot-app-3 anfragepilot-app-4)

active_replica_routes() {
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:2019/reverse_proxy/upstreams |
    python3 -c 'import json,sys; print(any(row.get("address") in {"127.0.0.1:3001","127.0.0.1:3002","127.0.0.1:3003"} for row in json.load(sys.stdin)))'
}

status() {
  local expected current name expected_env current_env
  expected="$(docker inspect --format '{{.Image}}' "$primary")"
  expected_env="$(docker inspect --format '{{json .Config.Env}}' "$primary" | python3 -c 'import hashlib,json,sys; print(hashlib.sha256(json.dumps(sorted(json.load(sys.stdin))).encode()).hexdigest())')"
  for name in "$primary" "${replicas[@]}"; do
    current="$(docker inspect --format '{{.Image}}' "$name")"
    [[ "$current" == "$expected" ]] || { echo "Image mismatch: $name" >&2; return 1; }
    current_env="$(docker inspect --format '{{json .Config.Env}}' "$name" | python3 -c 'import hashlib,json,sys; print(hashlib.sha256(json.dumps(sorted(json.load(sys.stdin))).encode()).hexdigest())')"
    [[ "$current_env" == "$expected_env" ]] || { echo "Environment mismatch: $name. Values not printed." >&2; return 1; }
    [[ "$(docker inspect --format '{{.State.Health.Status}}' "$name")" == healthy ]] || { echo "Unhealthy: $name" >&2; return 1; }
    docker inspect --format '{{.Name}} health={{.State.Health.Status}} restarts={{.RestartCount}} image={{.Image}}' "$name"
  done
}

case "${1:-}" in
  start)
    [[ "$(active_replica_routes)" == False ]] || { echo 'Rollback Caddy before changing replicas.' >&2; exit 1; }
    [[ "$(docker inspect --format '{{.State.Health.Status}}' "$primary")" == healthy ]] || { echo 'Primary must be healthy.' >&2; exit 1; }
    for name in "${replicas[@]}"; do
      if docker inspect "$name" >/dev/null 2>&1; then
        echo "Replica already exists: $name. Use status or rollback/stop first." >&2
        exit 1
      fi
    done
    image_id="$(docker inspect --format '{{.Image}}' "$primary")"
    [[ "$image_id" =~ ^sha256:[a-f0-9]{64}$ ]] || { echo 'Invalid primary image ID.' >&2; exit 1; }
    export VARNITO_SCALE_IMAGE="anfragepilot-app:scale-${image_id:7:16}"
    docker image tag "$image_id" "$VARNITO_SCALE_IMAGE"
    project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$primary")"
    [[ "$project" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || { echo 'Primary Compose project missing.' >&2; exit 1; }
    compose=(docker compose --project-name "$project" --env-file .env.production -f "$app_dir/compose.yaml" -f "$tools_app_dir/compose.scale.yaml")
    "${compose[@]}" config --quiet
    "${compose[@]}" up -d --no-build --no-deps --wait --wait-timeout 120 app-2 app-3 app-4
    status
    ;;
  status)
    status
    ;;
  stop)
    [[ "$(active_replica_routes)" == False ]] || { echo 'Rollback Caddy before stopping replicas.' >&2; exit 1; }
    project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$primary")"
    [[ "$project" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || { echo 'Primary Compose project missing.' >&2; exit 1; }
    for name in "${replicas[@]}"; do
      if docker inspect "$name" >/dev/null 2>&1; then
        [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$name")" =~ ^app-[234]$ ]] || { echo "Unexpected container owner: $name" >&2; exit 1; }
        [[ "$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$name")" == "$project" ]] || { echo "Unexpected Compose project: $name" >&2; exit 1; }
      fi
    done
    for name in "${replicas[@]}"; do
      if docker inspect "$name" >/dev/null 2>&1; then docker container rm --force "$name"; fi
    done
    ;;
  *)
    echo 'Usage: bash scripts/operations/scale-app.sh start|status|stop' >&2
    exit 2
    ;;
esac
