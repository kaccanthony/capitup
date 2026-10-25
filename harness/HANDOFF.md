# CapItUp Development Handoff

Last updated: 2026-10-25 +08:00
Current branch: master
Current phase: User-directed Phase 03 is offline-implemented; hosted database verification is pending
Current task: Stop before the collaborative editor, caption versions, workflow, or Phase 04.

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

1. Resolve O-001, O-002, O-006, O-023, and O-025.
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
