# CapItUp Development Handoff

## Latest update - 2026-11-15 Phase 07 Notion integration offline implementation

- Phase 07 is locally implemented but not hosted-verified or complete. The new forward-only, unapplied migration is `supabase/migrations/20261115000200_phase_07_notion_integration.sql`; its pending hosted pgTAP/RLS proof is `supabase/tests/notion_integration_rls.test.sql` (10 assertions). Do not edit or reapply any recorded earlier migration.
- The local slice provides one organization-managed internal Notion connection, server-only token access, raw-body HMAC signature/freshness verification, event-ID idempotency, canonical post-webhook page fetch, safe three-field import mapping, source-of-truth enforcement, deterministic 1/5/15/60-minute backoff, conflicts, dead letters, audited admin recovery, and a visible admin setup/status/recovery page. Working captions and versions cannot be mapped or exported.
- Because O-019/O-020/O-021 are unresolved, the UI/configuration deliberately permits only title, event date, and deadline imports from an explicitly shared development data source. No app-owned export and no final-caption export is activated or represented. This is a safety boundary, not a decision resolution.
- Observed local gates: 123 unit tests, 5 integration tests, lint, strict TypeScript, targeted Prettier, synthetic production build stages, and six Chromium tests passed; `format:check` remains blocked by four unrelated dirty files recorded in `harness/build-log.md`. No hosted Supabase/Notion access, migration application, Docker/local stack, deployment, production operation, commit, or push occurred.

Last updated: 2026-11-15 +08:00
Current branch: master
Current phase: Phase 07 Notion integration is offline-implemented, awaiting external decisions and hosted-development proof
Current task: In an explicitly authorized isolated hosted development project, inspect the migration ledger and apply only missing forward migrations, including `20261115000200_phase_07_notion_integration.sql`; then run its pgTAP suite and authorized signed-webhook/idempotency/retry/recovery checks against explicitly shared development content. Do not use production, deploy, or reapply recorded migrations.

## Latest update - 2026-11-15 Phase 06 AI assistance offline implementation

- Phase 06 has an offline-implemented, synthetic-only AI boundary. `20261115000100_phase_06_ai_operations.sql` complements the existing Phase 06 foundation with authorized profile lifecycle operations, filtered vector retrieval, provenance/disposition/audit records, and authenticated grants. It is forward-only and unapplied.
- `src/features/ai/` now has server-only prompt/retrieval/provider/evaluation modules and a display-only profile selector plus editable-draft/suggestion result component. The route continues to authorize content access and return a generic `503` before any private data reaches Gemini; this is required by A-027, not a degraded authorization path.
- Local unit, static integration, synthetic evaluation, type, lint, production build, and existing browser gates passed. The browser suite has no provider-enabled AI scenario; no hosted SQL/RLS/vector/quota concurrency run has occurred.
- Phase 06 is **not hosted-verified or complete**. Its exact external continuation is: inspect the hosted development migration ledger, apply only missing forward migrations (including `20261115000100_phase_06_ai_operations.sql`), then run synthetic allowed/denied/cross-organization/revoked-consent/vector-isolation/quota-concurrency tests. Do not send private content to Gemini Free or deploy.

Last updated: 2026-11-15 +08:00
Current branch: master
Current phase: Phase 06 AI assistance is offline-implemented and synthetic-only; hosted database/provider verification remains open
Current task: Apply and verify only the Phase 06 forward migrations in an explicitly authorized hosted-development environment, without production access or private-caption provider use.

## Prior update - 2026-11-15 Phase 05 server-only finalization and notifications

- Added unapplied forward migration `20261026000800_phase_05_server_snapshot_notifications.sql`. It revokes/drops the obsolete authenticated snapshot RPC, adds versioned word-policy storage and immutable word/destination evidence, and grants the replacement finalization function only to `service_role`.
- The snapshot route now authenticates with the normal Supabase cookie client, verifies write capability and current writer assignment, freezes and validates the exact Liveblocks Yjs version, computes shared word/grapheme counts, and invokes the isolated server-only service-role client. The database function revalidates actor, organization, project, assignment, room, workflow, item/document revisions, and replay state under locks.
- Added an app-wide notification center to dashboard and project workspaces. It reads recipient-only RLS rows, maintains unread state, subscribes to recipient-filtered Realtime changes, and marks read via the existing recipient-scoped RPC.
- Review UI now presents immutable count, policy-version, limit, exemption, destination, and warning evidence. Warnings do not block submission or invent a publication rule.
- No migration, hosted SQL, deployment, production write, commit, or push occurred. PostgreSQL/RLS/Realtime/Liveblocks behavior still requires an authorized isolated environment.

## Phase 05 managed-Liveblocks implementation - 2026-11-08

A-028 is now implemented locally as an unapplied forward migration and application slice. Managed Liveblocks is the only collaboration provider. The server derives one organization/content room from trusted data and issues least-privilege access after the Supabase RPC authorizes a four-hour maximum CapItUp lease. The client revalidates at least every minute, on reconnect/online/visibility events, and after session Realtime events; it reloads for a read/write change and disconnects after revocation or revalidation failure. Offline Liveblocks support is disabled.

`20261026000700_phase_05_collaboration.sql` adds RLS-protected collaboration documents/sessions, durable threads/comments/mentions/suggestions/reactions/audit events, revocation triggers, trusted mutations, exact snapshot submission, and Supabase Realtime publication entries. Durable anchors include encoded Yjs-relative positions. `src/features/collaboration/` now contains the TipTap/Yjs workspace, presence/status, comments/replies/resolution, mentions, custom stale-safe suggestions, advisory reactions, workflow status, current-caption notifications, access revalidation, and snapshot serialization. The content page uses this workspace instead of the old manual textarea submission path.

Snapshot submission asks Liveblocks to freeze a version-history snapshot, retrieves that exact Yjs version, validates/serializes it, hashes the editor JSON, and atomically creates the immutable Supabase caption version and workflow instance. Formal approval continues to target the immutable version. The local OpenAPI source is `docs/api/collaboration.openapi.json`; no credential value is stored or printed.

Observed local evidence so far: focused collaboration Vitest passes 4 files / 15 tests; focused ESLint passes; focused Prettier passes; TypeScript passes. Broader tests/build and final diff checks must be rerun after the final documentation pass. The migration has not been applied or runtime-tested against PostgreSQL, no two-browser/provider scenario has run, and no hosted or production operation occurred. The operator will need to apply the unapplied SQL migration to the hosted development project exactly once before browser verification; do not reapply any migration already recorded there.

Exact next task: finish broad local gates, then—only with explicit hosted-development authorization—inspect the remote migration ledger, apply only missing Phase 04/05 migrations, and run allowed/denied/cross-organization RLS plus two-session Liveblocks, revocation, relative-anchor, reaction, notification, and snapshot-handoff browser tests.

## Phase 04 approval-invalidation policy - 2026-11-06

A-023 now fully resolves O-005. Scheduled publication time is the only approval-preserving edit. The new, unapplied `20261026000600_phase_04_approval_invalidation.sql` migration reopens the current workflow for caption, title, kind, tag, destination, deliverable, content-assignment, special-case, or evaluated-policy changes while preserving immutable historical decisions and audit evidence. It adds scheduled-publication storage and a trusted non-invalidating update RPC, approval-policy fingerprints, centralized invalidation/audit/notification behavior, and triggers for existing trusted mutation paths.

Focused Phase 04 tests passed (3 files, 6 tests), the full Vitest suite passed (22 files, 88 tests), Prettier, ESLint, and strict TypeScript passed, and a synthetic-environment production build exited 0. No PostgreSQL migration or hosted operation ran. If the earlier Phase 04 files remain unapplied as recorded, hosted development must apply `20261026000100` through `20261026000600` in order; if remote migration history proves that `00100` through `00500` are already applied, apply only `00600`. Never reapply the recorded Phase 02/03 migrations.

Phase 04 remains open pending hosted migration/RLS/concurrency proof, complete draft/version read state, workflow queues/timeline/forms, and authenticated browser scenarios.

## Phase 06 Gemini synthetic-development start - 2026-10-26

The user later authorized starting Phase 06 despite open Phase 04/05 gates. Gemini Free is authorized for synthetic/test content only; never transmit private organization captions. `GEMINI_API_KEY` is server-only and the initial `src/features/ai/gemini.ts` factory makes no provider call. `src/features/ai/contracts.ts` validates confirmed briefs and untrusted structured model output, including exactly three directions; `src/features/ai/policy.ts` records the accepted 2026-10-27 policy. A-027 resolves O-016, O-017, O-018, the AI-log portion of O-023, and the AI portion of O-025. The offline Phase 06 migration provides RLS tables and an atomic quota reservation function, while `/api/ai/generate` re-authorizes content access and intentionally returns `503` before Gemini receives any private text. Phase 06 is not complete: hosted migration/RLS proof, profile/sample mutation UI, embedding/retrieval, generation/provenance persistence, insertion/feedback, and evaluation remain outstanding.

## Phase 05 closeout audit - 2026-10-26

This later audit supersedes the historical instruction above only for status reporting. Phase 05 is **open**: no acceptance criterion is fully verified. The room-authorization route and stale-suggestion utility are partial/static evidence only. Editor/presence/comments, Supabase mirrors/RLS, Realtime notifications, reconnect/revocation, snapshot handoff, review lock, and two-session proof remain incomplete. See `harness/build-log.md` for the criterion matrix and observed command results.

## 2026-10-26 Phase 05 continuation

The later user authorization supersedes the historical instruction above: Phase 05 implementation has started, with Liveblocks as the primary provider and Render/Hocuspocus as a fallback. The custom suggestion model is accepted in A-026; do not add Tiptap Pro Tracked Changes.

Completed in the first Phase 05 slice:

- Open-source Liveblocks, Tiptap, and Yjs dependencies are installed.
- `src/app/api/liveblocks-auth/[projectId]/[contentId]/route.ts` performs server-authorized, least-privilege room token issuance from the current Supabase session and content access.
- `src/features/collaboration/suggestions.ts` refuses stale or already-decided suggestion application; `tests/unit/collaboration-suggestions.test.ts` covers the positive and stale/decided paths.

Do not call this phase complete. The next work is the collaboration mirror schema/RLS and trusted suggestion-decision operations, then the editor/presence/comment UI and approved two-session hosted verification. No migration, hosted database write, deployment, or production operation has occurred in this slice.

## Current Phase 03 handoff

### Completed acceptance criteria

- Added the additive `20261025000100_phase_03_projects_content.sql` migration with separate organization roles, project assignments, content responsibilities, controlled kinds/tags, projects, content items, publication-channel structure, deliverable links, audit events, constraints, indexes, trusted RPCs, grants, and RLS declarations.
- Seeded exactly the approved `post`, `video`, and `article` taxonomy and its controlled tags. No arbitrary-tag path or publication-channel seed was added.
- Added server-only project/content data access and authenticated Server Actions. Browser table writes remain denied; actors are derived inside trusted database functions.
- Added minimum authorized project/content list, create, view, metadata-edit, project-assignment, content-responsibility, and deliverable-link interfaces. No caption body or collaborative editor exists.
- Offline authorization tests cover cross-organization isolation, project assignment separation, viewer behavior, executive restrictions, controlled tags, invalid kind/tag pairs, unsafe URLs, direct-write grants, and the client/server import boundary.
- Final offline checks passed: Prettier, ESLint, strict TypeScript, 45 Vitest tests, synthetic production build, and 5 Playwright tests.

### Database, migrations, and RLS

- Pending Phase 02 migration: `supabase/migrations/20261024000100_phase_02_auth_membership.sql`.
- Pending Phase 03 migration: `supabase/migrations/20261025000100_phase_03_projects_content.sql`.
- Pending hosted tests: `auth_membership_rls.test.sql` (10 assertions) and `projects_content_rls.test.sql` (18 assertions).
- Phase 03 declares RLS on twelve API-facing tables. Authenticated browser roles receive filtered `SELECT` grants only. Trusted security-definer functions own mutations and append-only audit writes.
- No migration was applied, no Supabase project was linked/contacted, and no database/RLS assertion was executed in this task.

### Files changed for Phase 03

- Migration/types: Phase 03 migration, pending pgTAP test, and migration-derived `src/types/database.ts` additions.
- Server/domain: controlled taxonomy, Zod schemas, pure capability policy, server-only data access, and Server Actions under `src/features/content/` and `src/features/projects/`.
- UI/routes: project list/create/detail and content create/detail/edit routes under `src/app/projects/`, plus the scoped project workspace and forms.
- Tests: four Phase 03 unit/static/component test files plus the pending hosted SQL suite.
- Documentation: architecture, security, plan status, build log, and this handoff.

### Known issues, blockers, and security concerns

- Phase 02 and Phase 03 SQL syntax, constraints, RPCs, audit behavior, and RLS are not runtime-proven. Applying migrations and running pgTAP requires a separately authorized isolated hosted development project.
- The ignored `.env.local` remains user-managed and was not read or changed. Final build/browser checks used synthetic public values only.
- O-009, O-026, O-007, and O-008 are now resolved in later decision records. The links-only model remains in scope; native uploads and Storage are excluded.
- Project creation/assignment administration follows the plan's conservative matrix: same-organization publicity directors or organization administrators. An organization administrator gains no editorial capability from that role alone.
- Manual TypeScript database types must be compared with generated hosted types after migration application.

### Exact next permitted task

Review the offline Phase 03 diff or explicitly authorize an isolated hosted-development migration/RLS verification pass for the pending Phase 02 and Phase 03 migrations. Do not begin caption drafting/version history, approval workflow, the collaborative editor, realtime, AI, Notion, attachments, deployment, commit, or push.

## Historical Phase 01 closeout summary

### Completed acceptance criteria

- Next.js 16.4.2 App Router uses strict TypeScript and the `@/*` alias; Tailwind CSS and shared shadcn/ui infrastructure compile in the production build.
- Zod validates separately typed browser-safe and server-only environment boundaries. `.env.example` has the complete empty key set; `.env.local` and generated output are ignored.
- The responsive fixture-only shell includes semantic regions, skip navigation, visible focus, reduced-motion handling, desktop/mobile navigation, independent workspace preview routes, and a presentation-only login route.
- Formatting, lint, strict type checking, 10 unit tests, the production build, and the final five-test Chromium rerun passed during closeout.
- No authentication, business database behavior, realtime, AI, Notion, hosted Supabase connection, Vercel configuration, or deployment was started.

### Incomplete requirements and blockers

- Local Supabase `start`, `status`, and `stop` remain unverified because Docker and Podman are absent; the user elected not to install either runtime. The Phase 01 criteria permit closeout when this prerequisite gap is recorded without substituting a hosted project.
- O-028 blocks the next implementation phase because permanent phase numbering remains ambiguous.
- Phase 02 also requires O-001, O-002, O-006, and O-025 decisions for identity provider, institutional domains, role cardinality, and abuse protection.
- Official logo rules, typeface, and final colors remain unresolved under O-010; the indigo system is provisional.

### Files changed and why

- `package.json`, `package-lock.json`, configuration files, `components.json`, and `scripts/run-e2e.mjs`: npm-managed application and repeatable quality/browser tooling.
- `.env.example`, `.gitignore`, and `src/lib/env/`: empty configuration documentation, ignored local secrets/output, and separated public/server validation.
- `src/app/`, `src/components/`, and `src/features/`: static dashboard, route-level previews, login presentation, shared visual primitives, indigo styling, and the root hydration-warning boundary.
- `tests/unit/` and `tests/e2e/foundation.spec.ts`: environment, semantic UI, route navigation, login, responsive, keyboard, and reduced-motion coverage.
- `README.md`, `docs/`, `PLANS.md`, and `harness/`: architecture, security, decisions, UI direction, scope, evidence, and handoff records.
- `debug.log`: untracked Chromium GPU-warning artifact; inspected but not modified or accepted as product output.

### Database, migrations, and RLS

- Migrations added or applied: none.
- Tables, Auth hooks, Storage buckets, seed data, and generated database types affected: none.
- RLS policies added, changed, tested, or applied: none.
- Hosted project link or remote database operation: none.

### Closeout commands and results

- `rtk proxy npm.cmd run format:check` — exit 0 before and after closeout documentation edits.
- `rtk proxy npm.cmd run lint` — final explicitly polled run exit 0.
- `rtk proxy npm.cmd run typecheck` — exit 0.
- `rtk proxy npm.cmd run test` — exit 0; 4 files and 10 tests passed.
- `rtk proxy npm.cmd run build` — exit 0; six application routes were statically generated.
- First `rtk proxy npm.cmd run test:e2e` — exit 1; 4 passed and navigation timed out waiting for `/captions`.
- Immediate unchanged `rtk proxy npm.cmd run test:e2e` rerun — exit 0; all 5 Chromium tests passed.
- Ignore/secret/runtime audits — `.env.local` is present and ignored; its values were not read. `.env.example` values are empty, targeted authored/built-client secret scans returned no matches, Docker and Podman are absent, and `supabase/.temp/project-ref` is absent.
- Version inventory — Node `v24.21.0`, npm `12.0.2`, Next.js `16.4.2`, TypeScript `5.9.3`, Tailwind `4.3.3`, shadcn `4.22.1`, Supabase CLI `2.121.0`, Vitest `5.0.5`, Playwright `1.64.1`.
- `git diff --check` — exit 0 after closeout edits with existing line-ending warnings only; `git status --short` recorded the dirty worktree.

### Known issues and security concerns

- The first closeout browser navigation test failed before an unchanged rerun passed; retain it as an intermittent risk.
- Local Supabase is not running and must not be described as verified. No hosted substitute is connected.
- `.env.local` may contain user-managed values. Never print, commit, log, or copy them into `.env.example`, browser code, or chat.
- No RLS exists because no business tables exist. Every future exposed table requires allowed, denied, and cross-organization policy tests.
- Earlier evidence records nine development-only transitive audit findings. Do not apply a forced breaking audit fix.

### Exact next permitted task

Planning only: resolve O-028, decide how hosted Supabase development will preserve migrations/RLS reproducibility without Docker, resolve O-001/O-002/O-006/O-025, and update the Phase 02 plan for review. Stop before credentials, hosted-project linking, a Supabase application client, schema/migrations/RLS, Vercel, deployment, commit, push, or Phase 02 implementation.

## Historical Phase 01 implementation detail

## Objective

Maintain the verified local project foundation and deliver the approved, responsive CapItUp dashboard and invitation-only login presentation shells using static representative data only.

## Current state

- Completed:
  - Added Zod public/server environment schemas and the `server-only` import guard.
  - Added synthetic environment validation tests and strengthened the browser smoke tests.
  - Replaced the minimal foundation page with the approved dark, layered dashboard shell, navigation rail, central work queue, responsive navigation, and right-side draft-assistant preview.
  - Added a dedicated `/login` route with a centered invitation-only glass card and generic membership/security messaging.
  - Added semantic landmarks, a skip link, visible focus treatment, reduced-motion behavior, disabled later-phase actions, and static fixture labeling.
  - Verified desktop, tablet, 375 px mobile, and 320 px minimum-width layouts without horizontal overflow.
  - Updated unit/browser coverage and documentation evidence.

- In progress:
  - None.

- Not started:
  - Phase 02 authentication, membership, database business schema, and RLS.
  - Functional caption workflow, collaboration, AI, Notion, deployment, commit, and push.

## Decisions already made

- Environment boundary (A-013):
  - Zod validates separate public and server-only schemas; future integration variables validate only when configured or used.
  - Related files: `docs/DECISIONS.md`, `src/lib/env/`.

- Local Supabase boundary (A-014):
  - Only local CLI/container lifecycle is allowed in Phase 01; no hosted project, credentials, or business schema.
  - Related files: `docs/DECISIONS.md`, `supabase/config.toml`.

- Visual foundation:
  - `docs/UI_SPEC.md` is the implemented visual source for the Phase 01 presentation shells.
  - Official brand colors, logo rules, and typefaces remain open under O-010; the current lavender/violet system and text mark are provisional.
  - Dashboard, login, calendar, and assistant content are local fixtures. No action represents trusted authorization or a connected service.

## Files changed

- `package.json`, `package-lock.json`
  - Added `zod` and `server-only`.
  - Required for typed environment validation and the server import boundary.

- `src/lib/env/client.ts`, `src/lib/env/server.ts`, `src/lib/env/shared.ts`
  - Added public/server schemas, safe error behavior, and runtime accessors.
  - Prevents accidental client exposure of server configuration.

- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
  - Added metadata templating, the responsive dashboard entry point, the dark layered visual system, and the motion/focus baseline.

- `src/app/login/page.tsx`, `src/features/auth/login-shell.tsx`
  - Added the static invitation-only login presentation at `/login`.

- `src/components/capitup/brand-mark.tsx`, `src/features/dashboard/dashboard-shell.tsx`
  - Added the original CapItUp text mark, desktop/mobile navigation, dashboard cards, fixture data, activity surface, and inactive draft-assistant rail.

- `src/components/ui/button.tsx`
  - Refined shared button sizing, focus rings, surface treatments, and disabled states for the visual system.

- `tests/unit/environment.test.ts`, `tests/unit/home.test.tsx`, `tests/unit/login.test.tsx`, `tests/e2e/foundation.spec.ts`
  - Covers environment boundaries, dashboard/login semantics, disabled later-phase actions, desktop/tablet/mobile overflow, keyboard focus, and reduced motion.

- `README.md`, `docs/UI_SPEC.md`, `harness/build-log.md`, `harness/HANDOFF.md`
  - Recorded current local setup, observed verification, and phase handoff state.

- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `harness/build/phase-01-foundation.md`
  - Existing Phase 01 planning artifacts that define the active scope and boundaries.

## Database changes

- Migrations added: None.
- Tables affected: None.
- RLS policies affected: None.
- Migration status: Not applicable.
- Generated types status: Not applicable.

## Verification performed

Commands actually executed:

```powershell
rtk proxy npm.cmd run test -- env
rtk proxy npm.cmd run format
rtk proxy npm.cmd run format:check
rtk proxy npm.cmd run lint
rtk proxy npm.cmd run typecheck
rtk proxy npm.cmd run test
rtk proxy npm.cmd run build
rtk proxy npm.cmd run test:e2e
rtk proxy npm.cmd run supabase -- start
rtk proxy npm.cmd run supabase -- status
rtk proxy npm.cmd run supabase -- stop
rtk proxy npm.cmd audit --omit=dev
rtk proxy git diff --check
rtk proxy .\node_modules\.bin\prettier.cmd --write <Phase-01 UI files>
rtk proxy npm.cmd run test -- tests/unit/home.test.tsx tests/unit/login.test.tsx --reporter=verbose
rtk proxy npm.cmd run format:check
rtk proxy npm.cmd run lint
rtk proxy npm.cmd run typecheck
rtk proxy npm.cmd run test
rtk proxy npm.cmd run build
rtk proxy npm.cmd run test:e2e
```

- The latest UI verification passed formatting, lint, strict type checking, all 6 unit tests across 3 files, a production build, and all 4 Chromium browser tests.
- Browser coverage exercises the dashboard at 1440 px, 900 px, 375 px, and 320 px; the login shell at 1280 px and 375 px; horizontal overflow, disabled future actions, keyboard focus, and reduced motion.
- Local Playwright screenshots were inspected for the dashboard at desktop/tablet/mobile widths and for the login route at desktop/mobile widths. They are ignored test output, not product assets.
- The first UI browser run caught a duplicated login title (`Sign in · CapItUp · CapItUp`); the route now supplies `Sign in` to the root metadata template, and the complete rerun passed.
- `npm audit --omit=dev` found zero production dependency vulnerabilities.
- Local Supabase CLI verification was blocked because Docker and Podman are not on `PATH`; status confirmed `linked_project: null` and no hosted project was used.
- Placeholder, ignore-rule, authored-file secret-pattern, built-client secret-name, and remote-link checks passed.

## Remaining risks and verification

- Install Docker Desktop or Podman and rerun the three local Supabase lifecycle commands to complete the only unverified Phase 01 runtime check.
- Official brand assets, colors, and typefaces remain unresolved under O-010; current styling is deliberately provisional.
- The requested reference paths under `docs/design-references/` were absent. The matching images were inspected from the existing root `design-references/` directory; unrelated files there were left untouched.
- Nine high-severity development-only transitive audit findings remain from the existing shadcn/ESLint tooling path. Do not use `npm audit fix --force` without reviewing the breaking downgrade it proposes.
- npm still blocks the optional `unrs-resolver` postinstall script; all required checks pass without approving it.
- O-028 remains open: reconcile the long-term Phase 0/Phase 01/UI-foundation numbering before authorizing the next phase.

## Stop condition

Stop here. Do not begin Phase 02 or connect a hosted service, deploy, commit, or push.
# Latest update — 2026-10-23

## Phase 01 indigo route refinement

- The Phase 01 fixture shell now uses a deeper indigo system centered on provisional `#4B0082`; the exact token table is in `docs/UI_SPEC.md`.
- The primary rail uses independent static App Router pages: `/`, `/captions`, `/projects`, `/calendar`, and `/archive`. Each route keeps its own active navigation state and clear fixture-only messaging.
- No product capability was enabled. Caption actions, archive search, project data, calendars, assistant prompts, authentication, authorization, database access, realtime, AI, Notion, and deployment remain out of scope.

## Latest verification

- Passed: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` (4 files, 10 tests), `npm run build`, and `npm run test:e2e` (five Chromium tests, exit code 0).
- The browser suite covers the new route navigation plus the established desktop, tablet, mobile, keyboard, reduced-motion, and login checks. No manual screenshot review was repeated.
- No dependencies were installed in this refinement.

## Remaining risks

- Official visual identity, colors, and typography remain unresolved under O-010; this indigo palette is a user-directed provisional choice.
- Local Supabase lifecycle verification remains blocked until Docker Desktop or Podman is available. No remote service has been used.
# Latest update — root hydration warning

- A browser extension injected `cz-shortcut-listen` into `<body>` before React hydration, causing a development-only console mismatch.
- `src/app/layout.tsx` now uses `suppressHydrationWarning` on the root body only. This is intentionally limited to the extension-modified boundary; it does not disable component-level hydration diagnostics.
- Formatting, linting, type checking, tests, and the production build completed without a command error; `git diff --check` passed with existing line-ending warnings only.

# Latest update — 2026-10-24 Phase 02 offline implementation

## Current state

Phase 02 is offline-implemented and stopped before hosted verification. The repository now has the reviewable migration, Supabase SSR client boundaries, invitation/membership authorization code, protected routes, logout, generic denial, synthetic tests, and hosted-development instructions. No Supabase project was linked or contacted; no migration or RLS policy was applied.

The workspace routes still render Phase 01 fixture content after authorization. There are no project tables, caption records, workflow behavior, realtime collaboration, AI, Notion integration, Vercel connection, or deployment.

## Database and authorization handoff

- Pending migration: `supabase/migrations/20261024000100_phase_02_auth_membership.sql`.
- Pending hosted policy tests: `supabase/tests/auth_membership_rls.test.sql` (10 synthetic pgTAP assertions).
- Seven Phase 02 tables have RLS declarations in the migration. Active members receive scoped reads; direct browser writes are denied; trusted SQL functions own allowlist claims and same-organization `org_admin` operations.
- App access is session plus current active membership. Suspended/expired/no-membership states are denied. Organization roles are separate rows; executives have no Phase 02 write path.
- The service-role key is not consumed by application code and is not exposed to the browser. The browser/server clients use only the public URL and publishable/legacy anonymous key.

## Verification evidence

- Passed: final Prettier check, ESLint, strict TypeScript, Vitest (6 files/23 tests), synthetic-environment production build, and Playwright (5/5).
- The first ordinary build failed because the ignored `.env.local` contains invalid public Supabase configuration. It was not inspected or changed. A synthetic non-secret environment isolated and passed the repository build.
- The first protected-route browser run caught loss of the requested return path (3 passed/2 failed); Proxy was fixed and the final unchanged-scope run passed all five tests.
- Database/RLS/Auth-hook execution is pending by design. No Docker or Supabase database command was run.
- `.env.local` and secret patterns are ignored, it is not tracked, no remote project reference exists, and the built client scan found no server-secret variable names.
- Final `git diff --check` exited 0 with no whitespace errors.

## Manual configuration still required

1. Resolve O-002, O-006, O-023, and O-025; A-021 already resolves the provider/fallback choice.
2. With separate authorization, choose an isolated hosted Supabase development project and place only its public URL/key in `.env.local`; do not expose a service-role key.
3. Review and apply the migration, configure the Before User Created hook and exact redirect URLs, configure the approved provider/domain/rate-limit/CAPTCHA controls, and bootstrap the first administrator through a reviewed one-time procedure.
4. Compare generated database types with `src/types/database.ts`, then run the pending database/RLS tests using synthetic data only.

## Known issues and remaining risks

- The current ignored `.env.local` must be corrected or its invalid Supabase entries removed before a normal build will pass.
- SQL syntax and policy behavior are not runtime-proven. Do not describe the database, Auth hook, or RLS as deployed or verified.
- Email-link sign-in is scaffolding while the institutional provider/domain policy remains unresolved.
- Provider abuse controls and authentication/security-event retention are not configured.
- npm continues to block the optional `unrs-resolver` postinstall script; required offline checks pass without approving it.

## Exact next permitted task

Review the offline Phase 02 changes and resolve the hosted identity/security configuration choices. Do not connect or mutate a hosted project without a new explicit authorization. Do not begin Phase 03, projects, captions, approval workflows, realtime, AI, Notion, or deployment.

## Latest update - 2026-10-25 Phase 02 identity providers

- A-021 resolves O-001: Google OAuth and Microsoft Azure OAuth are primary. The only accepted fallback is institutional email/password behind a deliberate lower-page disclosure; passwordless email magic links are excluded.
- `notes/instructions/identity-provider-setup.md` documents the later hosted-development configuration and synthetic test checklist. No provider console, Supabase project, secret, credential, remote database, migration, or source-code login change was made.
- O-002 and O-025 remain blockers for enabling any sign-in method. The current email-link implementation must be replaced before hosted authentication is enabled.

## Latest update - 2026-10-26 Phase 02 migration syntax correction

- Fixed the PostgreSQL `record variable cannot be part of multiple-item INTO list` error in `public.claim_current_membership()`. The existing joined-row lock remains intact; the function now selects one record and assigns its named allowlist and membership fields afterward.
- Added a static regression test. Focused Vitest passed (1 file, 6 tests) and `git diff --check` passed.
- The migration still needs an authorized hosted-development retry and database/RLS test run. No remote database was changed by this local correction.

## Latest update - 2026-10-26 Phase 03 special-case migration correction

- Reworked the inline special-case-reason `CASE` in `public.update_content_metadata()` into one normalized local variable used by both the update and audit comparison. This addresses the SQL-editor parser error reported at the former inline expression.
- Focused Phase 03 migration-boundary tests passed (1 file, 7 tests), strict TypeScript passed, and `git diff --check` passed.
- No local or hosted database command was run. Before retrying, apply the complete corrected migration rather than a highlighted fragment; if the prior SQL Editor run partially applied earlier statements, inspect the existing schema before rerunning it.

## Latest update - 2026-10-26 Phase 04 entry gate

- Accepted A-022: mandatory Publicity Director review for standard captions; A-023: scheduled publication-time changes do not invalidate approval; and A-024: in-app notifications are the MVP channel. The future email-provider setup guide is `notes/instructions/email-notification-provider-setup.md`.
- Phase 04 remains blocked before implementation. The active Phase 04 plan requires immutable caption versions plus hosted Phase 02/03 migration, RLS, and authorization verification. The repository deliberately lacks immutable caption versions because the narrower Phase 03 slice excluded caption drafting/version history.
- O-004 remains unresolved: President is not an approved organization role or project assignment, and the requested unanimous-Junior-Officer alternative needs a frozen eligible-person snapshot and a definition of what happens when a person is unavailable. Do not map either one silently to `executive` or another role.

## Latest update - 2026-10-26 PRO-authored approval clarification

- A-025 records the selected independent approval alternatives: Publicity Director only, explicitly designated executive President only, or unanimous active Junior Officers. The workflow freezes its selected alternative and Junior-Officer roster; suspended, expired, and resigned snapshot members are ignored.
- Remaining O-004 input: who may grant/revoke the President designation, and what audited mechanism may excuse a temporarily unavailable but still-active Junior Officer. Neither may be inferred from a display title or silently mapped to another role.

## Latest update — 2026-10-25 O-029 word-count utility

### Completed

- Added `src/lib/word-count.ts`, a shared client/server-safe utility for the accepted word-count algorithm and warning classification.
- Added `tests/unit/word-count.test.ts` with 17 focused tests for apostrophes, hyphens, numbers, emoji graphemes, URLs, hashtags, mentions, non-whitespace scripts, punctuation-only tokens, all four warning ranges, a different tag limit, and invalid policy rejection.
- Resolved O-029 as A-018. The 40-word approaching offset and 400-word global maximum are policy inputs, not fallback implementation constants.
- Updated the product, architecture, security, decisions, Phase 03 plan, and decision worksheet to distinguish this isolated utility from unimplemented policy storage/settings/editor work.

### Verification

- Passed: focused word-count test (17 tests), strict TypeScript, final Prettier check, ESLint, full Vitest suite (11 files/62 tests), and a synthetic-environment production build.
- The synthetic build used explicit non-secret public Supabase values. It did not inspect, alter, or expose `.env.local`, and it did not connect to Supabase.

### Remaining risks and exact boundary

- There is no database-backed policy resolver, settings screen, caption editor integration, or persisted evaluated policy snapshot yet. The utility requires callers to supply the resolved tag recommendation, approaching offset, and global hard maximum.
- No RLS, SQL migration, hosted database, Docker, deployment, commit, or push action was run.
- The exact next permitted work is a separately authorized implementation slice for policy persistence/resolution and caption-editor integration, or the previously pending hosted Phase 02/03 migration/RLS verification. Do not begin any other later feature without authorization.

## Latest update — 2026-10-25 O-009 destination policies

- Added an unapplied forward migration for the owner-supplied v1 destination catalog, versioned organization policy records, allowed content-kind mappings, underscore-compatible slugs, and an idempotent trusted initializer.
- Added a shared destination character validator. It counts all visible graphemes—including hashtags, mentions, URLs, punctuation, whitespace, and emoji—and reports only the selected destination(s) that exceed their configured limit.
- Focused tests passed (6); full Vitest passed (12 files/68 tests); type checking and lint completed without errors. The O-009 build rerun compiled successfully but lacks final runner exit evidence and remains unverified for this change.
- Database/RLS/initializer behavior remains pending an explicitly authorized hosted development verification pass. No Docker, hosted project, credentials, deployment, commit, or push was used.

## Context-reset handoff — 2026-10-26 Phase 04 partial implementation

### 1. Current phase and objective

Phase 04 — Approval workflow — is active and **not complete**. Its objective is configurable, frozen, version-bound approval workflows with change-request loops, PRO final approval, distinct audited Publicity Director overrides, durable in-app notifications, an actionable review queue, and a timeline. A narrow Phase 03 caption-version prerequisite was started because Phase 04 decisions must refer to immutable submitted versions.

### 2. Completed Phase 04 acceptance criteria

None are verified end to end. The working tree contains initial schema scaffolding and static tests only; no hosted database execution, authorization matrix, transition, UI workflow, or browser workflow acceptance criterion has been demonstrated.

### 3. Partially implemented acceptance criteria

- **Version-bound workflow records:** Partial. `workflow_instances.caption_version_id` references `caption_versions`, and caption-version tables/functions were drafted. They have not run against PostgreSQL.
- **Trusted draft and submission boundary:** Partial. Draft/save and immutable-submit RPC definitions, server actions, schemas, and a basic page form exist. The page hard-codes optimistic versions (`0`/`1`), always starts with an empty textarea, and does not display or load a draft/history; it cannot reliably support later saves or submissions.
- **RLS/direct-write restriction:** Partial/static only. Both new migrations enable RLS and revoke direct table writes, but no database policy test has executed.
- **Notification read state:** Partial. `workflow_notifications` and `mark_notification_read` exist in the migration, but no code creates workflow notifications or presents a notification UI.
- **President and Junior-Officer availability storage:** Partial. Tables exist, but there are no server-only grant/revoke or availability operations, authority checks, audits, or workflow-roster use.

### 4. Acceptance criteria not yet started or not implemented

- End-to-end standard writer submission → Director review → PRO final approval.
- Configured project-led workflow with only matching assigned heads authorized.
- Frozen template-step copy at submission and protection from later template edits.
- Atomic approve / request-changes / resubmit transitions, current-blocker calculation, status/step separation, concurrency and stale-decision rejection.
- New-version invalidation/reopen policy, including the approved scheduled-time metadata exception.
- PRO-author separation of duties and configured terminal-role checks.
- Director override authorization, mandatory reason, audit event, distinct presentation, and PRO notification.
- Immutable audit-event creation and full notification creation/read-state behavior.
- Review queues, timeline, decision forms, changes-requested loop, override UI, loading/empty/error/unauthorized states.
- Positive/negative authorization, transition, regression, database/RLS, and browser workflow tests required by the phase plan.

### 5. Phase 04 and prerequisite files in the current working tree

| File | Purpose / current state |
| --- | --- |
| `supabase/migrations/20261026000100_caption_versions_prerequisite.sql` | New, untracked Phase 03 prerequisite migration for mutable drafts and immutable submitted caption snapshots; not applied or runtime-tested. |
| `supabase/migrations/20261026000200_phase_04_workflows.sql` | New, untracked initial Phase 04 workflow schema/RLS scaffold; lacks template administration and transition functions; not applied or runtime-tested. |
| `src/features/projects/schemas.ts` | Adds input schemas for draft saving and snapshot submission. |
| `src/features/projects/actions.ts` | Adds server actions that validate form data, call the data layer, and redirect generically on error. |
| `src/features/projects/data.ts` | Adds RPC calls for draft save and version submit; uses `as never` because database types do not yet declare the new RPCs. |
| `src/app/projects/[projectId]/content/[contentId]/page.tsx` | Adds an early, incomplete caption-draft/submit form for editors. |
| `tests/unit/projects-schemas.test.ts` | Adds basic validation coverage for optimistic draft-version inputs. |
| `tests/unit/caption-version-prerequisite.test.ts` | New static migration-shape test only. |
| `tests/unit/workflow-prerequisite.test.ts` | New static workflow-migration-shape test only. |
| `harness/HANDOFF.md` and `harness/build-log.md` | This context-reset record and observed-command log. |

Other modified files in `git status` predate or are unrelated to this partial Phase 04 slice; preserve them. In particular, the tracked Phase 02/03 migrations contain separate SQL parser corrections and are not new Phase 04 migrations.

### 6. Migration state

- **User-reported already applied to hosted Supabase; not independently verified in this handoff:** `20261024000100_phase_02_auth_membership.sql` and `20261025000100_phase_03_projects_content.sql`.
- **New local migrations, not applied or verified:** `20261026000100_caption_versions_prerequisite.sql` and `20261026000200_phase_04_workflows.sql`.
- No migration was run, linked, reset, or applied during this partial Phase 04 work. Docker is intentionally unavailable and no local Supabase container command was used.

### 7. Current implementation inventory

- **Server actions and authorization:** Draft/save and submit actions validate UUID/version/body inputs and invoke server-only project data functions. The SQL RPCs call existing `private.can_edit_content`; no workflow transition authorization exists. Generic redirects currently collapse all action errors to `/access-denied`, including stale-version errors.
- **Workflow transitions:** None. The migration has status enums/tables but no function to instantiate frozen steps, decide a step, request changes, resubmit, calculate a current step, invalidate approval, or reject a stale decision atomically.
- **Audit events:** `workflow_decisions` is a prospective table only. It is not written by any transition and is not a complete immutable audit-event mechanism.
- **Notifications:** Prospective notification records and a recipient-only `mark_notification_read` RPC exist. There is no notification producer, recipient authorization test, queue, timeline, or UI.
- **Queues/timeline/UI:** No review queue or workflow timeline exists. The only new UI is the incomplete draft/submission form described above.
- **President/Junior Officer rules:** Storage tables exist but no server-only owner/director grant/revoke logic, availability action, required-reason enforcement at the operation boundary, or frozen unanimous roster implementation exists.

### 8. Commands and tests actually executed

- `rtk .\\node_modules\\.bin\\vitest.cmd run tests/unit/projects-schemas.test.ts --pool=forks` — exit 0; 1 file, 8 tests passed.
- `rtk .\\node_modules\\.bin\\vitest.cmd run tests/unit/workflow-prerequisite.test.ts --pool=forks` — exit 0; 1 file, 1 test passed. This is a static SQL-shape check, not a database/RLS test.
- `rtk npm.cmd run typecheck` — exit 0 after the caption-version action/schema changes.
- An earlier invocation of `rtk .\\node_modules\\.bin\\vitest.cmd run tests/unit/caption-version-prerequisite.test.ts --pool=forks` emitted only Vitest startup before the command runner returned; no pass/fail result was observed.
- An attempted chained `rtk npm.cmd run lint; rtk npm.cmd run test; rtk npm.cmd run build` emitted only the start of `lint`; no completion result was observed for any command in that chain.

### 9. Checks not executed or not verified for this partial work

- No final `format:check`, lint, full unit suite, production build, or browser/E2E workflow run completed after the partial Phase 04 changes.
- No PostgreSQL execution, hosted Supabase migration application, generated-type comparison, RLS test, auth/membership test, transition test, concurrency test, or manual authenticated UI test ran.
- No Docker, `supabase start`, `supabase stop`, or local reset command ran.

### 10. Known incomplete code and risks

- The new tables and RPCs are absent from `src/types/database.ts`; `data.ts` suppresses this gap with `as never`. Replace that workaround with reviewed types after the schema is settled.
- The page’s fixed `expectedVersion="0"` and `expectedDraftVersion="1"` make the UI stale after the first save/submit. It neither fetches draft state nor shows immutable version history.
- Submitted versions do not create workflow instances, audits, or notifications. Approval invalidation/reopen behavior is absent.
- The workflow schema is only a scaffold: template administration, frozen-step copying, decision authorization, role/assignment checks, President designation governance, Junior-Officer roster freezing, atomic transitions, audit immutability, and notification creation are absent.
- `workflow_notifications.kind` omits plan-required assignment, deadline, and override categories.
- The handcrafted migration needs PostgreSQL review before application; static string tests cannot prove its constraints, RLS, or function behavior.

### 11. Exact next implementation task

Continue the authorized Phase 03 caption-version prerequisite and Phase 04 workflow implementation without beginning Phase 05: first complete the persisted caption draft/version read model and type definitions, then add one forward-only workflow transition design that atomically freezes template steps for a submitted version and enforces the current step. Do not apply either new migration without separately authorized hosted-development execution.

### 12. Recommended remaining implementation order

1. Review the two unapplied migrations together; complete caption draft/version retrieval, safe database types, and page state/history before relying on the submit UI.
2. Add forward-only workflow schema/functions for templates, frozen eligibility snapshots, and atomic instance creation at version submission.
3. Implement one centralized transaction/RPC for authorize-and-decide (approve/request changes/resubmit), stale/version checks, status progression, immutable audit events, and durable notifications.
4. Add server-only President designation and Junior-Officer availability actions with the accepted authority/reason/audit rules; use frozen eligible rosters for unanimity.
5. Implement Director override distinctly, including reason, audit, PRO notification, and presentation.
6. Add server data access, validated actions, queues, timeline, decision forms, and complete loading/empty/error/denied states.
7. Add unit, static, database/RLS, transition/concurrency, and browser workflow tests; run the repository checks and only then update Phase status.

### 13. Genuine external blockers

- Runtime migration/RLS/authorization proof requires an authorized hosted Supabase development database session. The two new migration files are not applied. Docker is intentionally unavailable, so local container verification is unavailable.
- There is no blocker to the remaining local code/design work. No production operation, credential, deployment, commit, or Phase 05 work is authorized.

### Stop condition for this handoff

Stop here. Phase 04 is not complete, and no new feature implementation was performed after this handoff record.
