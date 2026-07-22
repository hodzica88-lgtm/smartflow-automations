# Backup-Restore-Test vom 23. Juli 2026

## Ziel

Der Test sollte praktisch nachweisen, dass das automatische Varnito-Backup nicht nur erstellt und von Restic geprueft wird, sondern in einer vollstaendig isolierten Supabase-Testumgebung wiederhergestellt werden kann.

Der Test durfte zu keinem Zeitpunkt:

- die Produktionsdatenbank veraendern,
- Produktions-Secrets verwenden,
- echte E-Mails oder Push-Nachrichten ausloesen,
- Produktionspfade in den Teststack einbinden,
- nach Abschluss Testcontainer oder Testdaten zuruecklassen.

## Ausgangslage

Verwendet wurde der neueste verfuegbare Restic-Snapshot:

- Snapshot-ID: `8468613e`
- Snapshot-Zeitpunkt: 22. Juli 2026, 04:23 Uhr CEST
- Restic-Repository: lokales verschluesseltes Repository auf dem Varnito-VPS
- Quelldatenbank: PostgreSQL 17.6

Aus dem Snapshot wurden isoliert wiederhergestellt:

| Datei | Groesse | Zeilen | SHA-256 |
|---|---:|---:|---|
| `roles.sql` | 297 Bytes | 13 | `25873cec56a2cc6514e204f420231777f85c03da818caa7090cdcdfa89776ecd` |
| `schema.sql` | 45.900 Bytes | 1.425 | `7bab55ad668578eff61d8518be303da7a86efa65fe0d77622c2468fc8a0702dd` |
| `data.sql` | 36.969 Bytes | 444 | `f36e90cc3f06492ce8b640c0c67c9843a7767b2e6d7ae660c494f3d1484d098f` |

Alle drei Dateien waren nicht leer und nur fuer `root` lesbar. Die wiederhergestellten Verzeichnisse hatten restriktive Rechte.

## Testumgebung

Der erfolgreiche Endtest verwendete einen vollstaendigen lokalen Supabase-Stack statt nur eines PostgreSQL-Containers.

Verwendete Versionen:

- Supabase CLI 2.109.1
- PostgreSQL 17.6
- `public.ecr.aws/supabase/postgres:17.6.1.143`
- GoTrue/Auth `v2.192.0`
- Storage API `v1.62.5`
- PostgREST `v14.14`

Der Teststack:

- war nicht mit dem produktiven Supabase-Projekt verknuepft,
- verwendete keine Produktions-`.env`,
- verwendete keine Produktions-Secrets,
- hatte keine Mounts aus `/opt/anfragepilot`,
- wurde nach Abschluss inklusive Volumes entfernt.

Vor dem Datenimport wurde der externe Zugriff auf den veroeffentlichten Test-Datenbankport ueber die Docker-Firewallkette blockiert. Die interne Kommunikation zwischen den Testdiensten blieb aktiv.

## Erkenntnisse aus den Vorpruefungen

Mehrere isolierte Vorpruefungen fanden wichtige Supabase-spezifische Anforderungen:

1. Die reservierten Rollen `anon`, `authenticated` und `authenticator` koennen im verwendeten Supabase-Image nicht durch den normalen Benutzer `postgres` veraendert werden.
2. Schema-Operationen koennen wegen des Supabase-Eigentuemermodells ebenfalls Superuser-Rechte erfordern.
3. Ein einzelner Supabase-PostgreSQL-Container besitzt noch nicht alle durch Auth und Storage angelegten internen Tabellen.
4. Erst der vollstaendige Supabase-Stack erzeugte ein vollstaendig kompatibles Auth- und Storage-Zielschema.

Der abschliessende Kompatibilitaetsscan ergab:

- Auth-/Storage-COPY-Bloecke: 27
- fehlende Zieltabellen: 0
- Bloecke mit fehlenden Zielspalten: 0

Die Backup-Dateien wurden fuer den erfolgreichen Endtest nicht manuell veraendert oder um interne Supabase-Daten bereinigt.

## Wiederherstellungsablauf

Der bestandene Ablauf war:

1. Aktuellsten Restic-Snapshot in ein isoliertes Verzeichnis wiederherstellen.
2. `roles.sql`, `schema.sql` und `data.sql` auf Existenz, Groesse und Hash pruefen.
3. Vollstaendigen lokalen Supabase-Stack mit PostgreSQL-Hauptversion 17 starten.
4. Warten, bis Auth- und Storage-Migrationen abgeschlossen sind.
5. Externen Zugriff auf den Test-Datenbankport sperren.
6. Rollen, Schema und Daten als `supabase_admin` in einer Transaktion einspielen.
7. Fuer den Datenimport `session_replication_role = replica` setzen und danach wieder auf `origin` zuruecksetzen.
8. COPY-Zeilenzahlen, Tabellen, Extensions, Fremdschluessel und Zugriff als `postgres` pruefen.
9. Produktionscontainer kontrollieren.
10. Teststack, Volumes, temporaere CLI und wiederhergestellte SQL-Dateien entfernen.

Durch `ON_ERROR_STOP=1` und `--single-transaction` wurde der Restore bei einem Fehler vollstaendig abgebrochen und zurueckgerollt.

## Ergebnis des erfolgreichen Endtests

Der abschliessende Restore bestand vollstaendig:

- COPY-Bloecke: 39 von 39 erfolgreich
- Datenzeilen im Dump: 95
- Zeilenvergleich: alle 39 Tabellen exakt wie erwartet
- PostgreSQL-Zielversion: 17.6
- Public-Tabellen: 12
- Fremdschluessel: 47
- nicht validierte Fremdschluessel: 0
- verwaiste Datensaetze: 0
- Zugriff als normaler Benutzer `postgres`: erfolgreich
- Restore-Dauer: 47 Sekunden

Ausgewaehlte wiederhergestellte Datenmengen:

| Tabelle | Zeilen |
|---|---:|
| `auth.users` | 1 |
| `auth.identities` | 1 |
| `auth.sessions` | 3 |
| `auth.refresh_tokens` | 4 |
| `public.companies` | 2 |
| `public.company_inquiry_types` | 9 |
| `public.inquiry_rate_limits` | 6 |
| `public.lead_status_history` | 7 |
| `public.leads` | 20 |
| `public.notification_queue` | 36 |
| `public.push_subscriptions` | 1 |
| `public.settings` | 1 |
| `public.users` | 1 |

Vorhandene und erfolgreich gepruefte Erweiterungen:

- `pg_stat_statements` 1.11
- `pgcrypto` 1.3
- `supabase_vault` 0.3.1
- `uuid-ossp` 1.1

## Produktionszustand

Waehren des gesamten erfolgreichen Endtests blieb die Produktionsanwendung unveraendert:

- Container: `anfragepilot-app`
- Status: `running`
- Health: `healthy`
- Neustarts: 0

Nach dem Test wurden entfernt:

- lokaler Supabase-Teststack,
- Testcontainer,
- Testvolumes,
- temporaere Supabase CLI,
- isoliert wiederhergestellte SQL-Dateien.

## Nachgewiesener Schutz

Praktisch nachgewiesen ist:

> Der vorhandene Restic-Snapshot kann entschluesselt, als vollstaendiger Supabase-Datenbankstand wiederhergestellt und anhand aller 39 COPY-Bloecke sowie aller relevanten Fremdschluessel erfolgreich verifiziert werden, ohne die Produktion zu veraendern.

Damit ist nicht nur die Erstellung des Backups, sondern auch dessen technische Wiederherstellbarkeit bewiesen.

## Verbleibende Grenze: Offsite-Backup

Das Restic-Repository liegt derzeit auf demselben VPS wie die Produktionsanwendung.

Der aktuelle Schutz deckt insbesondere ab:

- versehentlich geloeschte Dateien,
- fehlerhafte Deployments,
- beschaedigte Konfigurationen,
- Wiederherstellung eines Datenbankstands aus dem vorhandenen VPS-Backup.

Nicht abgedeckt ist ein vollstaendiger Verlust oder eine vollstaendige Uebernahme des gesamten VPS einschliesslich des lokalen Restic-Repositories.

Ein verschluesseltes Offsite-Backup wird aus Kostengruenden bewusst erst nach den ersten zwei bis drei zahlenden Kunden eingerichtet. Diese Entscheidung ist dokumentiert und stellt aktuell ein akzeptiertes Restrisiko dar.

## Wiederholung des Tests

Der vollstaendige Restore-Test muss nicht bei jeder kleinen Aenderung wiederholt werden. Eine erneute Durchfuehrung ist sinnvoll:

- nach Aenderungen am Backup-Skript,
- nach einer wesentlichen Supabase-, Auth-, Storage- oder PostgreSQL-Aktualisierung,
- nach einer Aenderung des Backup-Ziels,
- nach einem echten Restore-Vorfall,
- ansonsten regelmaessig in einem angemessenen Intervall, zum Beispiel quartalsweise.

## Abschluss

Der Zuverlaessigkeitsblock `praktischer isolierter Backup-Restore` ist technisch abgeschlossen.

Status: **bestanden**.