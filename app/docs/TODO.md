# SmartFlow TODO

## Foundation

- Install dependencies and commit the generated lockfile.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` before the first feature sprint.
- Add CI checks for linting, type checking, and production builds.

## Integrations

- Add Supabase client factories when authentication or persistence is implemented.
- Add Stripe helpers when billing is implemented.
- Add Brevo messaging helpers when email flows are implemented.
- Add Make.com webhook dispatchers when automation handoffs are implemented.

## Product

- Define the first US workflow module under `src/features`.
- Add domain types under `src/entities` as real workflows are introduced.
- Extract reusable interface primitives into `src/shared/ui` only after repeated use appears.
