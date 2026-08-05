# LEGAL_LAUNCH_CHECKLIST

## Noch fehlende echte Unternehmensdaten

- vollständige ladungsfähige Adresse von Hodzic Digital Services - Almir Hodzic
- Telefon- oder gleichwertiger Kontaktkanal
- Handelsregister- und Registernummer, falls vorhanden
- Umsatzsteuer-ID, falls vorhanden
- finaler Rechts-/Kontakt-E-Mail-Kanal
- finale Host-/Auftragsverarbeiter-Benennung in der Datenschutzerklärung

## Einzusetzende Rechtstext-Prüfung

- vor Livegang juristische Prüfung durch spezialisierten Rechtstext-Anbieter oder Rechtsberatung
- Abgleich von AGB, Datenschutz, Impressum und Widerruf mit dem finalen Geschäftsmodell
- Prüfung, ob B2B-only wirklich durchgesetzt ist oder Verbraucherzugang möglich bleibt

## Verwendete Drittanbieter

- Supabase: Auth, Datenbank, RLS, Serverzugriff
- Stripe: Checkout, Billing, Abonnementverwaltung
- Brevo: transaktionale E-Mails
- Next.js Hosting/Deployment: produktive Plattform noch separat bestätigen

## Cookie-/Tracking-Status

- keine Marketing- oder Analyse-Tools im aktuellen Code erkennbar
- keine Einwilligungsbanner-Logik nötig, solange nur technisch notwendige Session-/Auth-Cookies verwendet werden
- Cookie-Policy nur erneut prüfen, falls später Tracking oder Marketing-Dienste ergänzt werden

## Offene manuelle Prüfungen vor Livegang

- Rechtstexte final anwaltlich prüfen
- echte Firmen- und Kontaktdaten einsetzen
- Datenschutzerklärung gegen den finalen Datenfluss abgleichen
- AGB- und Widerrufsbedarf für das reale Angebot abschließend bewerten
- Vertragsabschluss-Checkbox und Protokollierung fachlich/rechtlich abnehmen
