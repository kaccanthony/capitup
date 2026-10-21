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

