# SmartFlow Decisions

## 1. Use Next.js App Router

The app uses the App Router as the default routing and rendering model for the new foundation.

## 2. Use Strict TypeScript

Strict TypeScript is enabled from the start to keep domain and provider boundaries clear as the app grows.

## 3. Keep Provider SDKs Out Until Needed

Supabase, Stripe, Brevo, and Make.com are prepared through environment variables and integration folders, but SDKs are not installed yet. This avoids unused dependencies and keeps the foundation lean.

## 4. Centralize Environment Access

Environment variables are read through `src/shared/config/env.ts`. Feature code should consume typed configuration from there instead of reading `process.env` directly.

## 5. Preserve Clean Module Ownership

Shared utilities should stay generic. Business-specific behavior should live in `src/entities`, `src/features`, or `src/widgets` depending on ownership and reuse.
