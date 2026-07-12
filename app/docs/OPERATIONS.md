# Betrieb und Monitoring

Dieses Dokument beschreibt den minimalen Betriebsablauf fuer AnfragePilot in der aktuellen Phase.

## 1) Gesundheitsstatus der Anwendung pruefen

Interner Health-Endpunkt:
- GET /api/internal/health
- Header erforderlich: x-internal-api-secret mit dem Wert aus INTERNAL_API_SECRET

Beispiel lokal (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/internal/health" -Method Get -Headers @{ "x-internal-api-secret" = "<INTERNAL_API_SECRET>" }
```

Erwartung:
- HTTP 200: Anwendung laeuft, Datenbank erreichbar, keine festhaengenden processing-Queue-Eintraege.
- HTTP 503: Datenbankproblem oder processing-Queue-Eintraege aelter als 10 Minuten.

Die Antwort ist absichtlich kompakt und enthaelt nur Status plus Zaehlerwerte.

## 2) Fehlgeschlagene Benachrichtigungen pruefen

Im Dashboard gibt es einen Warnhinweis fuer fehlgeschlagene Benachrichtigungen der letzten 7 Tage.

Direkte Datenbankpruefung (SQL-Editor in Supabase):

```sql
select
  count(*) as failed_last_24h
from public.notification_queue
where status = 'failed'
  and updated_at >= now() - interval '24 hours';
```

Optional Detailansicht fuer Betrieb:

```sql
select
  notification_type,
  status,
  scheduled_for,
  last_attempt_at,
  error_message,
  updated_at
from public.notification_queue
where status = 'failed'
order by updated_at desc
limit 100;
```

## 3) Supabase Logs Explorer und Reports

Logs Explorer:
- API-Fehler, Auth-Fehler und Datenbankfehler zeitlich eingrenzen.
- Bei Stoerungen immer zuerst Zeitraum und betroffene Route festlegen.

Reports:
- Fehlerraten, Lastspitzen und Datenbankmetriken regelmaessig pruefen.
- Auf auffaellige Trends achten (mehr failed/procesing-Eintraege, steigende Latenz).

## 4) Worker-Betrieb (aktueller Stand)

Aktuell lokal/manuell:
- POST /api/internal/notifications/process mit x-internal-api-secret

Beispiel lokal (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/internal/notifications/process" -Method Post -Headers @{ "x-internal-api-secret" = "<INTERNAL_API_SECRET>" }
```

Produktionsautomation:
- Ein geplanter Job/Scheduler fuer den Worker ist noch offen und muss vor Go-Live eingerichtet werden.

## 5) Backup-Strategie

- Primar auf Supabase Managed Backups setzen.
- Fuer Produktion sollte Point-in-Time-Recovery (PITR) aktiviert werden, sobald der ausgewaehlte Plan dies unterstuetzt.
- Wichtig: Datenbank-Backups enthalten keine Supabase Storage-Objekte.

## 6) Monatlicher Restore-Test

Monatlich einmal in einer separaten Testumgebung:
1. Aktuellsten Backup-Stand wiederherstellen.
2. Kernfunktionen pruefen: Login, Lead-Listen, Lead-Detail, Queue-Zaehler.
3. Stichprobe auf Datenkonsistenz (Leads, lead_status_history, notification_queue).
4. Wiederherstellungsdauer und Auffaelligkeiten dokumentieren.
5. Nach dem Testumfeld wieder aufraeumen.

## 7) Secret-Rotation-Checkliste

Bei planmaessiger Rotation oder Verdacht auf Leak:
1. Betroffene Secrets identifizieren (z. B. INTERNAL_API_SECRET, BREVO_API_KEY, SUPABASE_SERVICE_ROLE_KEY).
2. Neue Werte im Secret-Store setzen.
3. Anwendung neu deployen/neu starten.
4. Health-Endpunkt pruefen.
5. Testbenachrichtigung ausloesen und Queue-Ergebnis kontrollieren.
6. Alte Secrets invalidieren/entfernen.
7. Rotation mit Datum und Verantwortlichem dokumentieren.

## 8) Vorgehen nach fehlgeschlagenem Deployment

1. Health-Endpunkt und Kernseiten pruefen.
2. Bei kritischen Fehlern auf letzten stabilen Stand zurueckrollen.
3. Danach Worker/Queue pruefen (pending, failed, stale processing).
4. Incident kurz dokumentieren: Ursache, Impact, Gegenmassnahme.

## 9) Vorgehen bei E-Mail-Ausfall

1. Health-Endpunkt und Queue-Zaehler pruefen.
2. notification_queue auf failed- und processing-Eintraege analysieren.
3. Brevo-Konfiguration (API-Key, Sender) und Erreichbarkeit pruefen.
4. Ursache beheben, danach Worker kontrolliert erneut ausfuehren.
5. Pruefen, ob failed-Rate wieder sinkt und keine stale processing-Eintraege bleiben.

## 10) Vorgehen bei Push-Benachrichtigungen

- Push ist ein zusaetzlicher Kanal fuer neue Leads; Brevo bleibt der E-Mail-Fallback.
- Ein Geraet muss im Dashboard explizit ueber den sichtbaren Aktivieren-Button registriert werden.
- Der Browser sollte beim ersten Seitenaufruf keine Berechtigung erhalten; das ist Absicht.
- Die Push-Konfiguration benoetigt `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` und `VAPID_SUBJECT`.

Pruefungen:
1. Im Dashboard Push auf dem Zielgeraet aktivieren.
2. Testbenachrichtigung senden und Verhalten im Browser kontrollieren.
3. Einen neuen Lead ausloesen und pruefen, ob E-Mail und Push parallel verarbeitet werden.
4. Bei 404/410 im Push-Transport die betroffene Subscription wird automatisch deaktiviert.
5. Bei wiederholten Fehlern die Subscription im Dashboard auf dem Geraet entfernen und neu aktivieren.
