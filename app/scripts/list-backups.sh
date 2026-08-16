#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_BASE_DIR="${VARNITO_BACKUP_BASE_DIR:-/home/varnitoadmin/backups/releases}"

if [[ ! -d "${BACKUP_BASE_DIR}" ]]; then
  printf '[INFO] No backups directory found: %s\n' "${BACKUP_BASE_DIR}"
  exit 0
fi

printf 'Release backups under %s\n' "${BACKUP_BASE_DIR}"
printf '%-25s %-20s %-12s %-8s %-8s %-15s\n' "VERSION" "DATE" "GIT SHA" "DB" "DOCKER" "DIRECTORY"

for release_dir in $(find "${BACKUP_BASE_DIR}" -maxdepth 1 -mindepth 1 -type d | sort -r); do
  dir_name="$(basename "${release_dir}")"
  version="${dir_name%%-*}"
  suffix="${dir_name#*-}"
  date_value="${suffix#*-}"
  if [[ "${version}" == "${dir_name}" ]]; then
    version="unknown"
    date_value="unknown"
  fi

  info_file="${release_dir}/release-info.txt"
  commit_sha="unknown"
  db_status="missing"
  docker_status="missing"

  if [[ -f "${info_file}" ]]; then
    commit_sha="$(grep '^Git Commit SHA:' "${info_file}" | cut -d' ' -f4- || echo unknown)"
  fi

  db_glob=("${release_dir}"/varnito-database-*.dump)
  docker_glob=("${release_dir}"/varnito-docker-*.tar)

  if (( ${#db_glob[@]} > 0 )) && [[ -e "${db_glob[0]}" ]]; then
    db_status="present"
  fi

  if (( ${#docker_glob[@]} > 0 )) && [[ -e "${docker_glob[0]}" ]]; then
    docker_status="present"
  fi

  printf '%-25s %-20s %-12s %-8s %-8s %-15s\n' "${version}" "${date_value}" "${commit_sha}" "${db_status}" "${docker_status}" "${dir_name}"
done

printf '\nLegend: DB/DOCKER = present | missing\n'
printf 'Legacy partial backups are shown as missing DB if no database dump exists.\n'
