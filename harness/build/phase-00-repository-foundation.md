# Phase 0 — Repository foundation and decisions

## Objective

Create a reproducible, strict, testable CapItUp repository foundation and finalize only the decisions needed to begin later implementation. This phase establishes tooling and placeholders; it does not implement product features or connect services.

## Dependencies

- Approved planning harness: `PLANS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, and phase files.
- Resolve O-011 (package manager).
- Current Node.js LTS and local Git available when implementation is authorized.

## In-scope work

- Scaffold Next.js App Router with TypeScript, `src/`, Tailwind CSS, ESLint, and the `@/*` alias using the selected package manager.
- Set package/database/deployment naming to `capitup`; do not introduce the obsolete working name.
- Enable strict TypeScript and establish formatter, lint, typecheck, unit-test, end-to-end-test, and production-build scripts.
- Initialize shadcn/ui configuration, Vitest, Testing Library, Playwright, and local Supabase project structure without connecting a remote project.
- Create the feature-oriented directory skeleton and a minimal smoke page/test only as required to prove tooling.
- Add `.env.example` with the product-spec variable names and empty placeholders only; configure ignore rules for local secrets and generated output.
- Add baseline CI planning/configuration only if explicitly included in the approved Phase 0 execution request; it must run repository-local checks and use no service credentials.
- Update documentation/build log with the actual package manager, scripts, tool versions, and observed checks.

## Explicit non-goals

- No UI product shell beyond scaffold/tooling proof.
- No Supabase remote connection, schema business tables, Auth, RLS business policies, seeded real users, or credentials.
- No Liveblocks, OpenAI, Notion, email, Vercel project, deployment, or external-service setup.
- No caption, project, workflow, collaboration, AI, or sync behavior.
- No commit or push unless separately authorized.

## Expected files and components

- `package.json` and exactly one selected lockfile.
- Next.js/TypeScript/Tailwind/PostCSS/ESLint/formatter configuration.
- `src/app/` minimal scaffold, `src/components/`, `src/features/`, `src/lib/`, and `src/types/` structure.
- `vitest.config.*`, Testing Library setup, `playwright.config.*`, and minimal smoke tests.
- `supabase/config.toml`, empty `supabase/migrations/`, `supabase/functions/`, and placeholder/local seed structure as produced by the chosen CLI.
- `.env.example`, `.gitignore`, and README/setup notes.
- Updates to `docs/DECISIONS.md`, `harness/build-log.md`, and any necessary `harness/context/` discovery note.

## Security considerations

- `.env.example` contains placeholders only for the variables named by the spec; no values, tokens, project refs, personal data, or real URLs.
- Client/server module boundaries must make secret-bearing adapters server-only.
- Strict TypeScript and boundary validation conventions are established now rather than weakened later.
- Generated output, local environment files, Playwright artifacts, and Supabase local state are ignored appropriately.
- Dependency versions and installation instructions must be checked against current official sources during implementation; this plan does not authorize network access by itself.

## Acceptance criteria

- The application starts and renders the minimal scaffold locally using the chosen package manager.
- Exactly one lockfile exists and documented commands match actual `package.json` scripts.
- Strict typecheck, lint, formatter check, unit smoke test, end-to-end smoke test, and production build pass.
- Local Supabase configuration initializes without linking or writing to a remote project.
- `.env.example` has all specified keys, empty placeholder values, and no secret-like content.
- Product naming is CapItUp/capitup in new files.
- No product features or external integrations have begun.

## Tests and verification commands

Before execution, replace `{pm}` with the accepted package manager and confirm each script in `package.json`:

```powershell
Get-Content -Raw package.json
{pm} run format:check
{pm} run lint
{pm} run typecheck
{pm} run test
{pm} run test:e2e
{pm} run build
git diff --check
git status --short
```

Also scan tracked/new files for accidental secret values using a repository-approved secret scanner if one is selected. Do not invent or claim a script that Phase 0 did not actually add.

## Evidence that must be recorded

- Node, package-manager, Next.js, Supabase CLI, Vitest, and Playwright versions used.
- Selected lockfile and exact `package.json` scripts.
- Exit result for every command above, with exact reasons for skipped checks.
- Minimal page and browser smoke-test observation.
- `.env.example` key-only review and secret-scan result.
- Complete files changed and confirmation that no remote service was linked.

## Stop condition

Stop when the repository foundation passes its recorded local checks and the Phase 0 decisions are logged. Do not begin the application shell, Auth, database business schema, integrations, deployment, commit, or push.

