# Release Backup and Restore Safety

## What gets backed up

Every release backup under `/home/varnitoadmin/backups/releases` contains:

- source archive: `varnito-source-<VERSION>.tar.gz`
- Docker image archive: `varnito-docker-<VERSION>.tar`
- production env snapshot: `.env.production-<VERSION>`
- PostgreSQL dump: `varnito-database-<VERSION>.dump`
- metadata: `release-info.txt`

The database backup is created with PostgreSQL-native tooling and uses the custom dump format (`pg_dump --format=c`). It is meant to capture the application database state needed for Varnito recovery without backing up platform internals.

## Weekly automatic backups

The existing weekly cron backup remains the normal unattended backup flow. It runs every Sunday at 00:00 and is compatible with the usual low-priority, low-I/O setup and `flock` guarding. The script does not wait for interactive input when used in automated mode.

## Manual backup rule

Manual release backups are only intended after real Varnito changes or releases.

```bash
bash scripts/backup-release.sh v1.2.0
```

Dry-run:

```bash
bash scripts/backup-release.sh --dry-run v1.2.0
```

A release is considered successful only if all required elements are created and validated.

## Backup listing

```bash
bash scripts/list-backups.sh
```

The listing shows newest-first entries, version, date, Git SHA, backup directory, database dump status, and Docker archive status. No secrets are printed.

## Restore dry-run

```bash
bash scripts/restore-release.sh --dry-run v1.2.0
```

This is the default verification method for any restore. It validates backup presence, archive integrity, Docker archive, environment file, database dump, and metadata without altering the current production state.

## Real restore

```bash
bash scripts/restore-release.sh v1.2.0
```

The script will:

1. resolve the latest matching release directory
2. verify required files exist
3. validate archives and metadata
4. create a mandatory pre-restore safety backup of the current production state
5. require explicit confirmation before a destructive restore
6. restore source files, `.env.production`, Docker image, and database dump
7. recreate the Varnito service using the existing Docker Compose setup
8. wait for the application healthcheck to pass
9. print a final summary

## Safety backup behavior

Before a real restore, the restore script always creates a dedicated safety backup directory named like:

- `safety-pre-restore-2026-08-16_03-22-14`

This protects the current production state and aborts the restore if the safety backup cannot be created.

## Database backup and restore behavior

The database backup is created with `pg_dump --format=c` and is validated with `pg_restore --list` without restoring it into production during backup validation.

A real restore requires a valid configured database target and does not print secrets. It only operates on the configured Varnito application database and stops immediately on database restore errors.

## Legacy backups

Older backups such as `v1.2.0` may be partial and may not include a database dump. Those should be treated as legacy/partial backups, not as full database-restorable backups.

The new restore tooling detects that condition clearly instead of crashing ambiguously.

## Important warnings

- release directories run with mode `700`
- secret files and database dumps use mode `600`
- backup directories are never committed to Git
- no passwords, service-role keys, or secrets are written to `release-info.txt`
- never run a real restore without confirming the target release and reviewing the backup status
