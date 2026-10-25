# Phase 03 — Projects, assignments, and content records

## Status and authority

This is a planning document only. It does not authorize implementation, dependency installation, credentials, hosted Supabase changes, deployment, commits, or pushes.

This user-directed Phase 03 plan is intentionally narrower than `phase-03-caption-drafting-versions.md`. It covers project access and content-record metadata, not caption drafting or immutable caption versions. Do not combine the two plans during implementation. Permanent roadmap numbering remains unresolved under O-028.

## Objective

Establish the organization-scoped project and content-record foundation for CapItUp: temporal project assignments, controlled content kinds/tags, destination channels, deliverable links, assigned writers/reviewers, a special-case indicator, and constrained basic content status.

Organization roles and project assignments remain separate authorization inputs. A project or content assignment must never mutate or masquerade as an organization role.

## Dependencies and entry gates

Implementation must not begin until all applicable gates are satisfied:

- Phase 02 authentication, active-membership enforcement, migration, trusted functions, and RLS behavior are verified in an explicitly authorized isolated hosted development project.
- Phase 02 cross-organization, disabled-member, role-escalation, and browser-direct-write tests pass against that database.
- O-028 is reconciled, or an explicit user decision identifies this file as the active implementation plan despite the historical Phase 03 file.
- The hosted, non-Docker migration and database-test workflow is documented. Local `supabase db reset` is not a prerequisite because Docker is intentionally unavailable.
- O-009 is resolved by A-019. The owner-supplied v1 launch catalog is seeded through the versioned destination-policy migration and explicit authorized organization initialization.
- O-026 is resolved by A-020: deliverable links only; native uploads and attachments are excluded.
- O-007, O-008, and O-029 are resolved by A-016, A-017, and A-018. By explicit user direction, the shared O-029 word-count and warning utility may be implemented and tested without enabling a settings UI, database policy persistence, editor integration, or exception workflow. The special-case indicator alone grants no exception.
- Project-creation authority, project-assignment administration, and the meaning of “accessible project” are confirmed if the product owner rejects the conservative authorization matrix below.
- Only synthetic development identities and data are used until retention and real-data handling requirements are approved.

Decision prompts are recorded in `notes/phase-03-open-decisions.md`.

## Exact scope

### In scope

- Organization-owned projects with minimum identifying metadata and optimistic-concurrency timestamps/versioning.
- Temporal project membership represented by `project_assignments`; no duplicate `project_memberships` table.
- Exact project assignment roles:
  - `publicity_head`
  - `co_project_head`
  - `project_head`
  - `writer`
  - `viewer`
- Content records belonging to exactly one organization and project.
- Content kind represented by the controlled `content_formats` catalog with exact values `post`, `video`, and `article`.
- The exact controlled tag taxonomy from `docs/PRODUCT_SPEC.md`, including database-enforced format/tag compatibility and retirement behavior.
- Organization-managed destination platforms through `publication_channels` and a content/channel join table. Exact launch seeds wait for O-009.
- Deliverable links as child records with label, URL, source committee, deliverable type, and optional status.
- Content-level writer and reviewer responsibility records that reference a current project assignment.
- A special-case boolean and bounded reason. This is descriptive only and does not approve a length exception.
- A controlled basic content-status catalog using the specification's suggested names, with new records defaulting to `draft`.
- Trusted server operations, database constraints, indexes, RLS, append-only audit evidence, and positive/negative authorization tests.
- Minimal project/content list, detail, create, edit, assignment, and archive interfaces required to exercise the phase behavior.

### Explicit non-goals

- No caption body, rich-text editor, TipTap/Yjs state, caption versions, visual diff, Unicode conversion, grapheme counter, search index, reactions, comments, or suggestions.
- No formal submission, approval workflow, approval decisions, override, approval invalidation, or workflow-owned status transitions. Phase 04 owns them.
- No realtime collaboration, presence, cursors, collaboration rooms, AI, embeddings, Notion synchronization, notifications, or deployment.
- No attachments, Supabase Storage buckets, uploads, malware-scanning claims, public asset URLs, or upload/download behavior. A-020 approves deliverable links only.
- No length-policy settings UI, database policy persistence, caption-editor integration, or exception-approval workflow. The user-authorized O-029 shared utility and its unit tests are the sole word-count/warning-engine exception to this metadata-only phase.
- No scheduling, automatic publication, publishing OAuth, social-media integration, or external publication call. Destination catalog initialization and future validation remain manual-publication preparation only.
- No arbitrary tags and no browser-direct insertion into taxonomy tables.
- No standalone Express API and no public external API contract. Next.js server boundaries and Supabase policies remain sufficient for this internal application phase.
- No service-role credential in browser code, React props, client bundles, logs, or tracked files.

## Controlled taxonomy

The implementation must seed only these stable labels and associations. Emoji and display labels belong in shared database metadata rather than component conditionals.

| Content kind | Allowed controlled tags |
|---|---|
| `article` | `GENERAL`, `ANNOUNCEMENT`, `EVENT`, `STORY` |
| `video` | `VIDEO`, `AVP`, `REEL` |
| `post` | `GENERAL`, `BIRTHDAY`, `ANNOUNCEMENT`, `EVENT`, `BRANDING`, `STORY`, `HN`, `HOLIDAY` |

Shared labels such as `GENERAL`, `ANNOUNCEMENT`, `EVENT`, and `STORY` may use one stable tag row associated with multiple formats through `content_format_tags`. The exact emoji values must be copied from the product specification using UTF-8-safe migration/source files and verified after seeding.

Existing content may retain a retired tag, but an inactive tag cannot be newly attached. A user may request a future taxonomy change through a separately authorized reviewed process; the content form cannot create a tag.

## Proposed schema

Names are the planned logical contract. Exact migration identifiers and generated types must be reviewed during implementation.

### Types and controlled catalogs

#### `project_assignment_role`

Enum with exactly:

- `publicity_head`
- `co_project_head`
- `project_head`
- `writer`
- `viewer`

#### `content_responsibility`

Enum with exactly:

- `writer`
- `reviewer`

This responsibility is not an organization role, project assignment role, or formal workflow approval step.

#### `content_status`

Controlled values from the product specification:

- `draft`
- `in_review`
- `changes_requested`
- `awaiting_final_approval`
- `approved`
- `scheduled`
- `published`
- `archived`

Phase 03 creates records as `draft`. Workflow-owned transitions remain unavailable until Phase 04. If Phase 03 exposes archiving, it must use a reviewed trusted operation and audit event; no general client-supplied status update is allowed.

#### `content_formats`

- `id` stable small identifier or UUID primary key.
- `slug` unique and immutable: `post`, `video`, or `article` only.
- `display_label` required.
- `active` required, default true.
- Creation/update timestamps.

#### `content_tags`

- `id` UUID primary key.
- `slug` unique stable machine value.
- `display_label` required controlled label.
- `emoji` required presentation metadata copied from the specification.
- `active` required, default true.
- Creation/update timestamps.
- No browser-direct insert/update/delete.

#### `content_format_tags`

- `content_format_id` foreign key.
- `content_tag_id` foreign key.
- Composite primary key/unique constraint on the pair.
- Seeded only with the exact matrix above.

### Core tables

#### `projects`

- `id` UUID primary key.
- `organization_id` required foreign key to `organizations`.
- `title` required, trimmed, bounded text.
- `description` optional bounded text.
- `created_by_user_id` required immutable actor reference.
- `record_version` positive integer for optimistic concurrency.
- Creation/update timestamps.
- Composite uniqueness on `(id, organization_id)` for same-organization foreign keys.

No project slug, public visibility, external identifier, lifecycle enum, or Notion reference is assumed by this phase.

#### `project_assignments`

This table is the project-membership record.

- `id` UUID primary key.
- `organization_id` required.
- `project_id` required.
- `membership_id` required foreign key to an organization membership.
- `role project_assignment_role` required.
- `starts_at` required database timestamp.
- `ends_at` optional timestamp.
- `assigned_by_user_id` required.
- `revoked_at`, `revoked_by_user_id`, and bounded `revocation_reason` optional as a coherent set.
- Creation timestamp.

Required constraints:

- Composite foreign keys prove the project and membership belong to `organization_id`.
- `ends_at` is later than `starts_at` when present.
- Revocation fields are either absent together or complete according to the accepted revocation rule.
- One current assignment per `(project_id, membership_id, role)`; historical ended/revoked rows remain.
- Assignment validity is calculated from database time, membership status/window, assignment window, and revocation state.
- Assigning an organization role value to this column is impossible at the type boundary.

#### `content_items`

- `id` UUID primary key.
- `organization_id` required.
- `project_id` required.
- `content_format_id` required.
- `title` required, trimmed, bounded text.
- `status content_status` required, default `draft`.
- `is_special_case` required, default false.
- `special_case_reason` optional bounded text.
- `created_by_user_id` required.
- `record_version` positive integer for optimistic concurrency.
- Creation/update timestamps.
- Composite uniqueness on `(id, project_id)` and `(id, organization_id)` as needed by child constraints.

Required constraints:

- Composite foreign key proves the content item and project share one organization.
- `is_special_case = false` requires a null reason; true requires a non-empty bounded reason.
- New records cannot select a disabled content format.
- Phase 03 server operations cannot accept workflow-owned statuses from arbitrary form input.
- Organization/project/creator fields cannot be reassigned through an ordinary edit.

#### `content_item_tags`

- `content_item_id`, `content_format_id`, and `content_tag_id`.
- Composite primary key prevents duplicate tags.
- Composite foreign key `(content_item_id, content_format_id)` proves the item's current format.
- Composite foreign key `(content_format_id, content_tag_id)` proves the tag is allowed for that format.
- Trusted mutation rejects an inactive tag even if the historical relation remains present.
- At least one valid tag per content item is enforced by the atomic create/update operation, because a simple row check cannot enforce child-row existence safely.

#### `publication_channels`

- `id` UUID primary key.
- `organization_id` required.
- `slug` normalized and unique within the organization.
- `display_label` required.
- `active` required, default true.
- Creation/update timestamps and creating actor.
- Composite uniqueness on `(id, organization_id)`.

The owner-supplied O-009 v1 launch catalog is stored as versioned destination-policy data and initialized through a trusted, idempotent organization operation. Channel administration remains a trusted operation; ordinary users cannot create destinations from the content form.

#### `content_publication_channels`

- `content_item_id`, `publication_channel_id`, and denormalized `organization_id` for enforceable composite foreign keys.
- Composite primary key prevents duplicate destination selection.
- Composite foreign keys prove the item and channel belong to the same organization.
- Trusted mutation rejects inactive channels for new selections while retaining historical links.

#### `deliverables`

- `id` UUID primary key.
- `organization_id`, `project_id`, and `content_item_id` required for scoped constraints/policies.
- `label` required bounded text.
- `url` required bounded URL text.
- `source_committee` required bounded text.
- `deliverable_type` required bounded text until a controlled type catalog is accepted.
- `status` optional bounded text; it has no workflow authority.
- `created_by_user_id`, creation/update timestamps, and `record_version`.

Server validation accepts only the explicitly documented safe URL protocols, normalizes the URL for storage/display, and rejects credential-bearing or script/data URLs. The allowed protocol set must be recorded before implementation rather than inferred from arbitrary input.

#### `content_item_assignments`

- `id` UUID primary key.
- `project_id` and `content_item_id` required.
- `project_assignment_id` required.
- `responsibility content_responsibility` required.
- `assigned_by_user_id` required.
- `assigned_at` required.
- Optional `revoked_at`, `revoked_by_user_id`, and bounded reason.

Required constraints:

- Composite foreign keys prove the content item and project assignment belong to the same project.
- One current responsibility per `(content_item_id, project_assignment_id, responsibility)`.
- A responsibility is active only while the underlying organization membership and project assignment are current.
- A reviewer responsibility is non-binding in this phase and cannot approve or change workflow state.
- A writer responsibility does not grant organization-wide or cross-project access.

#### `audit_events`

- Append-only organization/project/content administration evidence.
- Records actor, organization, project, optional content item/assignment/deliverable, constrained event type, outcome, reason code, correlation ID, timestamp, and allowlisted structured metadata.
- Records project/content creation and edits, project/content assignment changes, tag/channel changes, special-case indicator changes, and archiving if enabled.
- Contains no tokens, keys, caption body, unrestricted request body, or unnecessary private content.
- Browser roles cannot update or delete events; read access remains a separately accepted administrative policy.

## Authorization model

Authorization is the intersection of:

1. A valid Supabase session.
2. A current active organization membership.
3. A current project assignment when accessing project/content data.
4. A current content responsibility for responsibility-specific editing.
5. An organization role only where the product explicitly grants administration behavior.

Rules within this phase:

- `viewer` is read-only.
- `writer` makes the member eligible for writer responsibility in that project; actual content editing requires a current `content_item_assignments.writer` row.
- Head assignments identify project responsibility and make an executive actionable for that project, but do not silently grant writer/reviewer responsibility.
- `reviewer` is a content responsibility, not a project role or formal approval step.
- An executive without a current authorized project assignment is read-only/denied according to the requested resource; an executive never gains organization-wide access from the title alone.
- `publicity_director` may administer ordinary assignments only through reviewed trusted operations described by the product specification.
- `org_admin` may administer technical access but gains no editorial approval or caption-writing power from that role alone.
- `pro` retains later editorial abilities but receives no Phase 04 approval operation in this phase.
- Project/content identifiers supplied by the browser are resource selectors, never authorization proof.

## RLS policy matrix

Every Phase 03 table exposed through the Supabase API has RLS enabled. Browser-direct writes default to denied; trusted server/RPC operations perform atomic validation and mutation.

| Resource | Anonymous / inactive member | Active member without project assignment | Current `viewer` | Current project assignee with matching content responsibility | Active same-org `publicity_director` | Active same-org `org_admin` | Direct browser writes |
|---|---|---|---|---|---|---|---|
| `projects` | Deny | Deny | Select assigned project | Select assigned project | Select projects needed for assignment administration | Select minimal project metadata needed for access administration | Deny |
| `project_assignments` | Deny | Deny | Select own current assignment | Select own assignment; head visibility of roster requires accepted policy | Select same-org assignments | Select same-org assignments for access administration | Deny |
| `content_formats`, `content_tags`, `content_format_tags` | Deny | Select only with active membership | Select | Select | Select | Select | Deny |
| `content_items` | Deny | Deny | Select assigned-project items | Select; mutation only through matching trusted capability/responsibility | Select within same organization; editorial mutation still requires project/content authorization | Minimal access-administration visibility only, not editorial mutation | Deny |
| `content_item_tags` | Deny | Deny | Select through visible item | Select and mutate only through atomic authorized item operation | Same as item | Same as item metadata visibility | Deny |
| `publication_channels` | Deny | Select active same-org catalog | Select | Select | Select/manage only through trusted channel administration if accepted | Select/manage technical configuration if accepted | Deny |
| `content_publication_channels` | Deny | Deny | Select through visible item | Mutate only with authorized item edit | Same as item | Same as item metadata visibility | Deny |
| `deliverables` | Deny | Deny | Select through visible item | Writer mutation only when explicitly authorized for the item | Same as item | No editorial mutation from `org_admin` alone | Deny |
| `content_item_assignments` | Deny | Deny | Select assignments for visible item only if required by UI | Select own/current visible-item responsibilities | Manage through trusted same-org/project operation | Manage access through trusted operation without editorial powers | Deny |
| `audit_events` | Deny | Deny | Deny | Deny | Deny unless a later audit-view policy is accepted | Deny unless a later audit-view policy is accepted | Insert only through trusted functions; update/delete always denied |

Additional requirements:

- All policies anchor the actor to `auth.uid()` and current database rows; no user-editable JWT metadata supplies roles, organization, project, or assignment.
- Cross-organization access is denied even when UUIDs are guessed.
- Suspended, expired, not-yet-valid, or revoked membership/assignments immediately lose access.
- Security-definer helpers use a fixed safe `search_path`, fully qualified objects, minimum execute grants, and caller-derived actor identity.
- RLS helpers avoid recursive policy evaluation and are covered by direct SQL tests.
- Retired tags/channels remain readable only through already-authorized historical records.

## Trusted API boundaries

Phase 03 has no new public external API. The contract is implemented through Next.js Server Actions/Route Handlers, shared server/domain modules, request-scoped Supabase clients, narrow transactional database functions, and RLS.

Planned server operations:

- `listAccessibleProjects` and `getAccessibleProject` return minimal DTOs after session/membership/project checks.
- `createProject` and `updateProject` validate bounded input and optimistic version, then call trusted database operations. Final creator authority must match the accepted policy.
- `assignProjectMember` and `revokeProjectAssignment` derive the actor, validate same-organization active membership, enforce the exact project-role enum, and audit the change.
- `createContentItem` atomically creates the item, at least one compatible tag, selected active destinations, deliverables, writer/reviewer responsibilities, and an audit event.
- `updateContentMetadata` atomically validates optimistic version, controlled tags, active same-org channels, safe links, special-case reason pairing, and immutable ownership fields.
- `assignContentResponsibility` and `revokeContentResponsibility` validate the current underlying project assignment and never create an organization role.
- `archiveContentItem`, if enabled in this phase, is a narrow audited operation rather than an arbitrary status setter.

Boundary rules:

- Validate every untrusted input with Zod at the server boundary and again with database constraints.
- Derive actor identity from the authenticated session; do not accept `actor_user_id` from the browser.
- Derive organization from the authorized project/resource; do not trust a client organization claim.
- Return generic not-found/access-denied responses that do not reveal cross-organization resource existence.
- Use transactions/database functions for multi-row item creation, taxonomy replacement, assignment changes, and optimistic updates.
- Do not use a service-role client for ordinary user operations or weaken RLS for convenience.
- No OpenAPI/Postman artifact is required because this phase adds no separately consumed external API. Add one only if a real external consumer is later authorized.

## Threat cases and required controls

| Threat | Required control and proof |
|---|---|
| Browser supplies another organization/project UUID | Actor/resource organization derived server-side; RLS cross-org test returns no rows and mutation fails. |
| User forges `publicity_head` or `writer` in JSON/JWT metadata | Roles exist only in constrained assignment rows created by trusted operations; direct insert and metadata-forgery tests fail. |
| Executive edits without an authorized project/head and content assignment | Shared server policy and RLS deny; positive test covers the explicitly assigned case only. |
| Viewer attempts project/content mutation | No direct table grant and trusted operation rejects read-only role. |
| Writer edits an item assigned to another writer | Current content-responsibility check rejects the write. |
| Disabled member retains a valid browser session | Every helper rechecks membership status/window; reads and writes fail. |
| Invalid format/tag pair is submitted | Composite foreign keys and server schema reject it atomically. |
| User submits an arbitrary tag/channel string | APIs accept existing controlled IDs only; taxonomy/channel table writes are denied. |
| Retired tag/channel is attached to new content | Trusted operation checks `active`; historical records remain readable. |
| Cross-project writer/reviewer assignment is forged | Composite project foreign keys and server checks reject it. |
| Special-case boolean is used as a length override | No exception behavior exists; boolean/reason is descriptive and audited only. |
| Dangerous deliverable URL is stored | Zod URL/protocol validation, bounded storage, output escaping, and negative URL fixtures. |
| Stale form overwrites newer metadata | `record_version` compare-and-increment rejects stale writes. |
| Client changes workflow-owned status | No general status setter; trusted transition allowlist excludes Phase 04 states. |

## Expected files and components

Implementation is expected to add or modify only files needed for this phase, such as:

- One or more `supabase/migrations/*_phase_03_projects_content.sql` migrations.
- Hosted-development SQL/RLS tests under `supabase/tests/` using synthetic organizations and identities.
- Updated migration-derived/generated `src/types/database.ts` after authorized database comparison.
- `src/lib/auth/` capability helpers extended for project/content scope without mixing organization roles and assignments.
- `src/features/projects/` domain schemas, server queries/actions, DTOs, and project UI.
- `src/features/content/` schemas, metadata operations, controlled taxonomy, assignment, destination, deliverable, and status UI.
- App Router pages/loading/error boundaries only for the approved project/content surfaces.
- Unit tests under `tests/unit/`, database/RLS tests, and focused browser tests.
- Documentation updates to architecture, security, decisions, build log, handoff, and roadmap only where verified behavior/status changes.

Do not add a second package manager, standalone API server, editor/collaboration library, AI SDK, Notion SDK, Storage client behavior, or deployment configuration.

## Acceptance criteria

- The migration creates the planned project/content tables, types/catalogs, constraints, indexes, audit path, and RLS without weakening Phase 02 policies.
- Organization roles and project assignments use separate tables/types and cannot be substituted for each other by client input.
- Project assignments contain the exact five roles and enforce organization consistency, validity windows, revocation, and current-row uniqueness.
- An active authorized actor can create a project/content record only through the accepted trusted boundary; inactive, unauthorized, viewer-only, and cross-organization actors cannot.
- New content defaults to `draft` and cannot jump to a Phase 04 workflow-owned status through a generic mutation.
- Every content item belongs to one organization/project, has a title, one exact content kind, at least one compatible controlled tag, and the required special-case reason pairing.
- Exact taxonomy seeds and format associations match `docs/PRODUCT_SPEC.md`; no arbitrary or inactive tag can be attached.
- Launch channels match the accepted O-009 record. If O-009 is still open, channel seeds and any dependent acceptance case remain blocked rather than guessed.
- A content item can reference multiple active same-organization channels without duplicating a relation.
- Deliverable child records store the required metadata and reject unsafe/malformed URLs and cross-project attachment.
- Assigned writers/reviewers reference current assignments in the same project; writer/reviewer responsibility neither creates an organization role nor grants cross-project access.
- Executives remain read-only without the required project assignment and content capability; the authorized positive case is tested separately.
- The special-case indicator and reason are visible/audited but do not approve or suppress a length rule.
- Optimistic metadata updates reject stale `record_version` values without losing the current row.
- All browser-direct table mutations, forged identifiers/roles/statuses, disabled-member access, and cross-organization access fail.
- Existing Phase 02 unit/build/browser checks continue to pass without requiring Docker or live production data.

## Test plan

### Synthetic personas

- Active junior officer with current project `writer` assignment and matching content writer responsibility.
- Active member with current `viewer` assignment.
- Active member assigned to a different project.
- Active same-organization publicity director performing an accepted assignment-administration action.
- Active same-organization org admin exercising access administration without editorial mutation.
- Active executive with no project assignment.
- Active executive with a current head assignment but no content writer responsibility.
- Active executive with the required head assignment and matching content responsibility.
- Suspended and expired organization members with otherwise valid assignment rows.
- Active member in another organization using guessed UUIDs.
- Anonymous session.

### Schema and constraint tests

- Accept exactly the five project assignment roles; reject organization-role strings and arbitrary roles.
- Accept only `post`, `video`, and `article` content formats.
- Assert the exact tag seed set, labels/emoji metadata, and format associations.
- Reject zero tags, duplicate tags, invalid format/tag pairs, inactive tags, and arbitrary tag IDs.
- Reject cross-organization project membership and cross-project content responsibility foreign keys.
- Reject invalid assignment windows, incomplete revocation evidence, and duplicate current roles/responsibilities.
- Reject false special-case with a reason and true special-case without a bounded reason.
- Reject malformed/dangerous deliverable URLs and duplicate destination relations.
- Reject unknown statuses and generic writes to workflow-owned states.
- Reject stale optimistic versions.

### Positive authorization tests

- Current viewer reads only assigned project/content metadata.
- Current writer plus content responsibility performs the permitted metadata operation.
- Authorized assignment administrator creates/revokes an assignment with an audit event.
- Authorized content operation creates the item, valid tags, destinations, deliverables, responsibilities, and audit event atomically.
- Authorized executive case succeeds only with the accepted project/head and content capability combination.
- Historical inactive tags/channels remain visible on an already-authorized record.

### Negative authorization tests

- Anonymous, invited, suspended, expired, and not-yet-valid members cannot read or mutate Phase 03 rows.
- Active member without project assignment cannot read a guessed project/content item.
- Cross-organization and cross-project reads/mutations return generic denial and no existence leak.
- Viewer cannot create/update/archive content or manage assignments.
- Writer cannot edit another writer's item or grant themselves a project/head role.
- Head assignment alone cannot create an organization role, formal approval, or unrelated content edit.
- Executive without the required assignment remains read-only; forged client role/capability data is ignored.
- Browser attempts to insert/update/delete project assignments, tags, channels, responsibilities, or audit rows fail.
- Content form cannot create an arbitrary tag or destination.
- Special-case indicator cannot bypass any length rule or create an approval record.

### API and browser tests

- Server Actions/Route Handlers reject malformed IDs, unknown enum values, unexpected fields, unsafe redirects/URLs, and oversized text.
- Direct requests work or fail identically regardless of whether the UI button is hidden.
- Project/content lists expose only minimal authorized DTOs.
- Assignment and content forms are keyboard-operable, label validation errors, preserve safe user input after rejection, and do not expose internal denial reasons.
- Desktop, tablet, and mobile layouts show controlled kinds/tags, destinations, deliverables, writers/reviewers, status, and special-case reason without implementing later editor/workflow UI.

## Verification commands

Inspect actual repository scripts before implementation and use npm because `package-lock.json` is authoritative. Expected offline checks are:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- projects content taxonomy authorization
npm.cmd run build
npm.cmd run test:e2e
git diff --check
```

Database verification must use the separately authorized hosted-development workflow. Record the exact migration and pgTAP/RLS commands when that workflow is accepted. Do not run or require Docker, `supabase start`, `supabase stop`, local containers, or local `supabase db reset`.

If no hosted project is authorized, SQL/RLS tests remain pending and Phase 03 cannot be called database-verified. Static SQL inspection is not a substitute for executing constraints and policies.

## Evidence that must be recorded

- Migration identifiers and whether each was only authored, applied to an isolated hosted development project, or verified.
- Exact taxonomy seed rows and a comparison against `docs/PRODUCT_SPEC.md`.
- Accepted O-009 channel seeds and source/effective-date evidence, or an explicit record that channel seeding remains blocked.
- Schema/constraint/index inventory and the final RLS matrix.
- Positive, negative, disabled-member, executive, cross-project, and cross-organization database test output.
- Direct browser-write and forged-role/status request results.
- Atomic content-create evidence and rollback evidence for an invalid child relation.
- Optimistic-concurrency stale-write evidence.
- Audit-event evidence for project/content assignment and special-case changes without private content/secrets.
- Responsive/accessibility browser evidence for the scoped metadata interfaces.
- Exact formatting, lint, type-check, unit, database, browser, build, and `git diff --check` commands/results.
- Any pending hosted configuration, manual step, unresolved decision, risk, or unavailable test.

## Stop condition

Stop when the approved Phase 03 project, assignment, and content-record scope passes its accepted offline and hosted database criteria, documentation/evidence is updated, and no required decision remains silently assumed.

Do not begin caption drafting/version history, formal approval workflows, realtime collaboration, AI, Notion integration, native uploads, deployment, commit, or push.
