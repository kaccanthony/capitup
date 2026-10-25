# Hosted Supabase development setup

## Current status

Phase 02 is implemented offline against a future hosted **development** Supabase project. No project is linked, no remote migration has been applied, and no credential is required for local formatting, linting, TypeScript, unit tests, or the credential-free production build.

Docker and the local Supabase stack are intentionally not part of this workflow.

## Tracked and untracked configuration

Tracked files contain key names and migration SQL only:

- `.env.example` contains empty placeholders.
- `supabase/migrations/20261024000100_phase_02_auth_membership.sql` is the reviewed source of truth for schema, functions, grants, and RLS.
- `supabase/config.toml` records the intended Before User Created hook URI for reproducibility.

Create `.env.local` only after a separate hosted development project exists:

```dotenv
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEVELOPMENT-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-DEVELOPMENT-PUBLISHABLE-KEY
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a compatibility fallback for older projects. Prefer the publishable key for new projects.

The application runtime does not require `SUPABASE_SERVICE_ROLE_KEY`. If a future server-only administrative adapter is explicitly approved, store that key only in `.env.local` or the hosting provider's server secret store. Never add a `NEXT_PUBLIC_` prefix.

## Manual hosted-project steps

Perform these steps only after the project owner explicitly authorizes remote development-project changes:

1. Create or select a Supabase project dedicated to development. Confirm that it is not production.
2. Review the Phase 02 migration and apply it through the approved migration workflow. Do not paste only selected policy fragments; the constraints, functions, grants, and RLS policies are one security boundary.
3. In **Authentication → Hooks**, configure the **Before User Created** Postgres hook as `public.before_user_created`.
4. In **Authentication → URL Configuration**, set the development Site URL and allow the exact callback URL `<development-origin>/auth/callback`.
5. Select and configure the institutional identity provider under O-001. The offline UI currently requests a passwordless email link, which remains a provider-neutral fallback until that decision is accepted.
6. Record the exact institutional domain/identity rules under O-002 before inserting identity-requirement rows or real invitations.
7. Configure Supabase Auth rate limits and the selected CAPTCHA provider/thresholds under O-025. The form accepts a future CAPTCHA token but no provider is enabled offline.
8. Bootstrap the first organization and `org_admin` invitation through a reviewed operator migration or one-time SQL change. Use the exact normalized full email and leave `created_by` null for this single bootstrap record. Do not authorize from a username or local-part match.
9. Sign in through `/login`. The Before User Created hook admits only a pending allowlist record; the callback then binds the membership to the immutable Supabase user ID.
10. Run the database/RLS test file against the isolated development project and record its results before considering Phase 02 database behavior verified.

## Required hosted verification

The following evidence cannot be produced by the offline pass:

- Migration application success and hosted schema inspection.
- Before User Created allowed and denied observations.
- Positive, disabled-member, role-escalation, and cross-organization RLS results using distinct authenticated sessions.
- Provider redirect, cookie refresh, magic-link delivery, and logout behavior against the hosted Auth service.
- Supabase rate-limit and CAPTCHA behavior after O-025 is resolved.
- Generated hosted database types. The checked-in `src/types/database.ts` is migration-derived and must be compared with `supabase gen types` after the migration is applied.

Never run database tests against production.
