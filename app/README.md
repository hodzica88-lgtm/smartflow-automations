# AnfragePilot App

## Setup

Im Ordner `app` arbeiten und von dort aus alle Befehle ausführen.

1. Abhängigkeiten installieren.
2. `.env.example` nach `.env.local` kopieren.
3. Platzhalter in `.env.local` mit echten Werten ersetzen.
4. Secrets niemals committen.
5. Entwicklungsserver mit `pnpm dev` starten.

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

## Wichtige Umgebungsvariablen

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_API_SECRET`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Qualität prüfen

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Benachrichtigungen

- Normale Benachrichtigungen laufen direkt über Brevo.
- Push ist ein zusaetzlicher Kanal fuer neue Leads und ersetzt E-Mail nicht.
- Push wird erst nach sichtbarer Aktivierung im Dashboard auf dem jeweiligen Geraet genutzt.
- Der Browser fragt die Berechtigung nie ungefragt beim ersten Aufruf ab.
- Make wird nicht mehr für die normale Benachrichtigungszustellung verwendet.
- Der Worker-Endpunkt ist `POST /api/internal/notifications/process`.
- Der Worker verlangt den Header `x-internal-api-secret` mit dem Wert aus `INTERNAL_API_SECRET`.
- In der lokalen Entwicklung muss der Worker aktuell manuell ausgelöst werden.

Push-Setup:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` im Client setzen.
- `VAPID_PRIVATE_KEY` und `VAPID_SUBJECT` nur serverseitig hinterlegen.
- Im Dashboard unter Einstellungen das Geraet aktivieren und einen Test senden.

Beispiel lokal:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/internal/notifications/process" -Method Post -Headers @{ "x-internal-api-secret" = "<INTERNAL_API_SECRET>" }
```

## Datenbank

- Supabase-Migrationen müssen in numerischer Reihenfolge bis einschließlich `0007` angewendet werden.

## Aktueller Stand

- Die Produktionsbereitstellung ist noch offen.
- Die automatische Worker-Ausführung per Scheduler ist noch offen.

## Betrieb

- Betriebs- und Backup-Runbook: `docs/OPERATIONS.md`
