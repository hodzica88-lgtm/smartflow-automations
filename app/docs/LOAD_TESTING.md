# Varnito Lasttests

Dieses Runbook beschreibt kontrollierte Lasttests fuer Lead-Erstellung und Queue-Schreiblast.

## Sicherheitsmodell

Der Test-Endpunkt ist nur erreichbar, wenn auf der getesteten Instanz gesetzt ist:

```env
LOAD_TEST_ENABLED=true
```

Zusaetzlich ist bei jedem Request der bestehende Header `x-internal-api-secret` erforderlich.

Wenn `LOAD_TEST_ENABLED` nicht exakt `true` ist, antwortet der Endpunkt mit HTTP 404.

Test-Leads erhalten eine eindeutige Source im Format:

```text
load_test:<RUN_ID>
```

`RUN_ID` ist im k6-Skript verpflichtend. Dadurch koennen Ergebnisse eindeutig geprueft und anschliessend gezielt geloescht werden.

Wenn `INCLUDE_QUEUE=true` verwendet wird, werden pro Lead zwei Queue-Eintraege erstellt. Diese werden absichtlich direkt mit Status `cancelled` gespeichert. Der produktive Notification Worker verarbeitet sie daher nicht und es werden weder Brevo-E-Mails noch Push-Nachrichten versendet.

## Voraussetzungen

- k6 ist auf dem Rechner installiert, von dem der Test gestartet wird.
- Eine eigene Testfirma ist vorhanden.
- Die Zielinstanz ist erreichbar.
- `LOAD_TEST_ENABLED=true` wurde nur fuer das geplante Testfenster gesetzt.
- `INTERNAL_API_SECRET` und die Company UUID sind bekannt.
- Auf dem Lastgenerator werden CPU und RAM ebenfalls beobachtet, damit nicht der Testrechner zum Engpass wird.

Keine Tests gegen eine Kundenfirma ausfuehren.

## Reihenfolge

Die Stufen werden immer einzeln und in dieser Reihenfolge ausgefuehrt:

1. Smoke-Test mit einer Anfrage
2. 100 nahezu gleichzeitige Anfragen
3. Ergebnisse pruefen und Testdaten loeschen
4. 500 nahezu gleichzeitige Anfragen
5. Ergebnisse pruefen und Testdaten loeschen
6. 1000 nahezu gleichzeitige Anfragen
7. Ergebnisse pruefen und Testdaten loeschen

Eine hoehere Stufe wird nur gestartet, wenn die vorherige Stufe stabil war und Anwendung, VPS, Datenbank sowie Queue wieder im Normalzustand sind.

## PowerShell: Grundeinstellungen

Im Ordner `app`:

```powershell
$env:BASE_URL="https://test.example.com"
$env:COMPANY_ID="00000000-0000-4000-8000-000000000000"
$env:INTERNAL_API_SECRET="<INTERNAL_API_SECRET>"
$env:INCLUDE_QUEUE="false"
```

## Smoke-Test

```powershell
$env:PROFILE="smoke"
$env:RUN_ID="smoke-001"
k6 run .\load-tests\leads.js
```

Vor der ersten Laststufe muss dieser Test exakt einen Lead mit HTTP 201 erzeugen.

## 100 gleichzeitige Leads

```powershell
$env:PROFILE="100"
$env:RUN_ID="leads-100-001"
$env:INCLUDE_QUEUE="false"
k6 run .\load-tests\leads.js
```

## 500 gleichzeitige Leads plus Queue-Schreiblast

```powershell
$env:PROFILE="500"
$env:RUN_ID="queue-500-001"
$env:INCLUDE_QUEUE="true"
k6 run .\load-tests\leads.js
```

## 1000 gleichzeitige Leads plus Queue-Schreiblast

```powershell
$env:PROFILE="1000"
$env:RUN_ID="queue-1000-001"
$env:INCLUDE_QUEUE="true"
k6 run .\load-tests\leads.js
```

## Profile

- `smoke`: 1 virtueller Nutzer, 1 Anfrage
- `100`: 100 virtuelle Nutzer, jeweils 1 Anfrage
- `500`: 500 virtuelle Nutzer, jeweils 1 Anfrage
- `1000`: 1000 virtuelle Nutzer, jeweils 1 Anfrage

Die Profile verwenden `per-vu-iterations`. Jeder virtuelle Nutzer sendet genau eine Anfrage. Dadurch wird die definierte Anzahl Anfragen mit maximaler Parallelitaet dieser Stufe erzeugt. Ein Start im exakt gleichen Millisekundenzeitpunkt ist technisch nicht garantiert; k6 startet die virtuellen Nutzer jedoch so nah wie moeglich beieinander.

## Erfolgskriterien

Das k6-Skript erwartet:

- weniger als 1 Prozent fehlgeschlagene HTTP-Requests
- mehr als 99 Prozent erfolgreiche Lead-Erstellungen
- p95 unter 1500 ms
- p99 unter 3000 ms

Diese Grenzwerte sind Startwerte. Nach dem Baseline-Test werden sie anhand der realen VPS- und Supabase-Leistung bewertet.

## Ergebnisinterpretation

Die Zusammenfassung trennt zwei Ergebnisse:

- `Functional result`: bewertet, ob die erwarteten Leads ohne Fehler erstellt wurden.
- `Threshold result`: bewertet die konfigurierten Fehler- und Antwortzeitgrenzen.

Ein funktionales `PASS` mit einem Threshold-`FAIL` bedeutet: Es gab keinen Datenverlust, aber mindestens ein Performance-Ziel wurde verfehlt. Eine hoehere Laststufe darf dann erst nach Analyse oder einem bestaetigenden Wiederholungstest gestartet werden.

k6 beendet den Prozess bei einem verletzten Threshold mit einem Fehlercode. Das ist beabsichtigt und darf nicht mit einem Anwendungsabsturz verwechselt werden. Containerzustand, Datenbankzaehlung und Logs muessen trotzdem separat geprueft werden.

## Waehrend des Tests beobachten

- VPS CPU und RAM
- Container CPU, RAM und Restart-Zahl
- CPU und RAM des k6-Testrechners
- HTTP-Fehler und Antwortzeiten
- Supabase Datenbankauslastung und Verbindungen
- Anzahl neu erstellter Leads
- bei `INCLUDE_QUEUE=true`: exakt zwei Queue-Zeilen pro Lead
- Healthcheck vor und nach dem Test

## Verifikation in Supabase

`RUN_ID` ersetzen:

```sql
select count(*) as lead_count
from public.leads
where source = 'load_test:RUN_ID';
```

```sql
select q.status, q.notification_type, count(*) as row_count
from public.notification_queue q
join public.leads l
  on l.id = q.lead_id
 and l.company_id = q.company_id
where l.source = 'load_test:RUN_ID'
group by q.status, q.notification_type
order by q.status, q.notification_type;
```

Bei einem Queue-Test muss jeder Eintrag den Status `cancelled` haben. Erwartet werden pro erfolgreichem Lead genau ein Eintrag fuer `owner_new_lead` und ein Eintrag fuer `customer_confirmation`.

## Cleanup

Durch das Loeschen der Test-Leads werden zugehoerige Queue-Zeilen wegen `ON DELETE CASCADE` ebenfalls entfernt.

Vorher Anzahl kontrollieren:

```sql
select count(*)
from public.leads
where source = 'load_test:RUN_ID';
```

Danach gezielt loeschen:

```sql
delete from public.leads
where source = 'load_test:RUN_ID';
```

Nach dem Loeschen muss die Kontrollabfrage den Wert `0` liefern.

## Abbruchkriterien

Den laufenden Test abbrechen und keine hoehere Stufe starten, wenn einer dieser Punkte eintritt:

- deutlich steigende Fehlerrate
- Container-Neustart
- Healthcheck meldet einen Fehler
- VPS beginnt zu swappen oder RAM ist nahezu voll
- Datenbankverbindungen erreichen das Limit
- p99 steigt dauerhaft ueber 10 Sekunden
- Queue-Zeilen werden entgegen der Erwartung nicht als `cancelled` angelegt

## Nach dem Test zwingend

`LOAD_TEST_ENABLED` wieder auf `false` setzen oder aus der Produktionsumgebung entfernen und die Anwendung neu starten beziehungsweise neu deployen.

Danach pruefen:

1. Der Test-Endpunkt antwortet ohne Aktivierung wieder mit HTTP 404.
2. Der normale Healthcheck ist erfolgreich.
3. Es sind keine Test-Leads der verwendeten `RUN_ID` mehr vorhanden.
4. Es befinden sich keine Testeintraege im Status `pending` oder `processing`.

## Noch nicht Bestandteil dieses Tests

Dieser erste sichere Test misst:

- Next.js API-Durchsatz
- Service-Role-Verbindungen
- Lead-Inserts
- Firmen-Lookups
- Queue-Inserts und Indizes
- VPS-, Docker- und Supabase-Verhalten

Brevo- und Push-Durchsatz sowie die echte Worker-Verarbeitung werden anschliessend in einem separaten, kontrollierten Test getestet. Externe Anbieter sollen nicht unkontrolliert mit 1000 Nachrichten belastet werden.
