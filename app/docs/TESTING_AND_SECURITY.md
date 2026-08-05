# Testing And Security

## Lokale Testbefehle

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`

## GitHub Actions

- `CI`: führt bei jedem Push und Pull Request folgende Schritte aus:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm build`
- `E2E Playwright`: installiert Browser in CI und führt die End-to-End-Tests aus.
- `CodeQL`: statische Sicherheitsanalyse für `javascript-typescript`.

## Playwright

- Konfiguration: `playwright.config.ts`
- E2E-Tests: `tests/e2e/smoke.spec.ts`
- Abgedeckte Smoke-Flows:
  - Login-Seite lädt
  - `/dashboard` redirectet für Gäste auf `/login`
  - Öffentliche Anfrage-Seite lädt
  - `/dashboard/billing` ist geschützt
  - `/team/accept` lädt
  - `/api/internal/health` antwortet mit erwartetem Status/Schema

Wenn lokal keine Browser installiert werden können, bleibt die Konfiguration vollständig nutzbar und die Browser-Installation erfolgt in CI über `pnpm exec playwright install --with-deps chromium`.

## RLS- Und Mandantentests

- Integrationstests unter `src/features/security/` prüfen:
  - manipulierte Firmenzuordnung ohne Zugriff
  - Owner-Only-Aktionen gegen Mitarbeiter geschützt
  - Cross-Tenant Lead-Update/Read-Flow blockiert
  - interne API-Routen ohne Secret blockiert

## Stripe-Tests

- Unit-/Integrationstests unter `src/features/billing/` prüfen u. a.:
  - 30-Tage-Testphase beim ersten Checkout
  - keine zweite Testphase pro Firma
  - Statuslogik für `active`, `past_due`, `unpaid`, `canceled`
  - geplante Kündigung über `cancel_at` und `cancel_at_period_end`
  - Sperrung nach Ablaufdatum

## CodeQL

- Workflow: `.github/workflows/codeql.yml`
- Läuft auf Push, Pull Request und wöchentlich per Schedule.

## Dependabot

- Konfiguration: `.github/dependabot.yml`
- Aktualisiert wöchentlich:
  - npm/pnpm Abhängigkeiten
  - GitHub Actions

## Umgang Mit Secrets

- `.env`-Dateien sind über `.gitignore` geschützt.
- `.env.example` enthält ausschließlich Platzhalterwerte.
- Secrets (Stripe, Supabase, Brevo) werden ausschließlich über Umgebungsvariablen geladen.
- Keine Hardcoded-Produktionsschlüssel im Quellcode.