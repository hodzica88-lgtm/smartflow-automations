#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

PROJECT_ROOT="${VARNITO_PROJECT_ROOT:-/opt/anfragepilot}"
APP_DIR="${VARNITO_APP_DIR:-${PROJECT_ROOT}/app}"
ENV_FILE="${VARNITO_ENV_FILE:-${APP_DIR}/.env.production}"
BACKUP_BASE_DIR="${VARNITO_BACKUP_BASE_DIR:-/home/varnitoadmin/backups/releases}"
COMPOSE_FILE="${VARNITO_COMPOSE_FILE:-${PROJECT_ROOT}/compose.yaml}"
DOCKER_SERVICE_NAME="${VARNITO_DOCKER_SERVICE_NAME:-app}"

DRY_RUN=0
VERSION=""
TARGET_RELEASE=""
CONFIRMED=0
SAFETY_BACKUP_DIR=""

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

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/restore-release.sh <version>
  bash scripts/restore-release.sh --dry-run <version>

This script validates a release backup and restores the application only after
explicit confirmation. Dry-run only validates and prints planned actions.
USAGE
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

resolve_release_dir() {
  local version="$1"
  local match

  match="$(find "${BACKUP_BASE_DIR}" -maxdepth 1 -mindepth 1 -type d -name "${version}-*" 2>/dev/null | sort | tail -n 1)"
  if [[ -z "${match}" ]]; then
    fail "No release backup found for version ${version} in ${BACKUP_BASE_DIR}"
  fi

  printf '%s\n' "${match}"
}

validate_required_files() {
  local release_dir="$1"
  local source_archive docker_archive env_backup db_dump info_file

  source_archive="${release_dir}/varnito-source-${VERSION}.tar.gz"
  docker_archive="${release_dir}/varnito-docker-${VERSION}.tar"
  env_backup="${release_dir}/.env.production-${VERSION}"
  db_dump="${release_dir}/varnito-database-${VERSION}.dump"
  info_file="${release_dir}/release-info.txt"

  [[ -f "${source_archive}" ]] || fail "Missing source archive: ${source_archive}"
  [[ -f "${docker_archive}" ]] || fail "Missing docker archive: ${docker_archive}"
  [[ -f "${env_backup}" ]] || fail "Missing env backup: ${env_backup}"
  [[ -f "${info_file}" ]] || fail "Missing release metadata: ${info_file}"

  if [[ -f "${db_dump}" ]]; then
    pg_restore --list "${db_dump}" >/dev/null 2>&1 || fail "Database dump is invalid: ${db_dump}"
  else
    warn "Legacy or partial backup: database dump missing for ${VERSION}. Restore will be marked partial and cannot be treated as a full database recovery backup."
  fi

  tar -tzf "${source_archive}" >/dev/null || fail "Source archive failed validation: ${source_archive}"
  [[ -s "${docker_archive}" ]] || fail "Docker archive is empty: ${docker_archive}"
  [[ -s "${env_backup}" ]] || fail "Environment file backup is empty: ${env_backup}"
  [[ -s "${info_file}" ]] || fail "Metadata file is empty: ${info_file}"
}

create_safety_backup() {
  local timestamp
  timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
  SAFETY_BACKUP_DIR="${BACKUP_BASE_DIR}/safety-pre-restore-${timestamp}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[DRY-RUN] Would create safety backup directory: ${SAFETY_BACKUP_DIR}"
    return
  fi

  mkdir -p -- "${SAFETY_BACKUP_DIR}"
  chmod 700 "${SAFETY_BACKUP_DIR}"

  log "Creating safety backup of current production state..."
  if [[ -d "${PROJECT_ROOT}" ]]; then
    tar -czf "${SAFETY_BACKUP_DIR}/project-source.tar.gz" -C "$(dirname "${PROJECT_ROOT}")" "$(basename "${PROJECT_ROOT}")"
  fi

  if [[ -f "${ENV_FILE}" ]]; then
    cp -- "${ENV_FILE}" "${SAFETY_BACKUP_DIR}/.env.production"
  fi

  if [[ -f "${COMPOSE_FILE}" ]]; then
    cp -- "${COMPOSE_FILE}" "${SAFETY_BACKUP_DIR}/compose.yaml"
  fi

  if [[ -f "${PROJECT_ROOT}/.git" ]]; then
    git -C "${PROJECT_ROOT}" rev-parse --verify HEAD >/dev/null 2>&1 && git -C "${PROJECT_ROOT}" rev-parse HEAD > "${SAFETY_BACKUP_DIR}/git-head.txt"
  fi

  chmod 600 "${SAFETY_BACKUP_DIR}"/*.tar.gz "${SAFETY_BACKUP_DIR}"/.env.production "${SAFETY_BACKUP_DIR}"/compose.yaml "${SAFETY_BACKUP_DIR}"/git-head.txt 2>/dev/null || true
  log "Safety backup created at ${SAFETY_BACKUP_DIR}"
}

confirm_restore() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[DRY-RUN] Confirmation would be required before any destructive restore."
    return
  fi

  local answer
  read -r -p "Type 'RESTORE' to proceed with the release restore: " answer || fail "Restore confirmation was not provided."
  if [[ "${answer}" != "RESTORE" ]]; then
    fail "Restore aborted by user confirmation check."
  fi
  CONFIRMED=1
}

restore_release() {
  local release_dir="$1"
  local source_archive docker_archive env_backup db_dump

  source_archive="${release_dir}/varnito-source-${VERSION}.tar.gz"
  docker_archive="${release_dir}/varnito-docker-${VERSION}.tar"
  env_backup="${release_dir}/.env.production-${VERSION}"
  db_dump="${release_dir}/varnito-database-${VERSION}.dump"

  log "Restoring source archive..."
  tar -xzf "${source_archive}" -C "$(dirname "${PROJECT_ROOT}")"

  log "Restoring environment file..."
  cp -- "${env_backup}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"

  if [[ -f "${docker_archive}" ]]; then
    log "Loading Docker image..."
    docker load -i "${docker_archive}"
  fi

  if [[ -f "${db_dump}" ]]; then
    local db_host db_name db_user db_password db_port
    db_host="${PGHOST:-${POSTGRES_HOST:-${SUPABASE_DB_HOST:-localhost}}}"
    db_name="${PGDATABASE:-${POSTGRES_DB:-${SUPABASE_DB_NAME:-}}}"
    db_user="${PGUSER:-${POSTGRES_USER:-${SUPABASE_DB_USER:-}}}"
    db_password="${PGPASSWORD:-${POSTGRES_PASSWORD:-${SUPABASE_DB_PASSWORD:-}}}"
    db_port="${PGPORT:-${POSTGRES_PORT:-5432}}"

    if [[ -z "${db_name}" || -z "${db_user}" || -z "${db_password}" ]]; then
      fail "Database restore cannot proceed because database credentials are not configured."
    fi

    log "Restoring PostgreSQL database..."
    export PGPASSWORD="${db_password}"
    pg_restore --clean --if-exists --no-owner --no-privileges --host="${db_host}" --port="${db_port}" --username="${db_user}" --dbname="${db_name}" "${db_dump}"
    unset PGPASSWORD
  else
    warn "No database dump present in ${release_dir}. The restore is marked partial and not treated as a full DB recovery."
  fi

  if [[ -f "${COMPOSE_FILE}" ]]; then
    log "Restarting application stack with Docker Compose..."
    docker compose -f "${COMPOSE_FILE}" up -d --force-recreate "${DOCKER_SERVICE_NAME}"
  else
    warn "No compose file found at ${COMPOSE_FILE}; skipping Docker Compose restart."
  fi

  if command -v curl >/dev/null 2>&1; then
    curl -fsS "http://localhost:3000/health" >/dev/null 2>&1 || curl -fsS "http://localhost:3000" >/dev/null 2>&1 || warn "Health validation endpoint did not respond on localhost:3000"
  else
    warn "curl not installed; skipping HTTP health validation."
  fi
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

main() {
  validate_args "$@"
  validate_version

  require_command bash
  require_command find
  require_command tar
  require_command cp
  require_command mkdir
  require_command date

  if [[ "${DRY_RUN}" -eq 0 ]]; then
    require_command pg_restore
    require_command docker
  fi

  if [[ ! -d "${BACKUP_BASE_DIR}" ]]; then
    fail "Backup base directory not found: ${BACKUP_BASE_DIR}"
  fi

  TARGET_RELEASE="$(resolve_release_dir "${VERSION}")"
  log "Selected release directory: ${TARGET_RELEASE}"

  validate_required_files "${TARGET_RELEASE}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    create_safety_backup
    log "[DRY-RUN] Restore validation completed successfully for ${VERSION}."
    return
  fi

  create_safety_backup
  confirm_restore

  if [[ "${CONFIRMED}" -ne 1 ]]; then
    fail "Restore confirmation did not complete."
  fi

  restore_release "${TARGET_RELEASE}"
  log "Restore finished successfully for ${VERSION}."
}

main "$@"
