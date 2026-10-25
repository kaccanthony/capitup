# CapItUp build log

Record only observed work and command results. Planned verification belongs in phase files, not in this log.

## 2026-10-20 — Planning harness

### Scope

- Read `AGENTS.md` and `docs/PRODUCT_SPEC.md` completely.
- Created planning documents and one build plan for each product-spec phase, 0 through 8.
- Did not create application code, install dependencies, connect services, use credentials, deploy, commit, push, or begin Phase 0.

### Repository observations

- At planning start, the repository contained untracked `AGENTS.md` and `docs/PRODUCT_SPEC.md` and no application scaffold or package scripts.
- Exact package-manager and script commands therefore remain a Phase 0 decision/setup task.

### Commands and evidence

- `rtk proxy powershell.exe -NoProfile -Command "Get-Content ..."` — read the required instruction/specification files in bounded ranges; passed.
- `rtk proxy git status --short` — observed the initial untracked source files; passed.
- `rtk proxy rg --files` — observed only `AGENTS.md` and `docs/PRODUCT_SPEC.md` before planning files were added; passed.
- Phase-section audit — found exactly nine phase files, 0 through 8, with all ten required sections in every file; passed.
- Product-spec contradiction review — found no conflicting planned behavior. Recorded clarifications for legacy product naming, Phase 4/5 notification ownership, collaboration comment/suggestion persistence, and optional-integration pilot gating in `docs/DECISIONS.md`.
- `rtk proxy git diff --check` — exit 0 with no output. All repository files were untracked at this point, so Git had no tracked diff content to inspect.
- `rtk proxy rg -n "[[:blank:]]+$" ...` over every new planning file — exit 1 with no matches, confirming no trailing whitespace in the untracked planning artifacts.

### Planning files created

- `PLANS.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `harness/build-log.md`
- `harness/build/phase-00-repository-foundation.md`
- `harness/build/phase-01-ui-foundation.md`
- `harness/build/phase-02-auth-membership-rls.md`
- `harness/build/phase-03-caption-drafting-versions.md`
- `harness/build/phase-04-approval-workflow.md`
- `harness/build/phase-05-realtime-collaboration.md`
- `harness/build/phase-06-ai-assistance.md`
- `harness/build/phase-07-notion-integration.md`
- `harness/build/phase-08-hardening-pilot.md`

### Implementation status

- Phase 0: not started.
- Phases 1–8: not started.

## 2026-10-20–21 — Phase 0 repository foundation

### Scope completed

- Created the `capitup` Next.js App Router foundation with TypeScript strict mode, Tailwind CSS, shadcn/ui, ESLint, Prettier, Vitest/Testing Library, and Playwright.
- Added a minimal CapItUp smoke page and unit/browser smoke coverage. No Phase 1 interface or product workflow was implemented.
- Initialized project-local Supabase configuration only. No Supabase project was linked, no local stack was started, and no schema, authentication, or business tables were created.
- Added placeholder-only environment documentation and ignore rules for local secrets and generated output.
- Resolved O-011 in `docs/DECISIONS.md`: npm is the repository package manager and `package-lock.json` is the sole lockfile.
- Read the installed Next.js 16.4.2 guidance for installation, project structure, layouts/pages, CSS, and fonts before finalizing the scaffold.

### Environment and installed tooling

- Node.js `v24.21.0`; npm `12.0.2`.
- Next.js `16.4.2`; React and React DOM `19.3.0`; TypeScript `5.9.3`; Tailwind CSS `4.3.3`; shadcn `4.22.1`.
- Vitest `5.0.5`; Playwright `1.64.1`; Supabase CLI `2.121.0`.
- Playwright downloaded its Chromium test runtime. No application dependency or service used real credentials.

### Commands and observed results

- `rtk proxy npx.cmd create-next-app@latest ... --skip-install --empty` — the sandboxed attempt failed with registry `EACCES`; the authorized network retry created a Next.js `16.4.2` scaffold successfully. The temporary scaffold was copied into the repository and then removed after its resolved path was verified.
- `rtk proxy npm.cmd install` — the first attempt failed because Vitest 5 requires `@types/node` 22.0 or 24.0+ while the generated constraint was `^20`; changing the development constraint to `^24` resolved the install. The final dependency tree had no missing direct packages.
- `rtk proxy npx.cmd shadcn@latest init --defaults --yes --no-monorepo --no-reinstall` — passed; generated `components.json`, the shared `cn` utility, and the baseline button component.
- `rtk proxy npx.cmd supabase init` — the sandboxed attempt could not create the CLI telemetry directory outside the workspace; the authorized retry passed. `supabase/.temp/project-ref` is absent, confirming that no remote project was linked.
- `rtk proxy npx.cmd playwright install chromium` — passed; installed the Chromium browser runtime needed by the smoke test.
- Early `next build` attempts exposed two reproducibility issues: the generated Google font required network access, and shadcn's Tailwind animation import required the installed Turbopack CSS loader. The scaffold now uses the system font stack and an explicit `@tailwindcss/turbopack` rule; the subsequent production build passed without warnings.
- The first browser smoke assertion passed but the Windows `webServer` teardown did not return. `scripts/run-e2e.mjs` now owns the production server process and terminates its process tree after Playwright exits. The final `rtk proxy npm.cmd run test:e2e` exited 0, rebuilt successfully, and reported `1 passed` in Chromium.
- `rtk proxy npm.cmd run format:check` — exited 0; all included files matched Prettier formatting.
- `rtk proxy npm.cmd run lint` — exited 0 with no findings.
- `rtk proxy npm.cmd run typecheck` — exited 0.
- `rtk proxy npm.cmd run test` — exited 0; 1 test file and 1 unit test passed.
- `rtk proxy npm.cmd run build` — exited 0; Next.js compiled, type-checked, and generated the static `/` route successfully.
- `rtk proxy npm.cmd audit --omit=dev` — exited 0 with no production dependency vulnerabilities.
- `rtk proxy npm.cmd audit` — exited 1 with 9 high-severity findings in development-only transitive tooling through `braces`/`fast-glob`/`micromatch`. The offered forced fix would downgrade shadcn to `1.0.0`, so no unsafe or breaking audit fix was applied.
- Placeholder validation found no populated values in `.env.example`. A common-token-pattern scan excluding dependencies, generated output, the lockfile, and the product specification found no credential-shaped values in repository-authored implementation files.
- `rtk proxy git diff --check` — exited 0 with no output. The repository still has no baseline commit, so Git cannot inspect whitespace in untracked files; Prettier and the direct whitespace check cover the new authored files instead.

### Remaining warnings and boundaries

- npm reported that the current ESLint 9 release line is no longer supported upstream, although it is the major selected by the generated Next.js scaffold and the lint gate passes.
- npm blocked the optional `unrs-resolver` postinstall script under its dependency-build policy. No approval was granted because all required gates pass without it.
- Docker-backed Supabase startup, migrations, RLS, authentication, external services, credentials, deployment, commit, and push were not performed.
- Phase 0: complete.
- Phases 1–8: not started.

## 2026-10-21 — Phase 01 project foundation

### Scope completed

- Added typed Zod environment schemas with separate browser-safe and `server-only` server modules. Future integration values are optional until used; configured empty or malformed values fail with key-only errors.
- Added focused environment tests for configured, absent, malformed, and client/server-boundary cases using synthetic values only.
- Upgraded the smoke page into a minimal semantic CapItUp shell with `header`, `main`, `footer`, a keyboard-focusable skip link, Tailwind styling, a shadcn/ui button, readable contrast, and reduced-motion CSS.
- Extended browser smoke coverage for semantic landmarks, a 320px viewport, keyboard focus, and reduced-motion preference.
- Updated README local-environment and local-Supabase instructions. No authentication, business schema, RLS, product workflow, realtime, AI, Notion, deployment, or hosted connection was started.

### Dependencies and versions

- Added runtime dependencies: `zod@4.6.7` for environment schemas and `server-only@0.0.1` for the Next.js server-import boundary.
- Confirmed: Next.js `16.4.2`, TypeScript `5.9.3`, Tailwind CSS `4.3.3`, shadcn `4.22.1`, Supabase CLI `2.121.0`, Vitest `5.0.5`, and Playwright `1.64.1`.

### Commands and observed results

- `rtk proxy npm.cmd install zod` — sandboxed attempt failed with registry/cache `EACCES`; authorized retry completed and retained the new direct dependency. npm reported 9 existing high-severity development-tooling findings and blocked the optional `unrs-resolver` postinstall script.
- `rtk proxy npm.cmd install server-only` — authorized install passed; added one package. The same development-tooling audit warning and optional blocked postinstall remained.
- `rtk proxy npm.cmd run test -- env` — first run failed because Vitest/jsdom provided a non-file `import.meta.url` to the static-boundary test. Replaced that test's source-file lookup with repository-relative paths; rerun passed with 4 tests.
- `rtk proxy npm.cmd run format` and `rtk proxy npm.cmd run format:check` — passed.
- `rtk proxy npm.cmd run lint` — passed.
- `rtk proxy npm.cmd run typecheck` — passed.
- `rtk proxy npm.cmd run test` — passed: 2 test files and 5 tests.
- `rtk proxy npm.cmd run build` — passed: Next.js production build completed and generated the static `/` route.
- `rtk proxy npm.cmd run test:e2e` — passed: production build plus 2 Chromium tests for shell semantics and mobile/reduced-motion/keyboard behavior.
- `rtk proxy npm.cmd run supabase -- start` — the sandboxed attempt failed while writing Supabase telemetry outside the repository. The authorized retry reached the local runtime check and failed because neither Docker nor Podman is on `PATH`.
- `rtk proxy npm.cmd run supabase -- status` and `rtk proxy npm.cmd run supabase -- stop` — both confirmed no hosted link (`linked_project: null`) but could not inspect/list local containers because Docker and Podman are unavailable.
- `rtk proxy npm.cmd audit --omit=dev` — sandboxed advisory lookup failed with `EACCES`; authorized retry passed with `found 0 vulnerabilities` for production dependencies.
- `.env.example` key-only scan found all 11 required keys with empty values. Authored-file credential-pattern scan and built-client secret-name scan returned no matches. Ignore-rule inspection covered `.env.local`, `.next`, test output, and Supabase temporary state; `supabase/.temp/project-ref` is absent.
- `rtk proxy git diff --check` — passed, including the final post-log and handoff rerun.

### Remaining verification and boundaries

- Local Supabase start/status/stop remains unverified until Docker Desktop or Podman is installed and available on `PATH`. No remote project was used as a substitute.
- Full development-tooling audit findings remain the previously recorded 9 high-severity transitive issues. The production-only audit is clean; no forced breaking audit update was applied.
- Phase 01: complete except for the environment-specific local-container verification above.
- Phase 02 and later phases: not started.

## 2026-10-22 — Phase 01 visual foundation

### Scope completed

- Inspected the dashboard and login references directly. The requested `docs/design-references/` paths were absent; the matching images were present under the repository-root `design-references/` directory.
- Implemented the approved `docs/UI_SPEC.md` design as an original dark CapItUp dashboard at `/` and a centered invitation-only login presentation at `/login`.
- Added a desktop navigation rail, responsive mobile navigation, action-first central workspace, static caption/deadline/activity fixtures, and a right-side draft-assistant preview.
- Kept every later-phase action disabled or explicitly labeled as a preview. No authentication, authorization claim, database business schema, AI request, Notion connection, realtime collaboration, external service, credential, or deployment was added.
- Added no dependencies and did not modify the unrelated files already present in `design-references/`.

### Files and behavior

- Added `src/components/capitup/brand-mark.tsx`, `src/features/dashboard/dashboard-shell.tsx`, `src/features/auth/login-shell.tsx`, and `src/app/login/page.tsx`.
- Updated `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, and `src/components/ui/button.tsx` for the responsive visual system and route metadata.
- Updated `tests/unit/home.test.tsx` and `tests/e2e/foundation.spec.ts`; added `tests/unit/login.test.tsx`.
- Updated `harness/build-log.md` and `harness/HANDOFF.md` with observed evidence.

### Commands and observed results

- Read the applicable repository instructions, UI specification, current Phase 01 plan, installed Next.js 16.4.2 layout/CSS/navigation/accessibility documentation, current handoff, and build log before implementation.
- `rtk proxy .\node_modules\.bin\prettier.cmd --write <Phase-01 UI files>` — passed; formatted only the listed UI and test files.
- `rtk proxy npm.cmd run test -- tests/unit/home.test.tsx tests/unit/login.test.tsx --reporter=verbose` — passed; 2 files and 2 focused tests.
- `rtk proxy npm.cmd run typecheck` — passed.
- `rtk proxy npm.cmd run lint` — passed.
- `rtk proxy npm.cmd run build` — passed; `/` and `/login` were statically generated.
- `rtk proxy npm.cmd run format:check` — passed.
- `rtk proxy npm.cmd run test` — passed; 3 files and 6 tests.
- Local Playwright screenshot commands at 1440×1000, 900×900, 375×812, 1280×800, and 375×812 — passed. The rendered dashboard desktop/tablet/mobile views and login desktop/mobile views were inspected directly from ignored `test-results/ui-review/` output.
- First `rtk proxy npm.cmd run test:e2e` — failed 1 of 4 tests because the login route supplied a full product title to the root metadata template, yielding `Sign in · CapItUp · CapItUp`. The dashboard layout, responsive viewport, keyboard, and reduced-motion tests passed in that run.
- Changed the login route metadata title from `Sign in · CapItUp` to `Sign in` so the root template adds the product name exactly once.
- Final `rtk proxy npm.cmd run test:e2e` — passed; production build succeeded and all 4 Chromium tests passed. Coverage includes dashboard widths of 1440, 900, 375, and 320 px and login widths of 1280 and 375 px, with no horizontal overflow.

### Remaining verification and boundaries

- Official organization colors, logo rules, and typefaces remain unresolved under O-010; the implemented text mark and lavender/violet tokens are provisional.
- The earlier Docker/Podman blocker still prevents local Supabase lifecycle verification. No hosted service was used as a substitute.
- Authentication and authorization behavior remains intentionally absent until Phase 02. The current login and role/workflow content is static presentation only.
- Phase 02 and later phases were not started.

## 2026-10-23 — Phase 01 indigo routes refinement

### Scope completed

- Shifted the provisional presentation palette toward deep indigo, using `#4B0082` as the violet foundation while preserving semantic attention, success, and danger colors.
- Replaced same-page left-rail anchors with static App Router destinations: `/`, `/captions`, `/projects`, `/calendar`, and `/archive`.
- Added route-specific fixture-only workspace previews with active navigation state. The archive, search, scheduling, project, caption, assistant, and creation surfaces remain non-functional Phase 01 presentation.
- Updated the UI specification, unit tests, and browser coverage for route-level navigation. No dependencies, credentials, services, data tables, authentication, AI, realtime behavior, or deployment were added.

### Commands and observed results

- `rtk proxy npm.cmd run typecheck` — passed before and after the implementation; strict TypeScript completed with no errors.
- `rtk proxy npm.cmd run format:check` — initially reported style drift in four touched files; `rtk proxy npm.cmd run format` corrected it. Final format check passed.
- `rtk proxy npm.cmd run lint` — passed.
- `rtk proxy npm.cmd run test` — first run caught an Archive route test query that did not account for the rail tooltip's accessible name; the test was corrected. Final run passed: 4 files and 10 tests.
- `rtk proxy npm.cmd run build` — passed; static routes include `/`, `/captions`, `/projects`, `/calendar`, `/archive`, and `/login`.
- `rtk proxy npm.cmd run test:e2e` — passed with exit code 0 after the production build. It exercised five Chromium tests, including direct rail navigation across all four new routes and the existing desktop/tablet/mobile, keyboard, reduced-motion, and login coverage. A final rerun after the route-context label polish also recorded Playwright status `passed` with no failed tests. The runner emitted only the existing `NO_COLOR`/`FORCE_COLOR` environment warning.

### Remaining verification and boundaries

- Responsive behavior was checked by the browser suite at the existing desktop, tablet, and mobile viewports; no manual screenshot inspection was repeated for this refinement.
- The deep-indigo palette is a user-directed provisional visual adjustment. Official identity assets, final colors, and typeface remain unresolved under O-010.
- Local Supabase lifecycle verification remains blocked by the previously recorded absence of Docker/Podman. No hosted substitute was used.
- Stop here: Phase 02 and later work remain out of scope.

## 2026-10-23 — Root hydration warning boundary

- Diagnosed the reported development-console hydration warning as a browser extension injecting `cz-shortcut-listen="true"` onto the server-rendered `<body>` before React hydrates.
- Added React's `suppressHydrationWarning` only to the root `<body>` in `src/app/layout.tsx`. This narrowly suppresses third-party attribute mismatch warnings at that DOM boundary; application component hydration remains checked normally.
- Executed `rtk proxy npm.cmd run format:check`, `rtk proxy npm.cmd run lint`, `rtk proxy npm.cmd run typecheck`, `rtk proxy npm.cmd run test`, and `rtk proxy npm.cmd run build`; each completed without a command error. `rtk proxy git diff --check` passed with only existing line-ending warnings.

## 2026-10-24 — Phase 01 closeout audit

### Verified status and acceptance criteria

- Marked Phase 01 and Gate A complete for the fixture-only foundation. Next.js App Router, strict TypeScript, Tailwind CSS, the shared shadcn/ui button, typed public/server environment validation, npm quality scripts, static fixture routes, responsive navigation, accessibility affordances, and documentation are present and verified.
- `.env.example` contains the 11 documented keys with empty values. `.env.local` is present and ignored; its values were deliberately not read or recorded. Targeted authored-file and built-client scans found no populated server-secret patterns or bundled server-secret variable names.
- The project-local Supabase configuration exists, `supabase/.temp/project-ref` is absent, and no hosted project link, migration, business table, seed data, Storage bucket, or RLS policy was found.
- Local Supabase `start`, `status`, and `stop` remain unverified. Docker and Podman are absent, and the user elected not to install either runtime. Phase 01 acceptance permits closeout when this missing prerequisite is recorded without substituting a hosted project.
- Phase 02 behavior remains absent: no authentication, membership enforcement, business schema, RLS, realtime collaboration, AI, Notion connection, Vercel project, or deployment was started.

### Files changed during the completed phase

- `package.json`, `package-lock.json`, configuration files, `components.json`, and `scripts/run-e2e.mjs`: established npm-managed Next.js, Tailwind, shadcn/ui, Vitest, Playwright, Supabase CLI, and deterministic verification tooling.
- `.env.example`, `.gitignore`, and `src/lib/env/`: documented empty environment keys, ignored local secrets/generated output, and separated browser-safe validation from server-only validation.
- `src/app/`, `src/components/`, and `src/features/`: implemented the static responsive dashboard, login presentation, route-level workspace previews, shared brand/button surfaces, indigo visual system, and narrow root hydration-warning boundary.
- `tests/unit/` and `tests/e2e/foundation.spec.ts`: cover environment validation, shell semantics, disabled future actions, workspace routes, login presentation, responsive overflow, keyboard focus, and reduced motion.
- `README.md`, `docs/`, `PLANS.md`, and `harness/`: record architecture, security, decisions, provisional UI direction, phase scope, evidence, and handoff.
- `debug.log` remains an untracked Chromium artifact containing two GPU shared-image mailbox warnings. It was inspected but not modified or treated as product evidence.

### Migrations and RLS

- Migrations added or applied: none.
- Tables, Auth hooks, Storage buckets, seed data, and generated database types affected: none.
- RLS policies added, changed, tested, or applied: none.
- Remote database/project operations: none.

### Closeout commands and observed results

- `rtk proxy npm.cmd run format:check` — exit 0 both before and after the closeout documentation edits; all files matched Prettier.
- `rtk proxy npm.cmd run lint` — final explicitly polled run exited 0 with no ESLint findings.
- `rtk proxy npm.cmd run typecheck` — exit 0.
- `rtk proxy npm.cmd run test` — exit 0; 4 files and 10 tests passed.
- `rtk proxy npm.cmd run build` — final explicitly polled run exited 0; `/`, `/login`, `/captions`, `/projects`, `/calendar`, and `/archive` were statically generated.
- First closeout `rtk proxy npm.cmd run test:e2e` — exit 1; 4 tests passed and the navigation-rail test timed out waiting for `/captions` after a click.
- Immediate unchanged `rtk proxy npm.cmd run test:e2e` rerun — exit 0; all 5 Chromium tests passed. The initial navigation timeout remains an intermittent risk.
- Environment/secret audit — confirmed `.env.local`, `.next`, `test-results`, and Supabase temporary state are ignored; `.env.example` values are empty; `supabase/.temp/project-ref` is absent; targeted authored-file and `.next/static` scans returned no matches.
- Runtime prerequisite audit — `docker=absent`, `podman=absent`; no local stack or remote substitute was started.
- `node --version`, `npm.cmd --version`, and `npm.cmd list --depth=0` — exit 0; Node `v24.21.0`, npm `12.0.2`, Next.js `16.4.2`, TypeScript `5.9.3`, Tailwind `4.3.3`, shadcn `4.22.1`, Supabase CLI `2.121.0`, Vitest `5.0.5`, and Playwright `1.64.1`.
- `rtk proxy git diff --check` — exit 0 after the closeout edits; only existing LF-to-CRLF warnings were reported.
- `rtk proxy git status --short` — exit 0; recorded the dirty worktree without modifying or discarding existing changes.

### Known issues, blockers, and security concerns

- Local Supabase lifecycle proof is unavailable without Docker or Podman. This is incomplete verification, not a failed hosted connection.
- The first closeout browser run had one navigation timeout; the unchanged rerun passed all five tests.
- Official logo rules, typeface, and final identity remain unresolved under O-010; the indigo system is provisional.
- Nine previously recorded high-severity development-only transitive audit findings remain. The production-only audit was not rerun during closeout, and no forced breaking audit fix was applied.
- `.env.local` exists and is ignored. Its contents were not inspected; future hosted Supabase credentials must remain local/server-scoped as appropriate and must not enter `.env.example`, logs, client bundles, or chat.
- O-028 blocks the next implementation phase. O-001, O-002, O-006, and O-025 must also be resolved before Phase 02 authentication/security implementation.

### Exact next permitted task

Planning only: reconcile permanent phase numbering under O-028, decide how hosted Supabase development without Docker will preserve migration/RLS reproducibility and production separation, resolve O-001/O-002/O-006/O-025, and update the Phase 02 plan for review. Do not connect Supabase, add credentials, install a client, create migrations or RLS, configure Vercel, deploy, commit, push, or begin Phase 02 until that plan is explicitly approved.

## 2026-10-24 — Phase 02 offline authentication and membership implementation

### Completed offline acceptance criteria

- Added one version-controlled migration for organizations, identity requirements, profiles, exact-identity allowlisting, memberships, the five organization roles, account/membership status, authentication security events, constraints, indexes, trusted functions, table grants, and RLS policies.
- Added Supabase browser and request-scoped server clients using only the publishable/legacy anonymous key. No application service-role client was created, and server-only modules are guarded from browser imports.
- Added a passwordless email-link server action, Auth callback, logout action, optimistic Proxy session refresh, page-level active-membership authorization, suspended/expired-member rejection, safe internal return paths, and generic access-denied handling.
- Protected `/`, `/captions`, `/projects`, `/calendar`, and `/archive`. Existing workspace content remains fixture-only; no project or caption workflow behavior was added.
- Added pure authorization tests for active, unauthenticated, unauthorized, suspended, expired, role-escalation, and cross-organization cases; static server/browser boundary tests; and protected-route browser tests.
- Added synthetic pgTAP/RLS cases for active, disabled, cross-organization, direct role-escalation, non-admin invitation, Auth-hook, and audit access boundaries. These tests are tracked but were not executed because no database was connected.
- Added placeholder-only environment documentation, secret ignore rules, migration-derived TypeScript database types, hosted-development instructions, and architecture/security/decision updates.

### Files changed for Phase 02 and why

- `.env.example`, `.gitignore`: documented public Supabase placeholders and server-only secret naming; ensured local environments and secret files remain ignored while `.env.example` remains tracked.
- `package.json`, `package-lock.json`: added `@supabase/ssr` and `@supabase/supabase-js`.
- `supabase/config.toml`, `supabase/migrations/20261024000100_phase_02_auth_membership.sql`, `supabase/tests/auth_membership_rls.test.sql`: declared the Auth hook, Phase 02 schema/RLS migration, and pending hosted policy tests.
- `src/types/database.ts`, `src/lib/env/*`, `src/lib/supabase/*`, `src/proxy.ts`: added migration-derived types, public configuration validation, Supabase clients, cookie refresh, and optimistic route protection.
- `src/lib/auth/*`, `src/features/auth/*`: added schemas, policy classification, trusted authorization/admin helpers, sign-in, callback support, protected workspace composition, and logout.
- `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/access-denied/page.tsx`, and the four existing workspace route pages: connected public Auth surfaces and page-level membership enforcement.
- `src/features/dashboard/dashboard-shell.tsx`, `src/app/globals.css`: exposed a logout control slot and styled the enabled institutional-email form/access-denied link without changing the fixture workspace behavior.
- `tests/unit/*`, `tests/e2e/foundation.spec.ts`: added authorization/security/environment/login coverage and replaced public-dashboard E2E assumptions with protected-route checks.
- `docs/HOSTED_SUPABASE_DEVELOPMENT.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `PLANS.md`: documented the offline boundary, hosted manual steps, accepted implementation authority, unresolved choices, and current status.
- `harness/build-log.md`, `harness/HANDOFF.md`: recorded actual work, failures, checks, pending database proof, and the stop boundary.

### Migration and RLS impact

- Migration created but not applied: `20261024000100_phase_02_auth_membership.sql`.
- Tables defined: `organizations`, `organization_identity_requirements`, `profiles`, `member_allowlist`, `organization_memberships`, `organization_role_assignments`, and `access_security_events`.
- RLS is enabled in the migration for all seven tables. Explicit policies permit only scoped reads for current active memberships; browser-direct writes remain denied. Trusted claims and administration use narrowly granted SQL functions.
- The Before User Created hook checks an active, unexpired exact full-email allowlist entry. Membership claim binds the verified session identity to `auth.uid()` atomically. Username/local-part matching is not used.
- Database runtime status: **pending**. No local or hosted database was started, linked, contacted, migrated, seeded, or tested.

### Commands and observed results

- `rtk npm.cmd install @supabase/ssr @supabase/supabase-js` — passed after approved network access; 10 packages added, 702 packages audited, 0 vulnerabilities reported. npm retained its existing blocked optional `unrs-resolver` postinstall notice.
- Initial `rtk` calls — failed before command execution because `CLAUDE_CONFIG_DIR`/`HOME` was unavailable. Subsequent calls supplied the existing Codex config path through `CLAUDE_CONFIG_DIR`; no global setting was changed.
- `rtk npm.cmd run test:unit` — failed because the repository has no `test:unit` script. The existing `test` script was then used.
- `rtk proxy npm.cmd test -- --run` — passed before the final audit-RPC addition: 6 files, 22 tests.
- Initial `rtk proxy npm.cmd run format:check` — failed with nine Phase 02 files requiring formatting. Targeted Prettier write completed, and the final full format check passed.
- `rtk proxy npm.cmd run lint` — passed with no ESLint findings.
- `rtk npm.cmd run typecheck` — passed before and after the return-path fix.
- Initial credential-free `rtk proxy npm.cmd run build` — failed during prerender because the ignored `.env.local` has invalid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values. The file was not read, printed, or modified.
- Production build with explicit synthetic non-secret Supabase URL/publishable/anonymous values — completed compilation, TypeScript, all 10 page generations, and the final route table without an error. A prior synthetic run explicitly reported `build_exit=0`.
- First protected-route Playwright run — failed: 3 passed and 2 failed because Proxy redirected to `/login` without preserving the requested path. Proxy was corrected to add a URL-encoded internal `next` value.
- Final `node scripts/run-e2e.mjs` against the synthetic-environment production build — all 5 Chromium tests passed; the final run reported 1.3 minutes in the loaded local environment.
- Final `rtk proxy npm.cmd run format:check`, `rtk npm.cmd run lint`, `rtk npm.cmd run typecheck`, and `rtk proxy npm.cmd test` — passed; Vitest reported 6 files and 23 tests.
- Ignore/client-bundle audit — `.env.local`, environment-specific local files, and `.secrets*` are ignored; `.env.local` is not tracked; `supabase/.temp/project-ref` is absent; the `.next/static` scan found no server-secret variable names.
- Final `rtk git diff --check` — exit 0 with no whitespace errors.
- Final `rtk git status --short` — exit 0 and recorded the existing dirty Phase 01/UI files alongside the Phase 02 work; unrelated `debug.log` and `design-references/` content was not changed.
- No `supabase start`, `supabase stop`, local container, database reset, remote-link, remote migration, deployment, commit, or push command was run.

### Incomplete requirements, manual configuration, and risks

- Migration syntax, Auth hook execution, RLS behavior, transactional claim behavior, database audit events, and hosted rate limiting remain unverified until the migration is applied to an explicitly authorized isolated hosted development project.
- O-001 provider/fallback, O-002 institutional domains and normalization/exception policy, O-006 primary-role display, O-023 security-event retention/access, and O-025 CAPTCHA/rate-limit thresholds/unblock procedure remain unresolved. The email-link action is deployment-inactive scaffolding, not a final provider decision.
- Manual hosted setup still requires project creation/selection, local `.env.local` correction, redirect URL configuration, provider and domain decisions, migration review/application, Before User Created hook enablement, abuse-control configuration, a reviewed first-admin bootstrap, generated-type comparison, and execution of the pending RLS tests.
- The ignored `.env.local` currently prevents an ordinary build because at least two public Supabase values fail schema validation. Replace them locally with real development-project public values or remove them until hosted wiring is authorized; do not put them in `.env.example`.
- Service-role access is not needed by the implemented runtime. If a future trusted operation requires it, the key must remain server-only and must never receive a `NEXT_PUBLIC_` prefix.

### Stop condition

Stop after the offline Phase 02 implementation. Do not connect or mutate Supabase, deploy, or begin projects, caption workflows, realtime collaboration, AI, or Notion work. The exact next permitted task is review/resolution of the open Phase 02 hosted configuration choices; any hosted project write requires separate explicit authorization.

## 2026-10-25 — Phase 03 offline projects and content implementation

### Scope completed

- Implemented the user-selected `harness/build/phase-03-projects-content.md` slice only.
- Authored an additive Phase 03 migration for projects, temporal project assignments, controlled content metadata, destinations, deliverable links, writer/reviewer responsibilities, audit events, indexes, constraints, trusted RPCs, grants, and RLS.
- Added server-only data access, Zod-validated Server Actions, shared capability policy, controlled taxonomy metadata, and migration-derived TypeScript types.
- Replaced the fixture `/projects` route with minimum authorized project/content list, create, view, edit, assignment, responsibility, and deliverable-link interfaces.
- Did not add caption bodies, immutable caption versions, workflow transitions, collaborative editing, realtime, AI, Notion, attachments, deployment, or publication-channel seeds.

### Migration and RLS status

- Authored only: `supabase/migrations/20261025000100_phase_03_projects_content.sql`.
- Pending runtime suite: `supabase/tests/projects_content_rls.test.sql` with 18 synthetic pgTAP assertions.
- The migration declares RLS on twelve new API-facing tables. Authenticated users receive filtered `SELECT` grants only; mutations use actor-derived trusted functions and append-only audit writes.
- No Supabase CLI database command, Docker command, remote link, migration application, credential read, or external write was performed. SQL syntax, constraints, RPC execution, and policy behavior remain pending hosted verification.

### Commands actually executed and observed results

- `rtk --version` — exit 0; RTK 0.48.0.
- Repository inspection commands using `rtk git status`, `rtk rg`, and `rtk proxy powershell.exe ... Get-Content` — exit 0 except searches intentionally returning no matches; inspected instructions, plans, scripts, Phase 02 boundaries, Next.js bundled guidance, and current files.
- `rtk proxy npm.cmd run format -- --write ...` — exit 0. Because the repository script is `prettier --write .`, Prettier checked the full workspace and changed only the authored Phase 03 files it reported as changed.
- Initial `rtk proxy npm.cmd run typecheck` — exit 0.
- Initial focused Phase 03 test run — exit 1; 17 of 19 tests passed. Two positive schema cases exposed that explicit nullable values were rejected. Schemas were corrected to normalize both null and undefined.
- Focused Phase 03 authorization/schema/security rerun — exit 0; 3 files and 19 tests passed.
- Initial Phase 03 UI test — exit 1 before tests ran because the client form reached a `server-only` module through a shared type/style import. Shared serializable taxonomy types and style constants were moved to neutral modules.
- Phase 03 UI test rerun — exit 0; 1 file and 2 tests passed.
- Final parallel `rtk proxy npm.cmd run format:check` — exit 0; all matched files use Prettier style.
- Final parallel `rtk proxy npm.cmd run lint` — exit 0.
- Final parallel `rtk proxy npm.cmd run typecheck` — exit 0.
- Final parallel `rtk proxy npm.cmd run test` — exit 0; 10 files and 45 tests passed after adding an exact taxonomy/migration-association assertion.
- Synthetic-environment `rtk proxy npm.cmd run build` — exit 0; Next.js compiled, type-checked, and generated all routes including the five Phase 03 project/content routes. Synthetic public values were used; no real service was contacted.
- Synthetic-environment `rtk proxy npm.cmd run test:e2e` — exit 0; the command rebuilt successfully and all 5 existing Chromium tests passed. These tests prove unauthenticated route protection and login/access-denied behavior, not authenticated database-backed Phase 03 flows.
- Final documentation Prettier write and repository `format:check` — exit 0; all matched files use Prettier style.
- Final `rtk git diff --check` — exit 0 with no whitespace errors in tracked diffs.

### Implemented authorization evidence

- Offline tests cover cross-organization rejection, viewer read-only behavior, organization/project-role separation, organization administrator non-editor behavior, executive denial without a head assignment, executive edit only with a head assignment plus explicit writer responsibility, and unauthorized assignment changes.
- Server/database validation covers exact content kinds and controlled tags, duplicate/empty/arbitrary tags, invalid kind/tag combinations, optimistic record versions, special-case reason pairing, and HTTP(S)-only credential-free deliverable links.
- Static checks confirm direct browser writes are not granted, the Phase 03 audit table is not browser-readable, Server Actions contain no service-role reference, and the data layer is guarded by `server-only`.

### Incomplete verification and risks

- The 18 pgTAP/RLS assertions were not executed because Docker is intentionally unavailable and no hosted development database was authorized. Cross-organization isolation and assignment behavior are offline policy/static evidence only until that suite runs against PostgreSQL.
- Authenticated desktop/tablet/mobile Phase 03 pages were not exercised against live data. The production build and component tests passed; the existing browser suite covers only unauthenticated paths.
- O-009 blocks publication-channel seed data. O-026 keeps attachments/Storage out of scope. O-007/O-008 keep length-exception approval and numeric length policies disabled.
- Manual database types must be compared with hosted generated types after migration application.
- The migration uses PostgreSQL `btree_gist` exclusion constraints to prevent overlapping temporal assignments. Provider availability and actual migration execution remain unverified.

### Stop condition

Stop after this offline Phase 03 implementation. The exact next permitted task is review or an explicitly authorized isolated hosted-development migration/RLS verification pass for Phases 02 and 03. Do not begin caption drafting/version history, formal workflow, the collaborative editor, realtime, AI, Notion, attachments, deployment, commit, or push.

## 2026-10-25 — O-029 word-count and warning utility

### Scope completed

- Implemented the user-authorized shared `src/lib/word-count.ts` utility and focused unit coverage only.
- Count rules cover apostrophes, hyphen-separated components, numeric/alphanumeric terms, standalone emoji graphemes, URLs, hashtags, mentions, and continuous non-whitespace writing-system text.
- Warning classification consumes the resolved tag recommendation, approaching offset, and global hard maximum as input. The utility contains no fallback recommendation, 40-word offset, or 400-word maximum.
- Recorded A-018, which resolves O-029, and updated the product, architecture, security, Phase 03 plan, and decision worksheet to keep the implementation boundary explicit.

### Commands actually executed and observed results

- `rtk npm.cmd run format -- src/lib/word-count.ts tests/unit/word-count.test.ts` — exit 0. The repository script runs Prettier over the workspace; it formatted the new utility and test and reported other files unchanged.
- `rtk npm.cmd run test -- tests/unit/word-count.test.ts --reporter=verbose` — exit 0; 1 file and 17 focused tests passed.
- `rtk npm.cmd run typecheck` — exit 0.
- `rtk npm.cmd run format:check` — exit 0; all matched files use Prettier style.
- `rtk npm.cmd run lint` — exit 0 with no ESLint findings.
- `rtk npm.cmd run test` — exit 0; 11 files and 62 tests passed.
- Synthetic-environment `rtk npm.cmd run build` — exit 0; Next.js compiled, type-checked, generated all 11 routes, and contacted no external service. Explicit non-secret public values overrode the ignored local public configuration for this command.

### Boundaries and remaining verification

- No migration, database policy storage, settings UI, caption-editor integration, hosted Supabase action, Docker command, credential read, deployment, commit, or push was performed.
- The policy resolver/persistence path remains future work. The caller must supply the resolved per-tag recommendation and versioned global configuration before the utility can drive a caption UI.

## 2026-10-25 — O-009 destination-policy catalog

### Scope completed

- Added `supabase/migrations/20261025000200_destination_policy_v1.sql`, a forward-only migration that expands slug validation for approved underscore slugs, stores private owner-supplied v1 templates, creates versioned organization destination-policy tables, and supplies an idempotent trusted initializer.
- Added `src/lib/destination-character-limits.ts` and focused tests for visible-grapheme counting and independent multi-destination validation.
- Added manual database types for the new policy tables/function and updated product, architecture, security, decisions, Phase 03 plan, and decision worksheet. O-009 is accepted as A-019.
- No external publication, scheduling, social OAuth, provider integration, or ready-for-publication workflow was added.

### Commands actually executed and observed results

- `rtk .\\node_modules\\.bin\\vitest.cmd run tests/unit/destination-character-limits.test.ts --reporter=verbose --pool=forks` — exit 0; 1 file and 6 focused tests passed.
- `rtk npm.cmd run typecheck` — completed without TypeScript errors.
- `rtk npm.cmd run lint` — completed without ESLint findings.
- `rtk .\\node_modules\\.bin\\vitest.cmd run --pool=forks` — exit 0; 12 files and 68 tests passed.
- Synthetic `next build` rerun compiled successfully and entered its TypeScript phase, but the command runner returned before its final completion/exit evidence. Do not treat this O-009 build as verified; rerun it before closeout.

### Pending verification and manual step

- Docker is unavailable and no hosted database was authorized, so the new SQL migration, RLS policies, initializer, and idempotency behavior are not runtime-proven.
- After an explicitly authorized isolated hosted-development migration pass, an authorized `publicity_director`, `pro`, or `executive` must call `initialize_launch_publication_destinations` for each organization. The initializer records organization-specific policy rows from the v1 templates without overwriting prior versions.

