# Analytics

## Design Goals
- Anonymous event tracking only.
- No storage of names, emails, phone numbers, addresses, or secrets.
- Fail-open behavior: telemetry failures do not block product flows.

## Data Model
- Migration: `supabase/migrations/0023_add_analytics_events.sql`
- Table: `public.analytics_events`
- Key fields:
  - `event_name`
  - `market` (`de`, `us`, `unknown`)
  - `company_id` (optional)
  - `is_authenticated`
  - `metadata` (sanitized)
  - `occurred_at`

## Feature Flag
- `ANALYTICS_EVENTS_ENABLED=true|false`
- Configured in `src/shared/config/env.ts`

## Events Instrumented
- Landing and demo entry
- Login success and forgot-password request
- Billing checkout start and portal open
- Public inquiry and manual lead creation
- Lead export request
- Team invite lifecycle events

## Operator Visibility
- Operator dashboard includes DE/US event summaries for 7/30 day windows.
