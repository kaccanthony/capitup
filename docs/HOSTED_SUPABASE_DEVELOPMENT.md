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

Collaborative snapshot finalization requires `SUPABASE_SERVICE_ROLE_KEY` in the Next.js server environment after the Phase 05 hardening migration is applied. Store it only in `.env.local` for an authorized development project or the hosting provider's server secret store. Never add a `NEXT_PUBLIC_` prefix, print it, or reuse the privileged client for ordinary reads/writes.

## Manual hosted-project steps

Perform these steps only after the project owner explicitly authorizes remote development-project changes:

1. Create or select a Supabase project dedicated to development. Confirm that it is not production.
2. Review the Phase 02 migration and apply it through the approved migration workflow. Do not paste only selected policy fragments; the constraints, functions, grants, and RLS policies are one security boundary.
3. In **Authentication → Hooks**, configure the **Before User Created** Postgres hook as `public.before_user_created`.
4. In **Authentication → URL Configuration**, set the development Site URL and allow the exact callback URL `<development-origin>/auth/callback`.
5. Configure Google OAuth and Microsoft Azure OAuth as the primary providers under A-021. Register the exact Supabase Auth callback URL in each provider console, then place the provider client ID and secret only in the Supabase Auth provider settings. Do not place provider secrets in `.env.local`, tracked files, browser variables, or application code. For Azure, restrict the tenant as appropriate and follow Supabase's email-verification guidance.
6. Enable email/password only as the deliberately disclosed fallback. Keep email confirmation enabled where the hosted project requires it, disable public self-registration, and do not enable passwordless email magic links. This path still depends on the exact allowlist/domain rule in O-002.
7. Record the exact institutional domain/identity rules under O-002 before inserting identity-requirement rows or real invitations.
8. Configure Supabase Auth rate limits and the selected CAPTCHA provider/thresholds under O-025. The form accepts a future CAPTCHA token but no provider is enabled offline.
9. Bootstrap the first organization and `org_admin` invitation through a reviewed operator migration or one-time SQL change. Use the exact normalized full email and leave `created_by` null for this single bootstrap record. Do not authorize from a username or local-part match.
10. Sign in through each selected provider using a synthetic, allowlisted identity. The Before User Created hook admits only a pending allowlist record; the callback then binds the membership to the immutable Supabase user ID.
11. Run the database/RLS test file against the isolated development project and record its results before considering Phase 02 database behavior verified.

## Required hosted verification

The following evidence cannot be produced by the offline pass:

- Migration application success and hosted schema inspection.
- Before User Created allowed and denied observations.
- Positive, disabled-member, role-escalation, and cross-organization RLS results using distinct authenticated sessions.
- Google, Microsoft Azure, and email/password fallback redirects or sign-in, cookie refresh, generic denial, and logout behavior against the hosted Auth service.
- Supabase rate-limit and CAPTCHA behavior after O-025 is resolved.
- Generated hosted database types. The checked-in `src/types/database.ts` is migration-derived and must be compared with `supabase gen types` after the migration is applied.

Never run database tests against production.
