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

Wenn `INCLUDE_QUEUE=true` verwendet wird, werden pro Lead zwei Queue-Eintraege erstellt. Diese werden absichtlich direkt mit Status `cancelled` gespeichert. Der produktive Notification Worker verarbeitet sie daher nicht und es werden weder Brevo-E-Mails noch Push-Nachrichten versendet.

## Voraussetzungen

- k6 ist auf dem Rechner installiert, von dem der Test gestartet wird.
- Eine eigene Testfirma ist vorhanden.
- Die Zielinstanz ist erreichbar.
- `LOAD_TEST_ENABLED=true` wurde nur fuer das geplante Testfenster gesetzt.
- `INTERNAL_API_SECRET` und die Company UUID sind bekannt.

Keine Tests gegen eine Kundenfirma ausfuehren.

## PowerShell: 100 Leads

Im Ordner `app`:

```powershell
$env:BASE_URL="https://test.example.com"
$env:COMPANY_ID="00000000-0000-4000-8000-000000000000"
$env:INTERNAL_API_SECRET="<INTERNAL_API_SECRET>"
$env:PROFILE="100"
$env:RUN_ID="baseline-100"
$env:INCLUDE_QUEUE="false"
k6 run .\load-tests\leads.js
```

## PowerShell: 500 Leads plus Queue-Schreiblast

```powershell
$env:PROFILE="500"
$env:RUN_ID="queue-500"
$env:INCLUDE_QUEUE="true"
k6 run .\load-tests\leads.js
```

## PowerShell: 1000 Leads plus Queue-Schreiblast

```powershell
$env:PROFILE="1000"
$env:RUN_ID="queue-1000"
$env:INCLUDE_QUEUE="true"
k6 run .\load-tests\leads.js
```

## Profile

- `100`: 20 virtuelle Nutzer, 100 Requests
- `500`: 75 virtuelle Nutzer, 500 Requests
- `1000`: 150 virtuelle Nutzer, 1000 Requests

Die Profile verwenden `shared-iterations`. Damit wird eine exakt definierte Anzahl Leads erzeugt und gleichzeitig kontrollierte Parallelitaet aufgebaut.

## Erfolgskriterien

Das k6-Skript erwartet:

- weniger als 1 Prozent fehlgeschlagene HTTP-Requests
- mehr als 99 Prozent erfolgreiche Lead-Erstellungen
- p95 unter 1500 ms
- p99 unter 3000 ms

Diese Grenzwerte sind Startwerte. Nach dem Baseline-Test werden sie anhand der realen VPS- und Supabase-Leistung bewertet.

## Waehrend des Tests beobachten

- VPS CPU und RAM
- Container CPU, RAM und Restart-Zahl
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

Bei einem Queue-Test muss jeder Eintrag den Status `cancelled` haben.

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

## Nach dem Test zwingend

`LOAD_TEST_ENABLED` wieder auf `false` setzen oder aus der Produktionsumgebung entfernen und die Anwendung neu starten beziehungsweise neu deployen.

## Noch nicht Bestandteil dieses Tests

Dieser erste sichere Test misst:

- Next.js API-Durchsatz
- Service-Role-Verbindungen
- Lead-Inserts
- Firmen-Lookups
- Queue-Inserts und Indizes
- VPS-, Docker- und Supabase-Verhalten

Brevo- und Push-Durchsatz sowie die echte Worker-Verarbeitung werden anschliessend in einem separaten, kontrollierten Test getestet. Externe Anbieter sollen nicht unkontrolliert mit 1000 Nachrichten belastet werden.
