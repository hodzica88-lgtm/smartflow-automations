# Release Backup

## Voraussetzungen

- Zugriff auf den Server mit den Pfaden:
  - `/opt/anfragepilot`
  - `/opt/anfragepilot/app/.env.production`
  - `/home/varnitoadmin/backups/releases`
- Docker-Image `anfragepilot-app:latest` ist lokal vorhanden.
- Git-Remote `origin` ist erreichbar.
- Git-Working-Tree in `/opt/anfragepilot` ist sauber.
- Shell-Werkzeuge vorhanden: `bash`, `git`, `tar`, `docker`, `stat`, `hostname`, `date`.

## Einmalige Einrichtung

1. Repository auf dem Server unter `/opt/anfragepilot` bereitstellen.
2. Backup-Basisordner anlegen, falls noch nicht vorhanden:
   - `mkdir -p /home/varnitoadmin/backups/releases`
3. Schreibrechte fuer den Benutzer `varnitoadmin` sicherstellen.

## Skript ausfuehrbar machen

```bash
chmod +x scripts/backup-release.sh
```

## Standard-Aufruf

```bash
bash scripts/backup-release.sh v1.1.0
```

## Beispiel

```bash
./scripts/backup-release.sh v1.1.0
```

## Dry-Run

```bash
./scripts/backup-release.sh --dry-run v1.1.0
```

Dry-Run fuehrt alle gefahrlosen Pruefungen aus und zeigt geplante Schritte an, erzeugt aber keine Tags, pusht nichts und schreibt keine Dateien.

Wenn serverseitige Ressourcen lokal nicht vorhanden sind (z. B. `/opt/anfragepilot`, Docker-Image oder `/home/varnitoadmin/backups/releases`), aktiviert das Skript automatisch einen klar gekennzeichneten Simulationsmodus. Die echte Ausfuehrung ohne `--dry-run` ueberspringt diese Pruefungen niemals.

## Was gesichert wird

- Quellcodearchiv: `varnito-source-<VERSION>.tar.gz` (Inhalt: `/opt/anfragepilot`)
- Docker-Archiv: `varnito-docker-<VERSION>.tar` (Inhalt: `anfragepilot-app:latest`)
- Produktions-Env-Kopie: `.env.production-<VERSION>`
- Metadaten: `release-info.txt`

## Wo Backups liegen

Backups werden unter folgendem Pfad erstellt:

- `/home/varnitoadmin/backups/releases/<VERSION>-<YYYY-MM-DD_HH-MM-SS>`

## Wie ein Release geprueft wird

Das Skript prueft unter anderem:

- gueltiges Versionsformat (`vMAJOR.MINOR.PATCH`)
- sauberen Git-Working-Tree
- Erreichbarkeit von `origin`
- Tag-Konsistenz lokal/remote
- Existenz von Projektpfad, Docker-Image und `.env.production`
- Integritaet der erzeugten Archive und Dateien

## Wie man Projektdateien wiederherstellt

```bash
cd /
tar -xzf /home/varnitoadmin/backups/releases/<RELEASE>/varnito-source-<VERSION>.tar.gz
```

## Wie man das Docker-Image wieder laedt

```bash
docker load -i /home/varnitoadmin/backups/releases/<RELEASE>/varnito-docker-<VERSION>.tar
```

## Wie man .env.production wiederherstellt

```bash
cp /home/varnitoadmin/backups/releases/<RELEASE>/.env.production-<VERSION> /opt/anfragepilot/app/.env.production
chmod 600 /opt/anfragepilot/app/.env.production
```

## Hinweis

Das Supabase-Datenbank-Backup ist aktuell nicht Teil dieses Skripts und muss separat erfolgen.

## Sicherheitswarnung

Der Backup-Ordner enthaelt Secrets und darf nicht veroeffentlicht oder zu Git hinzugefuegt werden.
