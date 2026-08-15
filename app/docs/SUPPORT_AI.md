# Varnito Support AI

## Architektur

Das Support-System ist bewusst schlank in die vorhandene Next.js-/Supabase-/Brevo-Architektur integriert:

- `src/features/support/types.ts`: zentrale Typen für Threads, Nachrichten, Kategorien und Klassifizierung
- `src/features/support/knowledge.ts`: kleine, wartbare Wissensbasis für sichere Bedienungsantworten
- `src/features/support/ai-service.ts`: strukturierte KI-Klassifizierung mit Sicherheits-Guardrails
- `src/features/support/service.ts`: Verarbeitung von Inbound-E-Mails, Duplicate-Protection, AI/Owner-Antworten und Verlauf
- `src/app/api/support/inbound/route.ts`: sicherer Webhook-/Inbound-Endpunkt für eingehende Support-Mails
- `src/app/operator/support/page.tsx` und `[threadId]/page.tsx`: Owner-Support Dashboard mit Thread-Liste und Detailansicht
- `supabase/migrations/0026_add_support_system.sql`: minimale Tabelle für Support-Threads und Support-Nachrichten

## ENV Variablen

Ergänzend zu den vorhandenen Brevo-/Supabase-Variablen werden folgende Variablen benötigt:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
SUPPORT_EMAIL=support@varnito.com
SUPPORT_FROM_NAME="Varnito Support"
SUPPORT_WEBHOOK_SECRET=replace-with-long-random-secret
```

Die Brevo-Konfiguration nutzt bereits vorhandene Werte:

```bash
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=info@varnito.de
BREVO_SENDER_NAME=Varnito
```

## Brevo Einrichtung

1. In Brevo eine neue Mailbox oder Transaktionsadresse für `support@varnito.com` erstellen.
2. Inbound-Webhook auf folgende URL eintragen:
   `https://<YOUR_DOMAIN>/api/support/inbound`
3. Secret im Header `x-support-secret` oder `x-varnito-support-secret` mit `SUPPORT_WEBHOOK_SECRET` setzen.
4. Die Mailbox muss die E-Mail-Adresse `support@varnito.com` als eingehende Adresse akzeptieren.
5. Wenn Brevo nur bestimmte Inbound-Events liefert, im jeweiligen Event-Konfigurationsbereich nur die relevanten E-Mail-Events aktivieren.

## OpenAI Einrichtung

1. OpenAI API-Key erzeugen.
2. Modell für sichere, begrenzte Klassifizierung wählen, z. B. `gpt-4o-mini`.
3. Das Modell dient ausschließlich für Klassifizierung/Empfehlung; echte Auto-Replies werden nur mit festen Regeln freigegeben.
4. Die Anwendung entscheidet anhand der definierten Sicherheitsregeln, ob eine Mail tatsächlich beantwortet werden darf.

## Datenbankmigration

Migration ausführen:

```bash
supabase db push
```

Oder die SQL-Datei lokal im Supabase-Projekt anwenden:

`supabase/migrations/0026_add_support_system.sql`

## Manueller Setup

- Support-Mailbox in Brevo konfigurieren
- Inbound-Webhook-URL mit Secret hinterlegen
- DNS/SMTP-/Mailbox-Konfiguration außerhalb des Codes prüfen
- E-Mail-Thread-Reply als Antwort auf die Mailbox zulassen
- Owner-Bereich mit Operator-User-Zugang freischalten

## Testanleitung

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Zusätzlich sind die gezielten Support-Tests in `src/features/support/service.test.ts` relevant.

## Eskalationsregeln

Eine Mail wird nur dann automatisch beantwortet, wenn alle folgenden Bedingungen erfüllt sind:

1. Kategorie ist ausdrücklich `general_usage`
2. kein kritisches Thema (Zahlung, Refund, Recht, Datenschutz, Konto-Löschung, Sicherheit, etc.)
3. KI-Konfidenz über dem Schwellenwert
4. Antwort stützt sich auf die Varnito-Wissensbasis
5. keine offensichtliche Beschwerde oder Eskalationslage

Im Zweifelsfall: `escalated`

## Production Checklist

- API-Key und Secret in der Produktionsumgebung gesetzt
- Brevo support@varnito.com Mailbox aktiv
- Inbound-Webhook erreichbar und signiert
- Rate-Limits/Loop-Schutz aktiviert
- Keine geheimen Werte in Logs oder Responses
- Support-Dashboard nur für Operator/Owner freigeschaltet
- Kein automatisches Ausführen von Konto-Aktionen aus Support-Mails
- Owner verweist bei Eskalationen manuell auf das Ticket
