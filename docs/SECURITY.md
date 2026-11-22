# CapItUp security plan

## Security objectives

CapItUp must protect private organization content, restrict action to current authorized members, preserve version and approval integrity, keep collaboration rooms private, and produce durable evidence for sensitive changes. Availability and recovery must not depend on optional AI or Notion integrations.

This is a planned control baseline. A control is not considered implemented until its phase records test evidence.

## Assets

- Verified identities, membership status, organization roles, and temporal project assignments.
- Drafts, immutable caption versions, comments, suggestions, deliverable links, and search indexes.
- Workflow templates/instances, formal decisions, overrides, final approved versions, and audit history.
- Collaboration documents, room membership, cursor/presence identity, and anchored threads.
- AI prompts, retrieved examples, style profiles, outputs, provenance, feedback, and quota records.
- Notion object links, sync state, webhook events, conflict/dead-letter records.
- Service-role, OpenAI, Liveblocks, Notion, webhook, OAuth, and encryption secrets.

## Threat actors and failure modes

- An unauthenticated visitor attempting discovery, signup, scraping, or endpoint abuse.
- An invited, expired, suspended, or removed member retaining access.
- A legitimate member attempting another organization/project's data or a capability beyond their role.
- A read-only executive attempting to comment, react, edit, submit, or decide without an authorized assignment.
- A client forging roles, workflow state, version IDs, room IDs, approval actors, or exception status.
- An attacker replaying or forging webhooks/OAuth callbacks.
- Prompt/retrieval leakage sending inaccessible private captions to an AI provider.
- Rich-text or integration content carrying script/HTML injection.
- Operational mistakes exposing secrets, destroying audit history, or making synchronized systems overwrite each other.

## Trust boundaries

Browser input, URLs, client state, provider room names, webhook bodies, Notion fields, AI output, and uploaded files are untrusted. Trusted decisions occur only in reviewed server modules, database constraints/functions, and RLS policies. Supabase service-role access bypasses RLS and must be narrowly isolated, never treated as a general application client.

## Phase 01 foundation controls

Phase 01 establishes security-enabling boundaries; it does not claim that later authentication, authorization, or data controls are implemented.

### Environment configuration

- Parse environment input through separate typed public and server schemas.
- Permit client exposure only for explicitly documented `NEXT_PUBLIC_*` keys. A shared client import must never contain or re-export server configuration.
- Mark future integration variables optional until their owning feature is enabled or adapter is instantiated. Once supplied, every value must pass its schema; an empty or malformed value is not silently accepted as a credential.
- Errors may name a missing or invalid key but must not include its value. Tests use synthetic values and must not snapshot secrets.
- `.env.example` contains the full documented key names with empty values only. `.env`, `.env.local`, environment-specific local files, and generated provider state remain ignored.
- A foundation build must succeed without real credentials. Supplying placeholder values must not cause network calls or imply that a service is configured.

### Local Supabase boundary

- Phase 01 uses the project-local CLI and disposable local containers only.
- Do not run `supabase link`, remote database pushes, hosted migration commands, or commands requiring a project reference or access token.
- Generated local API keys and database credentials may exist in process output or ignored local state; they must not be copied into tracked files, build logs, screenshots, or prompts.
- No business tables, real identities, Auth hooks, RLS business policies, Storage buckets, or production-like personal data belong in this phase.
- Verification must confirm that `supabase/.temp/project-ref` is absent. Lack of a local container runtime is a recorded blocker, not permission to substitute a hosted service.

### Tooling and shell controls

- Dependency changes must preserve `package-lock.json`, be limited to foundation needs, and report unresolved audit findings without applying an unreviewed breaking forced fix.
- Build, coverage, Playwright, environment, Supabase temporary, and local database artifacts remain ignored.
- The basic shell is unauthenticated demonstration structure only. It must not display private fixtures, claim authorization, or encode role checks that could be mistaken for enforcement.
- Verification includes environment-schema negative tests, a tracked-file secret scan, and inspection of built client output for server-only key names.

## Authentication and membership

- Use Supabase Auth with the identity-provider order specified by the product spec; the actual provider remains open.
- Keep public self-registration disabled.
- Before user creation, compare a normalized verified full email or immutable provider subject to the invitation/allowlist record.
- Bind the claimed membership to the immutable Supabase user ID. A matching username is never sufficient.
- Return generic authentication/access-denied responses that do not reveal allowlist membership.
- Re-check active/suspended/expired membership and validity windows for protected requests.
- Use provider protections, CAPTCHA, and progressive rate limits. Do not implement a global five-attempt username/email lockout that another person can trigger.
- If a high-confidence 24-hour block is used, scope it to an IP/device-risk plus identifier pair, audit it, and permit administrative clearance.

Identity provider, exact domain, CAPTCHA provider, account-cooldown thresholds, and session-lifetime details are unresolved decisions.

### Phase 03 offline project/content controls

Phase 03 extends the offline authorization design without claiming hosted database verification.

- All twelve new API-facing tables declare RLS. Authenticated browser roles receive explicit `SELECT` grants only; no direct table insert, update, or delete grant exists. The Phase 03 audit table has no browser read grant.
- Trusted functions derive the actor from `auth.uid()`, use a fixed empty `search_path`, validate same-organization/project foreign keys, and write allowlisted audit metadata. Server Actions reauthenticate through the server-only data layer because page visibility is not authorization.
- Project access requires active organization membership plus a current project assignment, except for same-organization publicity directors and organization administrators performing the narrow administration visibility defined by the plan.
- Project assignment values are a separate enum from organization roles. Assignment and responsibility functions accept only constrained enum values and validate the target membership/project relation.
- Viewers remain read-only. Organization administrators may administer access but receive no editorial capability from that role. Executives require a current head assignment to become actionable and still require explicit writer responsibility to edit an existing content record.
- Content records accept only the seeded content kinds and controlled tag slugs. Composite foreign keys reject invalid kind/tag combinations, while trusted functions reject arbitrary, duplicate, inactive, or empty tag selections atomically.
- Generic content metadata mutation cannot select workflow-owned statuses. Phase 03 creates drafts and exposes no approval or collaboration transition.
- Deliverable input is bounded to HTTP(S), rejects embedded URL credentials, and is rendered as an escaped external link. A-020 excludes attachments, Storage, and uploads.
- The special-case indicator requires a bounded reason, creates audit evidence when changed, and has no authority to suppress a length rule or create an exception.
- The only application service-role consumer is `src/lib/supabase/service-role.ts`, guarded by `server-only` and used solely by collaborative snapshot finalization after normal cookie-session authentication and write authorization. The browser/server request client continues to use only public Supabase configuration, and no secret value is logged or returned.

Offline unit/static tests cover cross-organization denial, viewers, organization/project-role separation, executive read-only behavior, controlled taxonomy, invalid tag combinations, unsafe links, direct-write grants, and server-only imports. `supabase/tests/projects_content_rls.test.sql` contains 18 synthetic runtime assertions, but those assertions remain pending until an isolated hosted development database is explicitly authorized.

### Phase 02 offline implementation state

The repository now contains the credential-free portion of this boundary. Nothing in this state proves that a hosted Supabase project is configured or that the migration executes against the provider's current schema.

- Every Phase 02 API table has RLS enabled. Browser roles receive only explicit organization-scoped or self-scoped `SELECT` policies; table `INSERT`, `UPDATE`, and `DELETE` remain denied.
- Allowlist claims and organization administration use narrow `security definer` functions with an empty fixed `search_path`, fully qualified objects, database-time validity checks, and explicit execute grants.
- Membership claims compare the verified session's normalized full email and bind the result to `auth.uid()`. Usernames, local parts, profile fields, and user-editable metadata do not grant access.
- Suspended and expired memberships fail both server policy classification and database active-membership predicates. A stale authenticated session is not sufficient for application access.
- Authentication audit rows are append-only from trusted functions and are not readable or writable by browser roles.
- Phase 02 browser and request clients use only the Supabase URL plus publishable/anonymous key. Phase 05 requires `SUPABASE_SERVICE_ROLE_KEY` only in the isolated finalization adapter; it must remain absent from browser modules and client bundles.
- The callback accepts only relative internal return paths. Login, callback, and access-denied responses avoid exposing whether an account, domain, invitation, or membership exists.
- Static boundary tests cover client/service-role separation and RLS presence. Migration/RLS behavior tests are version controlled with synthetic identities, but remain pending until an explicitly authorized isolated hosted development database is available.

Before hosted verification, an operator must review and apply the migration, enable the Before User Created hook, select the institutional identity provider and approved domain rules, configure exact redirect origins, configure provider rate limits/CAPTCHA, bootstrap the first organization administrator through a reviewed one-time procedure, and then run the database policy tests. None of these steps is authorized by the offline pass.

## Authorization model

Authorization combines three separate dimensions:

1. Active organization membership.
2. One or more ongoing organization roles: `junior_officer`, `publicity_director`, `pro`, `executive`, `org_admin`.
3. A current project assignment: `publicity_head`, `co_project_head`, `project_head`, `writer`, or `viewer`, including its validity and revocation timestamps.

Workflow authority is derived from the frozen instance's current step, not merely a global title. `org_admin` does not automatically gain editorial approval. Executives remain read-only unless a current project assignment grants a specific action, except for the narrow length-policy activation/rejection decision explicitly accepted in A-017. That exception grants no draft-policy editing, general settings mutation, or caption-editing capability. UI capability checks improve usability but never replace RLS or server enforcement.

## Database and RLS controls

- Enable and force appropriate RLS behavior on every Supabase API-exposed table.
- Default to deny, then add organization-scoped, project-scoped, action-specific policies.
- Centralize stable membership/assignment checks in reviewed SQL helpers that cannot be influenced by user-editable metadata or search path manipulation.
- Cover `SELECT`, `INSERT`, `UPDATE`, and `DELETE` independently; do not assume read policy implies safe writes.
- Add constraints for controlled format/tag relationships, exact workflow/version references, reaction uniqueness, and immutable versions.
- Restrict mutation of audit records, decisions, membership, role assignments, workflow instances, and integration records to trusted functions or narrowly authorized actors.
- Restrict length-policy draft creation/editing to `publicity_director` and `pro`. Use a separate audited activation/rejection operation for `publicity_director`, `pro`, and `executive`; never expose unrestricted policy-table mutation to browser roles.
- Make activated length-policy versions immutable and retain superseded rows. Submitted caption versions store the resolved policy identifiers and evaluated values so a later policy cannot reinterpret historical content.
- Keep destination-policy templates in the private schema. Organization-scoped destination policies expose read-only active-member catalog access; initialization and later version changes must be actor-derived trusted operations with same-organization checks, RLS, and audit evidence.
- Test allowed, denied, suspended/expired, stale-assignment, and cross-organization cases using distinct sessions.
- Review Storage bucket policies and Realtime channel authorization alongside table RLS.

## Workflow and version integrity

- Snapshot creation and workflow start are atomic.
- Caption versions are append-only to ordinary application actors.
- Decisions require current actor authority, the current workflow step, and the exact current version.
- New content versions atomically mark affected prior decisions stale and reopen the workflow at the approved step.
- Metadata changes bypass invalidation only when an accepted policy explicitly categorizes them as non-content changes.
- Director override requires template permission, reason, exact version, actor, timestamp, audit event, PRO notification, and distinct UI/API representation.
- Final approved text cannot be edited in place.
- Reactions remain non-binding and cannot advance workflow state.

## Collaboration security

- Issue room access only from a server endpoint after session, membership, organization, project, assignment, and capability checks.
- Derive room identity from trusted server data; never authorize a client-supplied room ID alone.
- Grant minimum read/write permissions and short-lived access appropriate to provider capabilities.
- Revalidate access when assignments expire or are revoked, and define provider-session eviction behavior before Phase 5.
- Prevent unauthorized users from observing presence, names, cursors, selections, comments, or document content.
- Preserve attribution for edits, suggestions, comments, acceptance/rejection, and snapshot handoff.
- Define offline/reconnection conflict and data-retention behavior before release.

### Phase 05 collaboration controls

The repository now implements the A-028 boundary without claiming hosted proof. A trusted Next.js endpoint derives the Liveblocks room and least-privilege read/write permission from the authenticated Supabase session. Supabase security-definer functions independently authorize durable comments, mentions, resolutions, suggestions, reactions, and exact snapshot submission; API-facing collaboration tables have RLS and no direct authenticated write grant.

CapItUp records a maximum four-hour application lease, revalidates on reconnect and at least every minute, revokes sessions after relevant membership or assignment changes, and disconnects or reloads when access changes. Offline Liveblocks support is disabled. This is prompt application-layer eviction, not provider-token revocation: Liveblocks controls its own shorter token lifetime and does not expose active-token revocation through the selected API.

Submitted review versions are created from an exact Liveblocks version-history snapshot. The provider version ID, serialized editor JSON, plain and normalized text, and SHA-256 content hash are stored with the immutable Supabase caption version. Reactions are version-bound and non-binding; `needs_refinement` requires a bounded comment. Runtime RLS, revocation, two-session collaboration, and provider snapshot behavior remain unverified until the migration is applied to the hosted development project and the authenticated browser matrix is run.

## Server operations and secrets

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `LIVEBLOCKS_SECRET_KEY`, `OPENAI_API_KEY`, `NOTION_API_TOKEN`, `NOTION_WEBHOOK_SECRET`, `APP_ENCRYPTION_KEY`, and OAuth secrets server-only.
- Expose only intended public configuration variables. Audit built client bundles for secret names and values.
- Keep privileged adapters in server-only modules; prevent imports from client components.
- Validate request schemas, resource scope, origin/state where applicable, and authorization immediately before each privileged operation.
- Apply secure, HttpOnly, SameSite cookie settings as supported by the chosen auth flow and enforce HTTPS in deployed environments.
- Use a restrictive Content Security Policy compatible with explicitly selected providers.
- Never place real secrets in `.env.example`, source control, logs, screenshots, prompts, fixtures, or error responses.

## Webhooks and OAuth

- Verify signatures against the raw request body using constant-time comparison where applicable.
- Reject stale timestamps according to provider guidance and store provider event IDs for idempotency/replay defense.
- Persist receipt and processing outcomes without logging secrets or unnecessary private content.
- Fetch current authoritative Notion data after a valid event rather than trusting the event body as full state.
- Protect OAuth callbacks with state/PKCE as applicable and bind connections to an authorized organization administrator.
- Retry transient failures with bounded backoff; isolate repeated failures in a dead-letter workflow with audited replay.

## AI privacy and abuse controls

- Authorize the requester and project before retrieving or transmitting any private caption.
- Filter vector retrieval by organization and permitted project before ranking results.
- Use only curated approved/published samples by default; exclude drafts and rejected captions.
- Respect personal-style opt-out and the unresolved sharing policy for personal samples.
- Validate structured model output and render it as untrusted text.
- Mark AI output as draft/suggestion material; AI cannot approve, publish, impersonate a reviewer, or silently replace content.
- Enforce per-user and per-organization quotas and rate limits, and record sufficient provenance for review without storing unnecessary sensitive prompt data.
- Establish retention/deletion rules before production use.

## Content and browser security

- Sanitize rich text and generated HTML on trusted boundaries; prefer structured editor JSON and safe rendering.
- Validate URLs and protocols for deliverables and external links.
- Protect state-changing browser requests against CSRF according to the chosen session mechanism.
- Set security headers, frame restrictions, MIME protections, referrer policy, and permissions policy appropriate to used browser APIs.
- Ensure decorative Unicode does not replace canonical plain text and does not transform links, emails, mentions, or hashtags by default.

## Audit, monitoring, and privacy

Audit membership/role/assignment changes, authentication security events, workflow transitions, decisions, overrides, exception approvals, AI generations, integration writes, sync conflicts, and administrative recovery actions. Audit records must identify actor, organization, target, action, timestamp, and relevant immutable version without logging secrets.

Retention periods, audit access, export format, deletion/anonymization obligations, alert recipients, and incident thresholds are unresolved. Audit history must never be silently deleted.

## Availability, backup, and recovery

- Core drafting, approval history, and final-caption export/recovery must not depend on OpenAI or Notion availability.
- Define Supabase database and Storage backup schedules, restore objectives, and restore ownership before the pilot.
- Define how current Liveblocks/Yjs documents and anchored discussions are exported or recovered.
- Exercise restoration in a non-production environment and record recovery point/time observations.
- Keep sync retry/dead-letter handling from blocking core workflow requests.

## Required security verification

- Unit tests for permission evaluation, workflow transitions, invalidation, input validation, versioned word counting, platform-specific grapheme counting, Unicode mapping, signature helpers, and field mapping.
- RLS integration tests with allowed, denied, cross-organization, suspended, expired, revoked, and stale-assignment personas.
- Direct-request tests proving hidden UI is not the enforcement boundary.
- Storage and Realtime policy tests.
- Two-session collaboration tests plus unauthorized room-observation attempts.
- Stale-version approval, forged-step, override-without-reason, and reaction-as-approval rejection tests.
- AI retrieval isolation and quota/rate-limit tests.
- Webhook invalid-signature, stale timestamp, duplicate ID, out-of-order, retry, and replay tests.
- Dependency, secret, client-bundle, CSP/header, accessibility, backup, and recovery checks before pilot.

## Security release blockers

Do not begin a controlled pilot while any of the following remains true: known cross-organization access, missing RLS on an exposed table, service secrets in browser artifacts, room authorization by ID possession, mutable approved versions, unbound decisions, unaudited overrides, unverified webhooks, AI retrieval across authorization boundaries, or untested recovery of final captions.

