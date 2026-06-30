# SmartFlow Auth

## Purpose

This document defines the SmartFlow V1 authentication architecture. It is documentation only and does not implement authentication.

## Auth Provider

SmartFlow V1 uses Supabase Auth with email and password authentication.

Supabase Auth owns the authenticated identity. The application stores profile and company ownership data in public tables:

- `auth.users` stores the Supabase Auth identity.
- `public.users` stores the SmartFlow user profile.
- `public.companies` stores tenant ownership through `owner_user_id`.

## Login

Login uses email and password through Supabase Auth.

Expected flow:

1. User submits email and password.
2. Supabase validates credentials.
3. Supabase creates a session.
4. The app redirects the user to the protected application area.
5. Server-side route checks read the session before rendering protected pages.

Login errors should be generic and user-safe.

## Logout

Logout ends the Supabase session.

Expected flow:

1. User requests logout.
2. The app calls Supabase sign out.
3. Session cookies are cleared.
4. The user is redirected to the login page.

## Forgot Password

Forgot password uses Supabase password recovery.

Expected flow:

1. User submits their email address.
2. Supabase sends a password recovery email.
3. User follows the recovery link.
4. The app allows the user to set a new password.
5. The user returns to login or continues with a refreshed session, depending on Supabase recovery behavior.

Recovery screens should not reveal whether an email exists.

## Protected Routes

Protected application routes require a valid Supabase session.

Expected behavior:

- Public routes are available without a session.
- Protected routes redirect unauthenticated users to login.
- Server-side checks should happen before protected content renders.
- Middleware may refresh sessions and protect route groups later.

V1 protected routes should use simple ownership checks based on the authenticated user and their company.

## Session Handling

Sessions are managed with Supabase cookies using the App Router-compatible Supabase client helpers.

Expected responsibilities:

- Browser client handles client-side Supabase calls when needed.
- Server client reads the current session during server rendering and server actions.
- Middleware client can refresh cookies and enforce route access later.
- Service-role client is reserved for trusted server-only operations and must never be exposed to the browser.

## User Profile Creation

Every authenticated Supabase user should have one matching `public.users` row.

Expected flow:

1. Supabase creates a user in `auth.users`.
2. The application creates a matching `public.users` profile with the same UUID.
3. The profile stores email, display name, role, and default company reference.

Profile creation may happen through a trusted server action, API route, or database trigger in a later implementation sprint.

## Company Ownership

Each V1 company has one owner.

Expected flow:

1. New user completes onboarding.
2. The app creates a `companies` row.
3. `companies.owner_user_id` points to `public.users.id`.
4. The app creates related `settings` and `subscriptions` rows for that company.
5. `users.default_company_id` points to the owned company.

V1 does not include multi-user company membership. The schema keeps roles simple, but owner-scoped access is the primary V1 assumption.

## RLS Assumptions

RLS policies are not implemented yet, but the auth model assumes:

- `public.users.id` matches `auth.uid()`.
- A user can read and update their own profile.
- A company owner can access their own company.
- Company-scoped tables are accessible through `company_id`.
- Service-role operations are used only from trusted server code.
- Client-side queries must never bypass RLS.

RLS policies should be added in a dedicated sprint.

## Not Included In V1

V1 does not include:

- Social login
- Magic links
- MFA
- SSO
- Passkeys
- Organization invitations
- Multi-company membership
- Team role management
- Account deletion flows
- Admin impersonation
- Custom auth providers
