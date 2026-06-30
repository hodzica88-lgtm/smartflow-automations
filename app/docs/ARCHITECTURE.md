# SmartFlow Architecture

## Purpose

This app is the new SmartFlow foundation for the US version. It is intentionally small, modular, and ready for provider integrations without adding SDKs before they are needed.

## Application Shape

- `src/app` contains Next.js App Router routes, layouts, metadata, and route-level styles.
- `src/entities` contains shared business entities and domain types.
- `src/features` contains product workflows and use cases.
- `src/widgets` contains composed interface sections assembled from features and shared UI.
- `src/shared` contains cross-cutting configuration, integrations, UI primitives, and utilities.

## Boundaries

Provider-specific code belongs in `src/shared/integrations`. Product workflows should depend on small local adapters rather than importing provider SDKs directly.

Environment access is centralized in `src/shared/config/env.ts` so runtime configuration has one source of truth.

## Frontend Principles

- Build mobile-first.
- Keep route files thin.
- Keep reusable UI in `src/shared/ui`.
- Keep feature behavior close to the feature that owns it.
- Add dependencies only when they support an implemented capability.
