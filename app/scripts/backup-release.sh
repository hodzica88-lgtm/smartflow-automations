#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

PROJECT_ROOT="${VARNITO_PROJECT_ROOT:-/opt/anfragepilot}"
APP_DIR="${VARNITO_APP_DIR:-${PROJECT_ROOT}/app}"
ENV_FILE="${VARNITO_ENV_FILE:-${APP_DIR}/.env.production}"
DOCKER_IMAGE="${VARNITO_DOCKER_IMAGE:-anfragepilot-app:latest}"
BACKUP_BASE_DIR="${VARNITO_BACKUP_BASE_DIR:-/home/varnitoadmin/backups/releases}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RELEASE_DIR=""
RELEASE_DIR_CREATED=0
DRY_RUN=0
VERSION=""
SIMULATION_MODE=0
SIMULATION_NOTES=""
GIT_CONTEXT_ROOT="${PROJECT_ROOT}"
HAS_SERVER_PROJECT=0
HAS_SERVER_ENV=0
HAS_SERVER_DOCKER_IMAGE=0
HAS_SERVER_BACKUP_BASE=0
HAS_DOCKER_COMMAND=0

log() {
  printf '[INFO] %s\n' "$1"
}

warn() {
  printf '[WARN] %s\n' "$1" >&2
}

fail() {
  printf '[ERROR] %s\n' "$1" >&2
  exit 1
}

on_error() {
  local line="${1:-unknown}"
  printf '[ERROR] Script failed at line %s.\n' "$line" >&2

  if [[ "${RELEASE_DIR_CREATED}" -eq 1 && -n "${RELEASE_DIR}" && -d "${RELEASE_DIR}" ]]; then
    printf '[WARN] Removing incomplete release directory: %s\n' "${RELEASE_DIR}" >&2
    rm -rf -- "${RELEASE_DIR}"
  fi
}

trap 'on_error "${BASH_LINENO[0]:-$LINENO}"' ERR

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/backup-release.sh <version>
  bash scripts/backup-release.sh --dry-run <version>

Version must match: vMAJOR.MINOR.PATCH (example: v1.1.0)
USAGE
}

append_simulation_note() {
  local note="$1"
  SIMULATION_MODE=1
  if [[ -z "${SIMULATION_NOTES}" ]]; then
    SIMULATION_NOTES="${note}"
  else
    SIMULATION_NOTES="${SIMULATION_NOTES}; ${note}"
  fi
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

require_command_or_simulate() {
  local cmd="$1"
  local note="$2"

  if command -v "$cmd" >/dev/null 2>&1; then
    return
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Missing command ${cmd}"
    warn "[DRY-RUN][SIMULATION] ${note}"
    return
  fi

  fail "Required command not found: ${cmd}"
}

validate_args() {
  if [[ "$#" -eq 1 ]]; then
    VERSION="$1"
    return
  fi

  if [[ "$#" -eq 2 && "$1" == "--dry-run" ]]; then
    DRY_RUN=1
    VERSION="$2"
    return
  fi

  usage
  fail "Invalid arguments."
}

validate_version() {
  [[ "${VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Invalid version format: ${VERSION}. Expected vMAJOR.MINOR.PATCH"
}

ensure_git_clean() {
  local status
  status="$(git -C "${GIT_CONTEXT_ROOT}" status --porcelain)"

  if [[ -z "${status}" ]]; then
    return
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Git working tree not clean in ${GIT_CONTEXT_ROOT}"
    warn "[DRY-RUN][SIMULATION] Git working tree is not clean in ${GIT_CONTEXT_ROOT}."
    return
  fi

  fail "Git working tree is not clean in ${GIT_CONTEXT_ROOT}."
}

ensure_remote_reachable() {
  git -C "${GIT_CONTEXT_ROOT}" ls-remote --exit-code origin >/dev/null 2>&1 || fail "Git remote origin is not reachable."
}

resolve_remote_tag_commit() {
  local version="$1"
  local remote_commit

  remote_commit="$(git -C "${GIT_CONTEXT_ROOT}" ls-remote --tags origin "refs/tags/${version}^{}" | awk 'NR==1{print $1}')"
  if [[ -z "${remote_commit}" ]]; then
    remote_commit="$(git -C "${GIT_CONTEXT_ROOT}" ls-remote --tags origin "refs/tags/${version}" | awk 'NR==1{print $1}')"
  fi

  printf '%s' "${remote_commit}"
}

ensure_tag_state() {
  local commit_sha="$1"
  local local_tag_commit=""
  local remote_tag_commit=""

  if git -C "${GIT_CONTEXT_ROOT}" rev-parse -q --verify "refs/tags/${VERSION}" >/dev/null 2>&1; then
    local_tag_commit="$(git -C "${GIT_CONTEXT_ROOT}" rev-list -n1 "${VERSION}")"
    if [[ "${local_tag_commit}" != "${commit_sha}" ]]; then
      fail "Local tag ${VERSION} exists but points to ${local_tag_commit}, not ${commit_sha}."
    fi
    log "Local tag ${VERSION} already exists on the current commit."
  fi

  remote_tag_commit="$(resolve_remote_tag_commit "${VERSION}")"
  if [[ -n "${remote_tag_commit}" && "${remote_tag_commit}" != "${commit_sha}" ]]; then
    fail "Remote tag ${VERSION} exists on commit ${remote_tag_commit}, expected ${commit_sha}."
  fi
}

ensure_writable() {
  local path="$1"
  [[ -w "${path}" ]] || fail "Write permission missing for: ${path}"
}

create_or_verify_tag() {
  local commit_sha="$1"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[DRY-RUN] Would create tag ${VERSION} on ${commit_sha} if missing."
    log "[DRY-RUN] Would push tag ${VERSION} to origin."
    return
  fi

  if ! git -C "${GIT_CONTEXT_ROOT}" rev-parse -q --verify "refs/tags/${VERSION}" >/dev/null 2>&1; then
    git -C "${GIT_CONTEXT_ROOT}" tag "${VERSION}" "${commit_sha}"
    log "Created tag ${VERSION} on ${commit_sha}."
  else
    log "Tag ${VERSION} already exists locally on ${commit_sha}."
  fi

  git -C "${GIT_CONTEXT_ROOT}" push origin "refs/tags/${VERSION}"
  log "Pushed tag ${VERSION} to origin."
}

detect_or_simulate_server_prerequisites() {
  if [[ -d "${PROJECT_ROOT}" ]]; then
    HAS_SERVER_PROJECT=1
  elif [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Missing ${PROJECT_ROOT}"
    warn "[DRY-RUN][SIMULATION] Required path not found: ${PROJECT_ROOT}"
  else
    fail "Required path not found: ${PROJECT_ROOT}"
  fi

  if [[ -f "${ENV_FILE}" ]]; then
    HAS_SERVER_ENV=1
  elif [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Missing ${ENV_FILE}"
    warn "[DRY-RUN][SIMULATION] Required env file not found: ${ENV_FILE}"
  else
    fail "Missing env file: ${ENV_FILE}"
  fi

  if [[ "${HAS_DOCKER_COMMAND}" -eq 1 ]]; then
    if docker image inspect "${DOCKER_IMAGE}" >/dev/null 2>&1; then
      HAS_SERVER_DOCKER_IMAGE=1
    elif [[ "${DRY_RUN}" -eq 1 ]]; then
      append_simulation_note "Missing Docker image ${DOCKER_IMAGE}"
      warn "[DRY-RUN][SIMULATION] Docker image not found: ${DOCKER_IMAGE}"
    else
      fail "Docker image not found: ${DOCKER_IMAGE}"
    fi
  elif [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Missing docker command"
    warn "[DRY-RUN][SIMULATION] Docker command not found; image check simulated."
  else
    fail "Required command not found: docker"
  fi

  if [[ -d "${BACKUP_BASE_DIR}" ]]; then
    HAS_SERVER_BACKUP_BASE=1
    if [[ "${DRY_RUN}" -eq 0 ]]; then
      ensure_writable "${BACKUP_BASE_DIR}"
    fi
  elif [[ "${DRY_RUN}" -eq 1 ]]; then
    append_simulation_note "Missing ${BACKUP_BASE_DIR}"
    warn "[DRY-RUN][SIMULATION] Backup base directory not found: ${BACKUP_BASE_DIR}"
  else
    fail "Required path not found: ${BACKUP_BASE_DIR}"
  fi

  if [[ "${HAS_SERVER_PROJECT}" -eq 1 && -d "${PROJECT_ROOT}/.git" ]]; then
    GIT_CONTEXT_ROOT="${PROJECT_ROOT}"
  elif [[ "${DRY_RUN}" -eq 1 ]]; then
    GIT_CONTEXT_ROOT="${LOCAL_REPO_ROOT}"
    append_simulation_note "Using local git context ${LOCAL_REPO_ROOT}"
    warn "[DRY-RUN][SIMULATION] Using local git context: ${LOCAL_REPO_ROOT}"
  else
    fail "Git repository not found at ${PROJECT_ROOT}"
  fi
}

build_release_dir() {
  local timestamp="$1"
  RELEASE_DIR="${BACKUP_BASE_DIR}/${VERSION}-${timestamp}"

  [[ ! -e "${RELEASE_DIR}" ]] || fail "Release backup directory already exists: ${RELEASE_DIR}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[DRY-RUN] Would create release directory: ${RELEASE_DIR}"
    return
  fi

  mkdir -p -- "${RELEASE_DIR}"
  chmod 700 "${RELEASE_DIR}"
  RELEASE_DIR_CREATED=1
  log "Created release directory: ${RELEASE_DIR}"
}

write_release_info() {
  local file_path="$1"
  local version="$2"
  local timestamp="$3"
  local commit_sha="$4"
  local branch="$5"
  local image_id="$6"
  local hostname_value="$7"
  local db_dump_file="$8"
  local db_format="$9"
  local db_host="${10}"
  local db_name="${11}"

  cat >"${file_path}" <<EOF
Version: ${version}
Date: ${timestamp}
Git Commit SHA: ${commit_sha}
Git Branch: ${branch}
Git Tag: ${version}
Docker Image Name: ${DOCKER_IMAGE}
Docker Image ID: ${image_id}
Hostname: ${hostname_value}
Project Path: ${PROJECT_ROOT}
Backup Path: ${RELEASE_DIR}
Database Backup File: ${db_dump_file}
Database Dump Format: ${db_format}
Database Host: ${db_host}
Database Name: ${db_name}
EOF
}

validate_backup_outputs() {
  local source_archive="$1"
  local docker_archive="$2"
  local env_backup="$3"
  local db_dump="$4"
  local info_file="$5"

  tar -tzf "${source_archive}" >/dev/null
  [[ -s "${docker_archive}" ]] || fail "Docker backup archive is empty: ${docker_archive}"
  [[ -s "${env_backup}" ]] || fail "Env backup file missing or empty: ${env_backup}"
  [[ -s "${db_dump}" ]] || fail "Database dump missing or empty: ${db_dump}"
  pg_restore --list "${db_dump}" >/dev/null 2>&1 || fail "Database dump validation failed: ${db_dump}"
  [[ -s "${info_file}" ]] || fail "release-info.txt missing or empty: ${info_file}"
}

print_summary() {
  local commit_sha="$1"
  local source_archive="$2"
  local docker_archive="$3"
  local env_backup="$4"
  local db_dump="$5"
  local info_file="$6"

  local source_size docker_size env_size db_size info_size
  source_size="$(stat -c '%s' "${source_archive}")"
  docker_size="$(stat -c '%s' "${docker_archive}")"
  env_size="$(stat -c '%s' "${env_backup}")"
  db_size="$(stat -c '%s' "${db_dump}")"
  info_size="$(stat -c '%s' "${info_file}")"

  printf '\n=== Release Backup Summary ===\n'
  printf 'Release Version: %s\n' "${VERSION}"
  printf 'Commit: %s\n' "${commit_sha}"
  printf 'Backup Directory: %s\n' "${RELEASE_DIR}"
  printf 'Files:\n'
  printf '  - %s (%s bytes)\n' "$(basename "${source_archive}")" "${source_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${docker_archive}")" "${docker_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${env_backup}")" "${env_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${db_dump}")" "${db_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${info_file}")" "${info_size}"
  printf 'Status: successful\n'
}

main() {
  validate_args "$@"
  validate_version

  require_command git
  require_command_or_simulate tar "tar command not found; archive creation checks are simulated."
  require_command_or_simulate docker "docker command not found; docker image checks are simulated."
  require_command stat
  require_command hostname
  require_command date
  require_command_or_simulate pg_dump "pg_dump command not found; database dump checks are simulated."
  require_command_or_simulate pg_restore "pg_restore command not found; database dump verification is simulated."

  if command -v docker >/dev/null 2>&1; then
    HAS_DOCKER_COMMAND=1
  fi

  detect_or_simulate_server_prerequisites

  ensure_git_clean
  ensure_remote_reachable

  local commit_sha branch timestamp image_id host_value db_dump_name db_format db_host db_name
  commit_sha="$(git -C "${GIT_CONTEXT_ROOT}" rev-parse HEAD)"
  branch="$(git -C "${GIT_CONTEXT_ROOT}" rev-parse --abbrev-ref HEAD)"
  timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
  if [[ "${HAS_SERVER_DOCKER_IMAGE}" -eq 1 ]]; then
    image_id="$(docker image inspect --format '{{.Id}}' "${DOCKER_IMAGE}")"
  else
    image_id="SIMULATED-DOCKER-IMAGE-ID"
  fi
  host_value="$(hostname)"
  db_dump_name="varnito-database-${VERSION}.dump"
  db_format="PostgreSQL custom format (pg_dump --format=c)"

  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    . "${ENV_FILE}"
    set +a
  fi

  db_host="${PGHOST:-${POSTGRES_HOST:-${SUPABASE_DB_HOST:-localhost}}}"
  db_name="${PGDATABASE:-${POSTGRES_DB:-${SUPABASE_DB_NAME:-}}}"

  if [[ "${DRY_RUN}" -eq 0 && -z "${db_name}" ]]; then
    fail "Database name not configured in ${ENV_FILE}."
  fi

  if [[ -z "${db_name}" ]]; then
    db_name="SIMULATED_DATABASE"
  fi

  ensure_tag_state "${commit_sha}"

  if [[ "${DRY_RUN}" -eq 0 ]]; then
    ensure_writable "${GIT_CONTEXT_ROOT}/.git"
  fi

  create_or_verify_tag "${commit_sha}"
  build_release_dir "${timestamp}"

  local source_archive docker_archive env_backup info_file db_dump
  source_archive="${RELEASE_DIR}/varnito-source-${VERSION}.tar.gz"
  docker_archive="${RELEASE_DIR}/varnito-docker-${VERSION}.tar"
  env_backup="${RELEASE_DIR}/.env.production-${VERSION}"
  db_dump="${RELEASE_DIR}/${db_dump_name}"
  info_file="${RELEASE_DIR}/release-info.txt"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    if [[ "${SIMULATION_MODE}" -eq 1 ]]; then
      log "Dry-run simulation mode active: ${SIMULATION_NOTES}"
    fi
    log "[DRY-RUN] Would create source archive: ${source_archive}"
    log "[DRY-RUN] Would create docker archive: ${docker_archive}"
    log "[DRY-RUN] Would copy env file to: ${env_backup}"
    log "[DRY-RUN] Would create database dump: ${db_dump}"
    log "[DRY-RUN] Would create release info file: ${info_file}"
    log "Dry-run completed successfully. No backup artifacts were generated."
    return
  fi

  log "Creating source archive..."
  tar -czf "${source_archive}" -C "$(dirname "${PROJECT_ROOT}")" "$(basename "${PROJECT_ROOT}")"

  log "Creating docker image archive..."
  docker save -o "${docker_archive}" "${DOCKER_IMAGE}"

  log "Copying production environment file..."
  cp -- "${ENV_FILE}" "${env_backup}"

  log "Creating PostgreSQL database dump..."
  if [[ -n "${DATABASE_URL:-}" ]]; then
    pg_dump "${DATABASE_URL}" --format=c --compress=9 --file="${db_dump}"
  else
    local db_user db_password db_port
    db_user="${PGUSER:-${POSTGRES_USER:-${SUPABASE_DB_USER:-}}}"
    db_password="${PGPASSWORD:-${POSTGRES_PASSWORD:-${SUPABASE_DB_PASSWORD:-}}}"
    db_port="${PGPORT:-${POSTGRES_PORT:-5432}}"

    if [[ -z "${db_user}" || -z "${db_password}" ]]; then
      fail "Database credentials are not available in ${ENV_FILE}."
    fi

    export PGPASSWORD="${db_password}"
    pg_dump --host="${db_host}" --port="${db_port}" --username="${db_user}" --dbname="${db_name}" --format=c --compress=9 --file="${db_dump}"
    unset PGPASSWORD
  fi

  log "Writing release metadata..."
  write_release_info "${info_file}" "${VERSION}" "${timestamp}" "${commit_sha}" "${branch}" "${image_id}" "${host_value}" "$(basename "${db_dump}")" "${db_format}" "${db_host}" "${db_name}"

  chmod 600 "${source_archive}" "${docker_archive}" "${env_backup}" "${db_dump}" "${info_file}"
  chmod 700 "${RELEASE_DIR}"

  log "Validating backup integrity..."
  validate_backup_outputs "${source_archive}" "${docker_archive}" "${env_backup}" "${db_dump}" "${info_file}"

  print_summary "${commit_sha}" "${source_archive}" "${docker_archive}" "${env_backup}" "${db_dump}" "${info_file}"
}

main "$@"
