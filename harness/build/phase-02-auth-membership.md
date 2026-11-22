# Phase 02 — Authentication and Organization Membership

## Status and authority

This file began as planning material. The user subsequently authorized the credential-free offline implementation on 2026-10-24 under A-015. That implementation is complete in the repository, but hosted configuration, migration application, Auth-hook execution, and database/RLS verification remain pending and unauthorized. This file does not authorize credentials, remote project changes, deployment, commits, or pushes.

This plan is intentionally narrower than the older `phase-02-auth-membership-rls.md`: project assignments and project authorization are excluded by the current request. The older file remains historical planning material and must not be combined with this plan during implementation. Permanent phase numbering is still unresolved in O-028.

## Objective

Establish an invitation-only Supabase authentication and organization-membership boundary for CapItUp. An authenticated person receives application access only when a verified institutional email or another explicitly approved immutable identity matches a current allowlist invitation and is bound to that person's immutable Supabase user ID.

The phase must provide organization records, organization-facing profiles, membership status, organization roles, authentication security controls, protected routes, append-only authentication audit evidence, database constraints, and default-deny RLS. It must not grant membership from a matching username or expose service-role credentials to browser code.

## Dependencies and entry gates

Implementation must not start until all of the following are satisfied:

- Phase 01 remains complete and its fixture-only application shell is the starting point.
- O-028 resolves the permanent phase sequence and identifies this file as the active Phase 02 plan.
- O-002 records the exact approved institutional domain or domains, email normalization rules, and exception process.
- O-006 resolves whether a person may hold multiple simultaneous organization roles and how a primary display title is chosen. Authorization must still use every current role, not the display title.
- O-025 selects CAPTCHA/rate-limit controls, thresholds, risk signals, cooldown behavior, and the administrative unblock procedure.
- A non-production Supabase development environment is explicitly authorized. Local Supabase is currently unverified because no supported container runtime is available; planning does not authorize substituting a hosted project.
- Callback origins, redirect allowlists, and the development environment's secret-handling process are documented without recording secret values.
- O-023 need not block non-production schema work, but authentication/security-event retention and audit access must be resolved before production data or a pilot.

## Exact scope

### In scope

- Supabase Auth session handling for Google OAuth, Microsoft Azure OAuth, and the deliberately disclosed institutional email/password fallback accepted in A-021. Passwordless email magic links are excluded.
- Public self-registration disabled, with a Before User Created hook or an equivalently trusted Supabase control that checks the active allowlist before creating an account.
- Verification against the full normalized institutional email or an explicitly approved immutable provider subject. A username or the portion before `@` is display data only.
- Invitation and allowlist creation, expiration, revocation, one-time claim, replay rejection, and atomic binding to `auth.users.id`.
- Organizations, organization-facing user profiles, organization memberships, organization role assignments, account/membership status, and validity windows.
- The exact organization roles `junior_officer`, `publicity_director`, `pro`, `executive`, and `org_admin`.
- Membership administration by active `org_admin` members without conferring editorial approval authority.
- Default-deny RLS, table privileges, constraints, indexes, trusted SQL functions, and server-side authorization helpers for every Phase 02 table and operation.
- Protected App Router pages, Route Handlers, and Server Actions. Next.js `proxy.ts` may perform session refresh and optimistic redirects, but it is never the authorization boundary.
- Generic client-facing authentication and access-denied responses that do not disclose whether an identity, domain, invitation, or membership exists.
- Provider protections, CAPTCHA, progressive throttling, and abuse-resistant cooldowns as accepted in O-025.
- Append-only authentication, allowlist, membership, role, status, and administrative-recovery audit events.
- Positive and negative unit, database/RLS, direct-request, and browser tests using synthetic identities only.

### Explicit non-goals

- No public signup or membership based on a matching username.
- No project tables, project assignments, project-scoped permissions, or special executive assignment behavior. Phase 02 therefore treats every executive as read-only; a later authorized phase may add project assignments.
- No caption, taxonomy, drafting, version, approval, comment, reaction, notification, realtime, AI, Notion, storage, or deployment work.
- No general user directory, social profile, avatar upload, or profile customization beyond the minimum organization-facing fields required for membership administration and the application shell.
- No authorization roles in `user_metadata`, other user-editable claims, client state, or hidden-button logic.
- No custom global five-attempt lockout keyed only by username or email.
- No production roster import, real member data, real credentials, hosted project mutation, Vercel connection, or deployment without a separate explicit authorization.
- No Postman collection or standalone public API contract. Phase 02 uses Next.js server boundaries and Supabase policies; reusable API artifacts may be added only if an actual external API surface is later requested.

## Authorization model within this phase

Application access requires all three conditions:

1. A valid Supabase Auth session whose verified identity is the one bound during invitation claim.
2. A current organization membership with `status = active` and a validity window containing the current database time.
3. Authorization for the requested operation through RLS and a trusted server-side policy check.

Roles refine organization administration but never replace active membership. Within this phase:

| Role | Phase 02 access |
|---|---|
| `junior_officer` | Enter the protected shell and read their own membership/profile data. No membership administration. |
| `publicity_director` | Same authentication/membership access as an ordinary active member. No Phase 02 editorial behavior and no membership administration by title alone. |
| `pro` | Same authentication/membership access as an ordinary active member. No Phase 02 editorial behavior and no membership administration by title alone. |
| `executive` | Read-only access to permitted Phase 02 views. No insert, update, delete, invitation, role, or status action. |
| `org_admin` | Manage allowlist invitations, membership status, and organization roles through trusted server operations. This does not grant editorial authority. |

The CapItUp account-access status is the organization membership status. Phase 02 must not introduce a second, conflicting application-level account-status source on `profiles`. Supabase Auth provider state remains provider-owned.

## Proposed schema

Names below are the proposed logical contract. Migration identifiers and physical details must be reviewed during implementation.

### Types

- `organization_role`: `junior_officer`, `publicity_director`, `pro`, `executive`, `org_admin`.
- `organization_membership_status`: `invited`, `active`, `suspended`, `expired`, matching the product specification.
- `allowlist_entry_status`: `pending`, `claimed`, `revoked`, `expired`.
- Authentication/security event types should use a constrained catalog rather than unrestricted client text.

### Tables

#### `organizations`

- `id uuid` primary key.
- `slug text` unique, normalized, and immutable after use in routing.
- `display_name text` required.
- `created_at timestamptz` required.
- No browser-direct insert or delete.

#### `organization_identity_requirements`

- `id uuid` primary key and `organization_id uuid` foreign key.
- Accepted Google, Microsoft Azure, or email/password provider identifier and its verified claim type under A-021.
- Approved normalized email domain or another accepted identity rule selected by O-002.
- `enabled boolean`, creation/update timestamps, and responsible administrator.
- A unique constraint prevents duplicate active rules for the same organization/provider/claim combination.
- No passwords, OAuth tokens, raw magic-link tokens, or service keys.

#### `profiles`

- `user_id uuid` primary key referencing `auth.users.id`.
- Minimum organization-facing display name and optional admin-verified institutional identifier if O-002 approves it.
- Creation/update timestamps.
- No role, membership status, allowlist status, secret, or authorization claim.
- User-editable display fields, if any, must be explicitly allowlisted and must not influence authorization.

#### `member_allowlist`

- `id uuid` primary key and `organization_id uuid` foreign key.
- Exact normalized institutional email and/or provider plus immutable provider subject, according to A-021 and O-002.
- `status allowlist_entry_status`, invitation issue/expiry/claim/revocation timestamps, and inviter/revoker IDs.
- A cryptographic digest of any one-time invitation token; never the raw token.
- `claimed_by_user_id uuid` nullable until claim, then bound immutably to `auth.users.id`.
- Constraints require an accepted identity, prevent claims after expiry/revocation, and prevent one identity from holding multiple current allowlist entries in the same organization.

#### `organization_memberships`

- `id uuid` primary key, `organization_id uuid` foreign key, and `allowlist_entry_id uuid` foreign key.
- `user_id uuid` nullable only while `status = invited`; once claimed, it is bound to `auth.users.id` and cannot be reassigned by an ordinary actor.
- The accepted normalized identity copied from the invitation for durable evidence.
- `status organization_membership_status`, `valid_from`, and nullable `valid_until`.
- Invited, activated, suspended, restored, and expired timestamps plus responsible actor IDs and constrained reason fields where applicable.
- Unique current membership per organization and Supabase user; an allowlist entry may activate at most one membership.

#### `organization_role_assignments`

- `id uuid` primary key and `membership_id uuid` foreign key.
- `role organization_role`.
- Grant, start, end, and revocation timestamps; grantor/revoker IDs; and a bounded administrative reason.
- A partial uniqueness rule prevents duplicate simultaneous active rows for the same membership and role.
- The normalized table supports the eventual O-006 outcome without reducing authorization to a single display title.

#### `access_security_events`

- `id uuid` primary key, timestamp, constrained event type, and outcome.
- Nullable organization, actor-user, subject-user, membership, allowlist-entry, and role-assignment references as appropriate.
- Stable reason code and request correlation ID; structured metadata is schema-validated and allowlisted.
- If O-025 requires network/device evidence, retain only the minimum approved hash or risk classification and apply the O-023 retention rule.
- Never store passwords, session tokens, invitation tokens, OAuth codes, CAPTCHA responses, service credentials, or unrestricted request bodies.
- Rows are append-only to application actors; update/delete are denied.

### Trusted database operations

Implementation should prefer narrow transactional functions over browser-direct table mutation:

- Claim an invitation by deriving `auth.uid()` and verified provider claims from the trusted session, comparing them with the unexpired allowlist entry, binding the user, activating membership, and recording the event atomically.
- Create/revoke allowlist entries and suspend/restore/expire memberships only after checking current active `org_admin` authority in the target organization.
- Grant/revoke organization roles only after the same organization-scoped `org_admin` check.
- Write security events from reviewed functions or isolated server-only code.
- Use database time for validity checks. Security-definer functions must set a fixed safe `search_path`, qualify referenced objects, reject caller-supplied actor IDs, and expose only the minimum execute grants.

Normalization must follow the accepted O-002 algorithm. The implementation must not silently invent alias folding, Unicode handling, plus-address behavior, or cross-domain equivalence.

## Authentication and invitation flow

1. An active `org_admin` creates an allowlist invitation through a trusted server operation.
2. The operation validates the exact approved identity, stores only a token digest if a token is used, sets an expiry, and records an audit event.
3. The selected Supabase provider verifies the identity. Public self-registration remains disabled.
4. The Before User Created hook checks an active, unexpired allowlist entry using the accepted normalized full email or immutable provider subject. It returns a generic denial when the check fails.
5. The callback validates OAuth state/PKCE as applicable, rejects unsafe redirect targets, exchanges the provider result, and establishes secure Supabase session cookies.
6. A transactional claim operation derives the current Supabase user and verified identity, consumes the invitation once, binds the membership, creates the minimum profile if absent, assigns only the approved initial role or roles, and records the result.
7. Every protected data access rechecks the current membership status/window. A stale browser session does not preserve CapItUp access after suspension or expiry.

The initial-role source and who selects it must be recorded when O-006 is resolved; it must not come from client-editable metadata.

## Protected application routes

- `/login` remains available without an application membership and exposes only generic responses.
- The authentication callback is public only for completing the selected provider flow; it validates state and redirect destinations and does not itself grant membership.
- Existing application routes `/`, `/projects`, `/captions`, `/calendar`, and `/archive` require a valid session and current active membership before returning private page data.
- Any membership-administration route requires current active `org_admin` membership in the target organization. Its final path is an implementation detail to document when created.
- Authenticated people with invited, suspended, or expired membership receive a generic restricted-access experience and no private organization data.
- Route Handlers and Server Actions repeat authorization at their own boundary. RLS remains the final database boundary.
- `src/proxy.ts` may refresh Supabase cookies and perform fast redirects. It must exclude static assets correctly and must not perform the only membership/role check, because Next.js 16 documents Proxy as an optimistic routing layer rather than a full authorization solution.
- Shared server data-access functions return minimal DTOs and check authorization close to the data source. A protected layout alone is insufficient because layouts may not re-run on every navigation.

## RLS policy matrix

All listed application tables have RLS enabled. Direct browser table privileges default to none; any allowed path below must be backed by an explicit policy and column-safe projection.

| Table | Anonymous | Active non-admin member | Active `executive` | Active same-org `org_admin` | Direct writes |
|---|---|---|---|---|---|
| `organizations` | Deny | Select own organization only | Select own organization only | Select own organization only | Deny; trusted operation only if organization maintenance is later required |
| `organization_identity_requirements` | Deny | Deny | Deny | Select same-organization non-secret rules | Insert/update/delete denied directly; trusted operation only |
| `profiles` | Deny | Select own minimum profile | Select own minimum profile | Select minimum profiles for same-organization membership administration | Direct insert/delete denied; any self display-field update uses a constrained trusted operation |
| `member_allowlist` | Deny | Deny | Deny | Select same-organization invitation metadata | Insert/update/delete denied directly; invite/revoke functions only |
| `organization_memberships` | Deny | Select own row | Select own row | Select same-organization rows | Insert/update/delete denied directly; claim/status functions only |
| `organization_role_assignments` | Deny | Select own current assignments | Select own current assignments | Select same-organization assignments | Insert/update/delete denied directly; grant/revoke functions only |
| `access_security_events` | Deny | Deny | Deny | Deny by default until O-023 defines audit access | Insert through reviewed trusted functions; update/delete always denied |

Additional policy requirements:

- Every policy checks `auth.uid()` against a current active membership and its validity window; no policy trusts client-supplied organization, actor, status, or role claims.
- Cross-organization rows are denied even when IDs are guessed.
- `org_admin` policies grant access administration only. They do not imply editorial roles.
- An executive has no write policy in this phase.
- Membership claim is the only pre-active transition and must match the session's verified full identity and unconsumed invitation inside one transaction.
- RLS helpers must avoid policy recursion and user-controlled `search_path` resolution.
- The service-role key may bypass RLS only in isolated `server-only` modules or provider hooks. It must never use a `NEXT_PUBLIC_*` variable, be serialized into React props, appear in logs, or be imported by client code.

## Login protection and generic errors

- Prioritize Google and Microsoft OAuth. Reveal the institutional email/password fallback only after an explicit lower-page user action, and protect it with the same or stronger O-025 abuse controls.
- Enable Supabase Auth's applicable provider rate limits and the accepted O-025 CAPTCHA control.
- Use progressive cooldowns and the accepted IP/device-risk plus identifier scope. Never globally disable a legitimate identity because another person repeatedly submits its username or email.
- Hash identifiers used for abuse correlation with a server-held secret and retain them only as long as O-023 permits.
- Return the same client-facing result for unknown, unapproved-domain, uninvited, revoked-invitation, suspended, and expired identities where doing otherwise would permit enumeration.
- Keep detailed internal reason codes in audit evidence, not in redirects, query strings, client logs, analytics, or form copy.
- Apply CSRF protection to state-changing auth/admin operations and state/PKCE protection to OAuth callbacks as applicable.
- Permit an authorized administrator to clear an O-025 security block through a separately audited trusted operation.

## Authentication audit events

At minimum, record the following when the provider or application can observe them reliably:

- Invitation created, reissued, expired, revoked, claim succeeded, claim denied, and replay denied.
- User creation allowed or denied by the Before User Created hook.
- Authentication callback succeeded or failed by generic reason category.
- Membership activated, suspended, restored, or expired.
- Organization role granted, ended, or revoked.
- Rate-limit/CAPTCHA challenge applied, cooldown applied/expired, and administrative unblock performed.
- Protected access denied because the session or current membership was invalid.

Each event identifies the organization, actor when known, subject/target, action, outcome, timestamp, and correlation ID. Provider-side failures unavailable to CapItUp must not be claimed as audited.

## Threat cases and required controls

| Threat case | Required control and proof |
|---|---|
| Same username at another domain attempts access | Match only the accepted normalized full email or immutable provider subject; negative claim and route tests. |
| Uninvited account on an otherwise approved domain | Active allowlist entry is still required; Before User Created and direct-request denial tests. |
| Stolen, expired, revoked, or replayed invitation | Short-lived one-time token, digest at rest, atomic consumption, state checks, and replay tests. |
| Client submits another user ID or role | Derive actor from `auth.uid()`, ignore client actor claims, constrain role values, and test self-escalation denial. |
| Cross-organization ID guessing | Organization-scoped RLS and distinct-session direct database tests. |
| Suspended/expired member reuses a valid session | Membership rechecked at the data source and RLS on every request; stale-session denial test. |
| Executive attempts a mutation | No executive write policy or trusted-operation authority; direct-request tests for every Phase 02 mutation. |
| Non-admin member invokes admin Server Action directly | Server boundary and database function both verify same-org active `org_admin`; forged-request denial test. |
| Account-enumeration through error text or timing | Generic results, bounded timing review, rate limits, and response-shape tests. |
| Attacker locks another person out | No username/email-only global counter; accepted risk-pair scoping and independent-identity tests. |
| OAuth callback tampering or open redirect | State/PKCE where applicable and exact redirect allowlist; invalid-state and unsafe-return-path tests. |
| Service-role credential reaches the browser | Separate server-only environment module, import-boundary tests, tracked-file scan, and client-bundle scan. |
| RLS helper bypasses policies | Fixed `search_path`, qualified names, least execute grants, function-definition review, and direct SQL tests. |
| Audit log leaks secrets or can be rewritten | Structured allowlisted fields, append-only policies, secret-redaction tests, and update/delete denial tests. |
| Compromised administrator abuses access | Same-org scope, reasons for sensitive changes, audit event, no editorial authority, and separate-organization denial tests. |

## Expected files and components

Exact filenames may be adjusted to existing conventions, but implementation is expected to touch only the following categories:

- `package.json` and `package-lock.json` for the minimum Supabase SSR/client libraries and the O-025 control chosen later; no dependency is selected by this plan.
- `.env.example` and the existing environment schemas for public Supabase URL/publishable key and server-only secrets. No values are committed.
- `supabase/migrations/*_auth_membership.sql` for types, tables, constraints, indexes, functions, grants, triggers, and RLS.
- `supabase/config.toml` only for reviewed non-secret Auth/hook configuration that remains portable.
- `src/lib/supabase/client.ts`, `server.ts`, and a separately isolated `server-only` privileged client only if the accepted hook/admin design requires one.
- `src/lib/auth/` for identity normalization, session verification, membership/role authorization, safe redirects, generic outcomes, DTOs, and Zod schemas.
- `src/proxy.ts` for cookie refresh and optimistic route redirects only.
- An Auth callback Route Handler and trusted Server Actions/Route Handlers for invitation, membership status, role administration, logout, and administrative unblock as selected by O-025.
- The existing `src/features/auth/login-shell.tsx` and `src/app/login/page.tsx` to replace fixture actions without changing the approved visual direction.
- Protected route composition for the existing application pages and a minimal restricted-access state.
- A minimal organization membership administration view for `org_admin`, only if required to exercise the acceptance criteria.
- Unit tests for normalization, identity matching, generic errors, authorization helpers, redirect validation, and event redaction.
- Database/RLS integration tests and synthetic persona fixtures.
- Browser tests for login, protected routes, restricted membership, logout, and admin/non-admin behavior.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `harness/build-log.md`, and `harness/HANDOFF.md` only to record accepted decisions, implemented behavior, and observed evidence during implementation.

## Security considerations

- Treat the browser, callback parameters, form data, invitation token, provider metadata, and claimed organization/role as untrusted.
- Validate every server input with the repository's schema library and derive identity/actor data from the verified Supabase session.
- Prefer publishable/anon client credentials protected by RLS. A service-role credential is exceptional and server-only.
- Set secure, HTTP-only, same-site cookies according to the selected Supabase SSR flow and deployment environment.
- Ensure all exposed Phase 02 tables have RLS and explicit grants before any application query is enabled.
- Keep identity normalization deterministic and covered by O-002 tests; do not infer equivalence from local parts, display names, or usernames.
- Keep authentication audit data minimal, structured, append-only, and retention-bound.
- Review database functions and callback/admin endpoints as public security boundaries even if the UI hides them.
- Use synthetic accounts and domains in automated tests. Never place real roster data, secrets, tokens, or provider responses in fixtures or evidence.

## Acceptance criteria

- A-021, O-002, O-006, O-025, and O-028 are reflected in code/tests without weakening this plan.
- Public self-registration is disabled, and user creation/claim requires a current allowlist invitation matching the verified full identity.
- A matching username alone, a same-domain but uninvited address, and a different-domain lookalike cannot create or claim membership.
- A valid invited identity can complete the accepted login flow, claim exactly its intended invitation once, and become bound to its immutable Supabase user ID.
- Invited, active, suspended, and expired membership states and validity windows behave as specified, including stale-session revocation of application access.
- Organization roles are constrained to the five approved values and represented separately from profiles, membership status, and future project assignments.
- Active `org_admin` members can perform only same-organization membership/role administration through trusted operations; other roles cannot.
- Every executive is read-only throughout Phase 02, including through direct table, RPC, Server Action, and Route Handler requests.
- Anonymous, inactive, non-admin, and cross-organization requests are denied at the database boundary, not merely hidden in the interface.
- Every exposed Phase 02 table has reviewed RLS for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, and the test matrix proves both allowed and denied outcomes.
- Existing private application routes reject missing or inactive membership; the callback/login routes reveal no membership-enumeration detail.
- Rate limiting, CAPTCHA, progressive cooldown, and administrative unblock match O-025 and cannot globally lock another person by username/email alone.
- Required authentication, membership, role, status, and recovery actions create append-only, secret-free audit events.
- The Supabase service-role key is absent from browser environment modules, client imports, rendered payloads, source maps/build output, tracked files, and logs.
- Formatting, linting, strict type checking, unit tests, database/RLS tests, browser tests, production build, and `git diff --check` complete with observed results recorded.
- No project assignment or later-phase product behavior is introduced.

## Authorization test plan

### Synthetic personas

- Anonymous visitor.
- Invited but unclaimed Junior Officer A.
- Active Junior Officer A in Organization A.
- Active Junior Officer B in Organization A.
- Active Publicity Director in Organization A.
- Active PRO in Organization A.
- Active Executive in Organization A with no project assignment.
- Active organization administrator in Organization A.
- Suspended member in Organization A.
- Expired member in Organization A.
- Active member and organization administrator in Organization B.
- Same-username identities at approved and unapproved domains.
- Same-domain identity with no allowlist entry.

No persona uses a real member identity.

### Positive tests

- A current invitation matching the selected provider's verified full identity passes the creation hook and can be claimed once.
- Claim atomically binds the current `auth.uid()`, activates the intended membership, creates the minimum profile, assigns only approved initial roles, and records audit events.
- An active member can enter protected routes and select only their own membership, profile, and current role data.
- An active same-organization `org_admin` can view invitation/member administration data and invoke trusted invite, suspend, restore, expire, role-grant, and role-revoke operations.
- An administrative security unblock succeeds only under the accepted O-025 policy and records actor, target, reason, and outcome.
- Session refresh preserves access for a still-active member without changing membership or role authority.

### Negative tests

- Anonymous access to every Phase 02 table, protected page, Route Handler, Server Action, and RPC is denied.
- A same-username different-domain identity and a same-domain uninvited identity are denied with the same generic public result.
- An invitation cannot be claimed with another verified email/subject, after expiry/revocation, or a second time.
- A caller cannot supply another `user_id`, `organization_id`, actor ID, membership status, or role to gain authority.
- Ordinary members, publicity directors, PROs, and executives cannot create invitations, change status, grant/revoke roles, or clear security blocks.
- An executive cannot insert, update, delete, or invoke any Phase 02 mutation even when calling the trusted endpoint directly.
- An Organization A administrator cannot read or mutate Organization B allowlist, membership, profile, role, identity-policy, or event data.
- A suspended or expired member with a still-valid Supabase session cannot access protected routes or organization rows.
- Direct insert/update/delete against protected tables fails even when the corresponding UI control is hidden.
- Audit events cannot be updated/deleted and reject secret-bearing or unrecognized metadata.
- Invalid OAuth state, unsafe return URLs, forged callback values, and CSRF attempts are rejected.
- Repeated attempts against another person's identifier do not globally disable that identity; accepted IP/device-risk scoping is enforced.
- Public responses do not distinguish unknown, uninvited, wrong-domain, suspended, or expired identities through message, code, redirect, or documented response shape.
- Client build output and browser requests contain no service-role key name/value or server-only auth secret.

## Tests and verification commands

The implementation must first inspect the actual scripts and add a stable database-test script for the selected isolated development environment. Planned commands are:

```powershell
rtk npm.cmd run format:check
rtk npm.cmd run lint
rtk npm.cmd run typecheck
rtk npm.cmd run test
rtk npm.cmd run test:db
rtk npm.cmd run test:e2e
rtk npm.cmd run build
rtk proxy git diff --check
```

`test:db` does not exist yet; adding it is Phase 02 implementation work. It must run the full RLS persona/operation matrix against a disposable local database or an explicitly authorized isolated hosted development database, never production. Any command that links, pushes to, resets, or mutates a hosted Supabase project requires separate explicit authorization and must record the exact target class without logging credentials.

Verification must also include:

- Inspection of migration SQL, grants, functions, triggers, indexes, and every RLS policy.
- Direct database/API requests using distinct anonymous and authenticated persona sessions; UI visibility is not proof.
- Before User Created hook observations for allowed and denied identities.
- Generic-error comparison and rate-limit/cooldown tests against the accepted O-025 thresholds.
- Tracked-file and production-client-bundle scans for service-role and other server-only key names/values.
- Browser checks at desktop, tablet, and mobile widths for login, restricted access, protected navigation, and keyboard/focus behavior.
- Provider-console checks that cannot be automated, clearly labeled as manual and non-production.

## Evidence that must be recorded

- Accepted A-021, O-002, O-006, O-025, and O-028 decisions and the non-production environment authorization, without secret values.
- Migration identifiers and schema inventory, including constraints, indexes, functions, grants, triggers, and RLS policies per table/operation.
- A persona-by-operation authorization matrix showing observed allowed and denied results, including cross-organization and executive mutation attempts.
- Before User Created, invitation claim/replay, suspension/expiry, callback-state, generic-error, and abuse-control observations.
- Audit-event samples with synthetic data proving creation, append-only behavior, correlation, and secret redaction.
- Protected-route, Server Action, Route Handler, RPC, and direct-table results.
- Client-bundle/tracked-file secret-scan results and confirmation that no service-role credential crossed the server boundary.
- Exact commands actually run, exit results, files changed and why, dependencies installed, migrations/RLS affected, known issues, blockers, and anything unverified in `harness/build-log.md` and `harness/HANDOFF.md`.

## Stop condition

Stop when the accepted identity flow, invitation claim, membership lifecycle, role administration, protected routes, authentication audit events, and RLS matrix pass all applicable positive and negative tests in the explicitly authorized non-production environment, and all observed evidence is recorded.

Do not begin project assignments, caption/business tables, realtime collaboration, AI, Notion integration, deployment, production data import, Phase 03, commit, or push.
