# Varnito – Technische Produktionsabnahme

**Datum:** 2026-10-13 (Europe/Berlin)  
**Produktiver Anwendungscode:** `7bc61df14060bec5a977be17620a873f86bc33c2` (PR #32)  
**Abnahmeergebnis:** 16/16 ausgeführte Abschlusschecks bestanden; keine beobachteten Produktionsfehler.

## Erfolgreich nachgewiesen

- **P0:** Atomare Erstellung von Lead und zwei Notification-Queue-Aufträgen; produktive Datenbankfunktion vorhanden.
- **P1:** Migration `0035_add_public_inquiry_idempotency.sql`, Tabelle, RPC und Unique-Constraint in der Produktionsdatenbank vorhanden. SQL-Replaytest auf Produktionsdatenbank: erster Aufruf `duplicate=false`, zweiter mit identischem Schlüssel `duplicate=true`, dieselbe Lead-ID, exakt zwei Queue-Aufträge. Test lief in einer Transaktion mit abschließendem `ROLLBACK`, ohne persistierte Test-Leads oder Queue-Einträge.
- **Release:** Alle vier Container (`anfragepilot-app` und `-2`, `-3`, `-4`) mit demselben Image `sha256:426bc04d3b59f85743f42f963ec62bbf83f074cfc8cee8dbfee5afaf6479b197`, `healthy`, je null Restarts.
- **DE/US:** `https://varnito.de/api/health` und `https://varnito.com/api/health` antworteten `{"status":"ok"}`.
- **Reverse Proxy:** Caddy aktiv; Konfiguration erfolgreich validiert. Eine rein stilistische Formatierungswarnung wurde ausgegeben.
- **Notification-Worker:** Wiederholte erfolgreiche Läufe, in den eingesehenen Ausgaben `failed:0`; zum Zeitpunkt der Prüfung keine fälligen Benachrichtigungen zu verarbeiten.
- **Monitoring:** Wiederholte erfolgreiche Prüfungen etwa alle 15 Minuten.
- **Backup:** Verschlüsseltes Backup vom 2026-10-13 erfolgreich; Integritätskontrolle ohne Fehler. `restic`, `pg_restore`, `psql` vorhanden.
- **Rollback-Vorbereitung:** Image `anfragepilot-app:rollback-pre-p1` mit ID `sha256:d3d72b852d8bcd0fcfadadbcad794911f6cdae3902fd28e1813a56385f2102d7` vorhanden. Aktuelles Release-Image und alle drei benötigten Compose-Dateien vorhanden.
- **Gesamtabnahme:** Release-Datei, beide Images, vier Container, zwei Domain-Health-Checks, Caddy-Dienst und -Validierung, drei systemd-Services sowie drei Compose-Dateien: **16 PASS, 0 FAIL**.

## Grenzen der Abnahme / offen dokumentierte zusätzliche Nachweise

Die Betriebsabnahme ist **bestanden**, jedoch ist dies keine Behauptung vollständig getesteter Disaster-Recovery-Szenarien. Folgende ergänzende Nachweise wurden am 2026-10-13 **nicht ausgeführt**:

1. Aktueller isolierter Restore-Durchlauf aus dem jüngsten Backup. Ein früherer isolierter Restore-Test vom 2026-07-23 ist in `app/docs/BACKUP_RESTORE_TEST_2026-07-23.md` dokumentiert.
2. Simultane parallele Anfragen mit identischem Idempotenzschlüssel gegen eine Test-/QA-Datenbank; ein serieller Replaytest wurde erfolgreich auf Produktion innerhalb einer Rollback-Transaktion durchgeführt.
3. Tatsächlicher Vier-Container-Rollback und erneuter Vorwärts-Rollout. Nur die Verfügbarkeit der nötigen Images/Konfigurationen wurde überprüft.

Ein absichtlich ausgelöster Produktionsalarm wurde ebenfalls nicht getestet; reguläre Monitoringläufe waren erfolgreich.

## Freigabeumfang

Die **technische Abnahme des bestehenden produktiven P0/P1-Releases und der geprüften Betriebsbereitschaft ist abgeschlossen**. Offene zusätzliche Testnachweise werden nicht als erledigt markiert. Dieser Commit ist **nur Dokumentation** und erfordert kein erneutes Produktionsdeployment.
