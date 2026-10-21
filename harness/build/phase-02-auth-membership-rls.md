# Phase 2 — Authentication, membership, and RLS

## Objective

Implement invitation-only authentication and the trusted authorization foundation for organizations, memberships, multi-role assignments, temporal project assignments, security events, and database/API isolation.

## Dependencies

- Phases 0–1 complete.
- O-001, O-002, O-006, and O-025 resolved.
- A separately authorized development Supabase environment and placeholder-to-local configuration process; no production changes are implied.

## In-scope work

- Supabase SSR clients/session handling and the accepted institutional sign-in flow.
- Invitation/allowlist records, membership claiming, active/suspended/expired status, validity windows, and Before User Created hook.
- Organization roles supporting more than one role per member, plus temporal project assignments with assigner/revocation evidence.
- Initial organization/project access tables needed to prove policy boundaries, without Phase 3 caption business behavior.
- Default-deny RLS and trusted SQL/server helpers for membership, role, assignment, and organization/project scoping.
- Membership/access administration appropriate to `org_admin` without automatic editorial authority.
- Generic errors, auth rate limiting/CAPTCHA integration as decided, audited cooldown/security events, and admin unblock path.
- Positive/negative authorization tests and protected route handling.

## Explicit non-goals

- No public signup, username-only membership, or globally triggerable five-attempt account lockout.
- No caption drafting/version schema beyond minimal authorization fixtures.
- No approval workflow, collaboration rooms, AI, Notion, email provider unless explicitly required by the accepted auth flow, deployment, or production roster import.
- No role data stored in user-editable metadata and no UI-only enforcement.

## Expected files and components

- Supabase migrations for identity/membership/role/assignment/security-event tables, constraints, functions, triggers, indexes, and RLS.
- Before User Created hook/Edge Function or supported hook configuration.
- `src/lib/supabase/`, server-only auth/session helpers, and centralized authorization domain modules.
- Auth callback/route handlers and login/access-denied UI integration.
- Membership administration forms/actions constrained by accepted policy.
- Seeded synthetic persona fixtures and database/RLS integration tests.
- Unit tests for normalization, permission evaluation, validity/revocation, and generic error behavior.

## Security considerations

- Compare normalized verified full email or immutable provider subject; never username alone.
- Bind an allowlist claim once to the immutable Supabase user ID and handle collision/reclaim administratively.
- Default-deny RLS every exposed table and cover every operation separately.
- Validate client claims at server boundaries and re-check active membership/assignments at action time.
- `org_admin` access administration must not imply approval rights.
- Auth errors must not reveal membership, and cooldown logic must resist denial-of-service against another member.
- Treat service-role use as exceptional, server-only, narrowly scoped, and auditable.

## Acceptance criteria

- An invited active identity can authenticate and claim only its intended membership.
- Unknown, uninvited, suspended, expired, and wrong-domain identities receive generic denial.
- A member cannot claim another invitation or modify roles/assignments without authority.
- Cross-organization reads/writes fail at the database boundary.
- An executive without a relevant assignment is read-only; a current matching assignment grants only specified project actions; expiry/revocation removes them.
- Multiple organization roles are represented without collapsing authorization to the displayed primary title.
- All exposed Phase 2 tables have reviewed RLS and tested allowed/denied operations.
- Security-relevant membership/role/assignment and cooldown changes create audit/security events.

## Tests and verification commands

After inspecting actual scripts/configuration:

```powershell
{supabase-cli} db reset
{pm} run test -- auth permissions
{pm} run test:integration -- rls membership assignments
{pm} run test:e2e -- authentication authorization
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Run the RLS matrix with Junior Officer A/B, Publicity Director, PRO, unassigned Executive, assigned Executive/Project Head, suspended user, expired assignment, and a separate organization. Exercise direct database/API requests, not only hidden controls.

## Evidence that must be recorded

- Accepted identity/domain/cooldown decisions and test-environment configuration (never secret values).
- Migration identifiers, tables with RLS enabled, policy/function inventory, and reviewer notes.
- Persona-by-operation matrix with allowed and denied outcomes.
- Before User Created hook results and generic-error observations.
- Direct-request cross-organization denial and assignment expiry/revocation evidence.
- Exact commands/results, files changed, and any manual/provider checks still required.

## Stop condition

Stop when the authorization foundation passes positive and negative tests in the authorized development environment. Do not create caption features, approval workflow, collaboration, AI, Notion synchronization, deploy, commit, or push.

