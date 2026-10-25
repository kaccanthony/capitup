# Phase 01 — Project foundation

## Status and authority

This file is the execution plan for the user-requested Phase 01 project foundation. It is planning material only and does not authorize implementation. For this phase, it takes precedence over the older `harness/build/phase-01-ui-foundation.md`; that broader UI plan is explicitly excluded and must not be started without a separate request and roadmap reconciliation.

The repository already contains foundation artifacts from earlier work. Implementation must inspect and reuse them, make only the changes needed to satisfy this plan, and must not destructively regenerate the application.

## Objective

Produce a reproducible local CapItUp foundation consisting only of a strict Next.js App Router application, Tailwind CSS and shadcn/ui setup, validated environment-variable boundaries, a local-only Supabase development configuration, test and quality tooling, initial documentation structure, and a minimal accessible application shell.

## Dependencies

- `AGENTS.md` and `docs/PRODUCT_SPEC.md` remain authoritative under the repository precedence rules.
- npm and the existing `package-lock.json` are the accepted package-manager baseline from A-011.
- A supported Node.js version, Git, Docker-compatible container runtime for local Supabase verification, and the project-local Supabase CLI are available during implementation.
- The implementation runner must inspect `package.json`, the lockfile, existing configuration, and the installed Next.js documentation before changing Next.js code.
- No product decision listed as open in `docs/DECISIONS.md` is required for this foundation phase.

## Exact scope

### Next.js and TypeScript

- Audit and, only where needed, complete the existing Next.js App Router structure under `src/app/`.
- Keep TypeScript strict, retain the `@/*` source alias, and avoid `any` except for a documented and immediately narrowed external boundary.
- Use React Server Components by default. Client components are permitted only when the minimal shell or test harness requires browser interaction.
- Keep the application and package identity `CapItUp` / `capitup`.

### Tailwind CSS and shadcn/ui

- Verify Tailwind CSS is loaded through the supported configuration for the installed Next.js version.
- Keep one shadcn/ui configuration and shared class-composition utility.
- Retain or add only the smallest shadcn primitive needed to prove that the component path, aliases, styles, and production build work.
- Do not establish final brand tokens or implement product screens in this phase.

### Environment-variable validation

- Add Zod as the environment-schema library if it is not already installed.
- Separate browser-safe variables from server-only variables. Only explicitly named `NEXT_PUBLIC_*` values may be imported into client code.
- Define typed schemas for the variables listed in `.env.example`; do not expose parsed server secrets through a shared client module.
- Keep future integration variables optional until the phase that consumes the integration. Validate a variable when its feature is enabled or its server adapter is instantiated, rather than requiring unused external credentials for a foundation build.
- Reject malformed configured values with generic, key-specific errors that never include secret values.
- Add unit tests for valid, absent optional, malformed, and client/server separation cases using synthetic values only.
- Keep `.env.example` as key-only documentation with empty placeholders. Local environment files remain ignored.

### Local Supabase development setup

- Keep Supabase CLI configuration project-local with project ID `capitup`.
- Document and verify local `start`, `status`, and `stop` commands against a local container runtime when available.
- Keep migrations and seed structure empty or foundation-only; do not create application business tables, Auth hooks, users, buckets, RLS business policies, or real seed data.
- Do not run `supabase link`, `supabase db push`, remote migrations, or any command requiring a hosted-project reference or credentials.

### Testing and quality infrastructure

- Maintain Vitest with Testing Library and jest-dom for unit/component tests.
- Maintain Playwright with a deterministic local application-server lifecycle for browser smoke testing.
- Include focused tests for environment validation and a browser smoke test for the basic shell.
- Provide working npm scripts for formatting, linting, strict type checking, unit tests, end-to-end tests, production build, local development, and the project-local Supabase CLI.
- Keep generated test output, coverage, local databases, environment files, and build artifacts ignored.

### Initial documentation structure

- Keep `README.md`, `docs/`, `harness/build/`, `harness/context/`, and `harness/build-log.md` present and consistent with repository instructions.
- Document prerequisites, installation, environment setup without real values, local Supabase lifecycle, quality commands, and the fact that no hosted service is connected.
- Update `harness/build-log.md` during implementation with commands actually run and observed results only.

### Basic application shell

- Provide one minimal root layout and home route with CapItUp metadata, semantic `header`, `main`, and optional `footer` landmarks, a visible product name, and a short non-functional foundation status message.
- Apply baseline global styling sufficient to prove Tailwind and shadcn/ui integration, keyboard-visible focus, readable contrast, and reduced-motion handling.
- Keep the shell responsive without adding login, dashboard, caption workspace, navigation architecture, fixtures, or product workflows.

## Files expected to change

Implementation must confirm the live repository first. Expected changes are limited to the smallest necessary subset of:

- `package.json` and `package-lock.json` — only missing foundation dependencies or scripts.
- `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, formatter configuration, `vitest.config.ts`, and `playwright.config.ts` — only corrections required by acceptance criteria.
- `components.json`, `src/lib/utils.ts`, and a minimal file under `src/components/ui/` — shadcn/ui proof only.
- `.env.example`, `.gitignore`, and a typed environment module such as `src/lib/env/client.ts`, `src/lib/env/server.ts`, and `src/lib/env/shared.ts`.
- `src/app/layout.tsx`, `src/app/page.tsx`, and `src/app/globals.css` — minimal application shell only.
- `tests/setup.ts`, focused environment unit tests under `tests/unit/`, and the existing foundation browser test under `tests/e2e/`.
- `supabase/config.toml`, `supabase/seed.sql`, and ignore/placeholder files under `supabase/`.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `harness/context/` only when a durable implementation discovery is needed, and `harness/build-log.md`.

No file in this list must be changed merely because it is listed. Existing compliant files should remain untouched.

## Explicitly excluded work

- No login screen, dashboard, caption workspace, product navigation, representative fixtures, or final visual branding from the older UI-foundation plan.
- No authentication provider, membership/allowlist flow, profiles, roles, project assignments, sessions, Auth hooks, or authorization UI.
- No database business tables, migrations for product data, RLS business policies, Storage buckets, Realtime channels, or remote Supabase project connection.
- No caption records, editor, Unicode converter, character policy, versions, reactions, approvals, audit workflow, or search.
- No TipTap, Yjs, Liveblocks, collaboration rooms, comments, suggestions, or presence.
- No OpenAI, AI features, embeddings, Notion integration, email provider, webhook, OAuth, or third-party service calls.
- No Vercel project creation, deployment, production configuration, real credentials, commit, push, or publish.
- No speculative dependency installation for later phases.

## Security considerations

- Treat all environment input as untrusted. Parse once at an appropriate server or public boundary and return typed values; never interpolate secret values into errors or logs.
- A `NEXT_PUBLIC_` prefix is the explicit browser-exposure allowlist. Service-role, OpenAI, Liveblocks, Notion, webhook, OAuth, and encryption secrets remain in server-only modules and must not be imported by client components.
- `.env.example`, test fixtures, screenshots, build logs, and documentation contain placeholders or unmistakably synthetic values only.
- Local Supabase is disposable development infrastructure. Its generated keys must not be copied into tracked files, and local commands must not receive or infer a remote project reference.
- The basic shell contains no authorization claims. It must not imply that hiding or disabling UI is an access control.
- Dependency installation must preserve the npm lockfile, report audit findings without applying breaking forced upgrades, and avoid executing unneeded privileged lifecycle scripts.
- Build and browser-test artifacts, local database state, coverage, and environment files remain ignored.

## Acceptance criteria

- The repository uses Next.js App Router and strict TypeScript with the `@/*` alias; the production build succeeds without network-only font or asset fetches.
- Tailwind utilities and one minimal shadcn/ui primitive render in the basic shell and remain compatible with the production build.
- Environment modules provide typed, separately testable public and server schemas; malformed configured values fail without revealing values, unused future integration variables do not block a credential-free foundation build, and client code cannot import the server-secret module.
- `.env.example` contains every product-spec key exactly once with an empty value and no credentials; local environment files are ignored.
- The project-local Supabase CLI can start, report status, and stop against local containers, or the exact missing local prerequisite is recorded. No remote project is linked and no business schema exists.
- Vitest/Testing Library unit tests and Playwright browser smoke tests pass. The smoke test confirms the CapItUp shell and a semantic main heading.
- Formatting, ESLint, strict type checking, unit tests, end-to-end tests, and the production build all pass using documented npm scripts.
- README and planning/security/architecture documentation describe the actual local foundation and do not claim later-phase capabilities.
- The shell is minimal, responsive, keyboard-readable, and contains no Phase 02-or-later behavior or broader UI-foundation screens.
- `harness/build-log.md` contains actual implementation evidence, including failures or skipped checks with exact reasons.

## Verification commands

Implementation must inspect `package.json` before running these commands and must not claim success for unexecuted commands:

```powershell
rtk proxy npm.cmd run format:check
rtk proxy npm.cmd run lint
rtk proxy npm.cmd run typecheck
rtk proxy npm.cmd run test -- env
rtk proxy npm.cmd run test
rtk proxy npm.cmd run test:e2e
rtk proxy npm.cmd run build
rtk proxy npm.cmd run supabase -- start
rtk proxy npm.cmd run supabase -- status
rtk proxy npm.cmd run supabase -- stop
rtk proxy git diff --check
rtk proxy git status --short
```

Additional required inspection:

- Confirm `.env.example` contains the specified key set with empty values.
- Confirm local environment files, `.next/`, test artifacts, coverage, Supabase temporary state, and generated local database files are ignored.
- Confirm `supabase/.temp/project-ref` is absent and no hosted project reference appears in tracked configuration.
- Scan repository-authored files and the built client output for secret variable names or credential-shaped values using the repository-approved scanner, if one exists; otherwise record the exact targeted search used and its limitations.
- Inspect the built shell at representative desktop and mobile widths with keyboard focus and reduced-motion preference.

If Docker or the local container runtime is unavailable, do not connect a hosted Supabase project as a substitute. Record the failed local command and leave local runtime verification outstanding.

## Evidence that must be recorded

- Node, npm, Next.js, TypeScript, Tailwind, shadcn, Supabase CLI, Vitest, and Playwright versions.
- Direct dependencies added or removed and the reason for each.
- The final script names from `package.json` and exit result for every executed verification command.
- Environment key-set review, validation-test cases, ignore-rule inspection, and secret/client-bundle scan result.
- Local Supabase start/status/stop observations, or the exact local prerequisite that prevented them, plus evidence that no remote project is linked.
- Browser smoke-test result and manual shell observations.
- Complete files changed, assumptions, unresolved risks, and confirmation that excluded work did not begin.

## Stop condition

Stop when the foundation acceptance criteria have recorded local evidence or any unmet criterion has been reported with its exact blocker. Do not proceed into the older Phase 1 UI shell, authentication, product data, collaboration, AI, Notion, deployment, commit, or push.
