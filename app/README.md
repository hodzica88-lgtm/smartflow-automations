# SmartFlow App

New SmartFlow application foundation built with Next.js, strict TypeScript, ESLint, and the App Router.

## Getting Started

1. Copy `.env.example` to `.env.local`.
2. Fill in provider values as each integration is enabled.
3. Install dependencies.
4. Start the development server.

```bash
pnpm install
pnpm dev
```

## Architecture

- `src/app` - App Router pages, layouts, metadata, and route-level styles.
- `src/entities` - Shared business entities and domain types.
- `src/features` - Product workflows and use cases.
- `src/shared` - Configuration, provider adapters, UI primitives, and utilities.
- `src/widgets` - Composed interface sections assembled from features and shared UI.

Provider SDKs are intentionally not installed yet. Integration boundaries are prepared in `src/shared/integrations` so Supabase, Stripe, Brevo, and Make.com can be added without reshaping the app.
