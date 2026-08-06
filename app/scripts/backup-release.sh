#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

PROJECT_ROOT="/opt/anfragepilot"
APP_DIR="${PROJECT_ROOT}/app"
ENV_FILE="${APP_DIR}/.env.production"
DOCKER_IMAGE="anfragepilot-app:latest"
BACKUP_BASE_DIR="/home/varnitoadmin/backups/releases"

RELEASE_DIR=""
RELEASE_DIR_CREATED=0
DRY_RUN=0
VERSION=""

log() {
  printf '[INFO] %s\n' "$1"
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

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

require_path_exists() {
  local path="$1"
  [[ -e "$path" ]] || fail "Required path not found: ${path}"
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
  status="$(git -C "${PROJECT_ROOT}" status --porcelain)"
  [[ -z "${status}" ]] || fail "Git working tree is not clean in ${PROJECT_ROOT}."
}

ensure_remote_reachable() {
  git -C "${PROJECT_ROOT}" ls-remote --exit-code origin >/dev/null 2>&1 || fail "Git remote origin is not reachable."
}

resolve_remote_tag_commit() {
  local version="$1"
  local remote_commit

  remote_commit="$(git -C "${PROJECT_ROOT}" ls-remote --tags origin "refs/tags/${version}^{}" | awk 'NR==1{print $1}')"
  if [[ -z "${remote_commit}" ]]; then
    remote_commit="$(git -C "${PROJECT_ROOT}" ls-remote --tags origin "refs/tags/${version}" | awk 'NR==1{print $1}')"
  fi

  printf '%s' "${remote_commit}"
}

ensure_tag_state() {
  local commit_sha="$1"
  local local_tag_commit=""
  local remote_tag_commit=""

  if git -C "${PROJECT_ROOT}" rev-parse -q --verify "refs/tags/${VERSION}" >/dev/null 2>&1; then
    local_tag_commit="$(git -C "${PROJECT_ROOT}" rev-list -n1 "${VERSION}")"
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

  if ! git -C "${PROJECT_ROOT}" rev-parse -q --verify "refs/tags/${VERSION}" >/dev/null 2>&1; then
    git -C "${PROJECT_ROOT}" tag "${VERSION}" "${commit_sha}"
    log "Created tag ${VERSION} on ${commit_sha}."
  else
    log "Tag ${VERSION} already exists locally on ${commit_sha}."
  fi

  git -C "${PROJECT_ROOT}" push origin "refs/tags/${VERSION}"
  log "Pushed tag ${VERSION} to origin."
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
EOF
}

validate_backup_outputs() {
  local source_archive="$1"
  local docker_archive="$2"
  local env_backup="$3"
  local info_file="$4"

  tar -tzf "${source_archive}" >/dev/null
  [[ -s "${docker_archive}" ]] || fail "Docker backup archive is empty: ${docker_archive}"
  [[ -s "${env_backup}" ]] || fail "Env backup file missing or empty: ${env_backup}"
  [[ -s "${info_file}" ]] || fail "release-info.txt missing or empty: ${info_file}"
}

print_summary() {
  local commit_sha="$1"
  local source_archive="$2"
  local docker_archive="$3"
  local env_backup="$4"
  local info_file="$5"

  local source_size docker_size env_size info_size
  source_size="$(stat -c '%s' "${source_archive}")"
  docker_size="$(stat -c '%s' "${docker_archive}")"
  env_size="$(stat -c '%s' "${env_backup}")"
  info_size="$(stat -c '%s' "${info_file}")"

  printf '\n=== Release Backup Summary ===\n'
  printf 'Release Version: %s\n' "${VERSION}"
  printf 'Commit: %s\n' "${commit_sha}"
  printf 'Backup Directory: %s\n' "${RELEASE_DIR}"
  printf 'Files:\n'
  printf '  - %s (%s bytes)\n' "$(basename "${source_archive}")" "${source_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${docker_archive}")" "${docker_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${env_backup}")" "${env_size}"
  printf '  - %s (%s bytes)\n' "$(basename "${info_file}")" "${info_size}"
  printf 'Status: successful\n'
}

main() {
  validate_args "$@"
  validate_version

  require_command git
  require_command tar
  require_command docker
  require_command stat
  require_command hostname
  require_command date

  require_path_exists "${PROJECT_ROOT}"
  require_path_exists "${ENV_FILE}"
  require_path_exists "${BACKUP_BASE_DIR}"

  [[ -d "${PROJECT_ROOT}" ]] || fail "Project root is not a directory: ${PROJECT_ROOT}"
  [[ -f "${ENV_FILE}" ]] || fail "Missing env file: ${ENV_FILE}"
  ensure_writable "${BACKUP_BASE_DIR}"

  docker image inspect "${DOCKER_IMAGE}" >/dev/null 2>&1 || fail "Docker image not found: ${DOCKER_IMAGE}"

  ensure_git_clean
  ensure_remote_reachable

  local commit_sha branch timestamp image_id host_value
  commit_sha="$(git -C "${PROJECT_ROOT}" rev-parse HEAD)"
  branch="$(git -C "${PROJECT_ROOT}" rev-parse --abbrev-ref HEAD)"
  timestamp="$(date '+%Y-%m-%d_%H-%M-%S')"
  image_id="$(docker image inspect --format '{{.Id}}' "${DOCKER_IMAGE}")"
  host_value="$(hostname)"

  ensure_tag_state "${commit_sha}"

  if [[ "${DRY_RUN}" -eq 0 ]]; then
    ensure_writable "${PROJECT_ROOT}/.git"
  fi

  create_or_verify_tag "${commit_sha}"
  build_release_dir "${timestamp}"

  local source_archive docker_archive env_backup info_file
  source_archive="${RELEASE_DIR}/varnito-source-${VERSION}.tar.gz"
  docker_archive="${RELEASE_DIR}/varnito-docker-${VERSION}.tar"
  env_backup="${RELEASE_DIR}/.env.production-${VERSION}"
  info_file="${RELEASE_DIR}/release-info.txt"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "[DRY-RUN] Would create source archive: ${source_archive}"
    log "[DRY-RUN] Would create docker archive: ${docker_archive}"
    log "[DRY-RUN] Would copy env file to: ${env_backup}"
    log "[DRY-RUN] Would create release info file: ${info_file}"
    log "Dry-run completed successfully. No tags, pushes, archives, or files were created."
    return
  fi

  log "Creating source archive..."
  tar -czf "${source_archive}" -C /opt anfragepilot

  log "Creating docker image archive..."
  docker save -o "${docker_archive}" "${DOCKER_IMAGE}"

  log "Copying production environment file..."
  cp -- "${ENV_FILE}" "${env_backup}"

  log "Writing release metadata..."
  write_release_info "${info_file}" "${VERSION}" "${timestamp}" "${commit_sha}" "${branch}" "${image_id}" "${host_value}"

  chmod 600 "${source_archive}" "${docker_archive}" "${env_backup}" "${info_file}"
  chmod 700 "${RELEASE_DIR}"

  log "Validating backup integrity..."
  validate_backup_outputs "${source_archive}" "${docker_archive}" "${env_backup}" "${info_file}"

  print_summary "${commit_sha}" "${source_archive}" "${docker_archive}" "${env_backup}" "${info_file}"
}

main "$@"
