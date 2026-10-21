# Phase 1 — UI foundation and application shell

## Objective

Build an original, accessible, responsive CapItUp application shell and representative login/dashboard/workspace states using local static fixtures only.

## Dependencies

- Phase 0 complete with actual scripts and test harness.
- O-010 (official branding) resolved, or explicit approval to use the product spec's provisional accessible tokens without presenting them as final branding.

## In-scope work

- Establish design tokens, typography, spacing, surfaces, focus styles, attention states, and reduced-motion behavior.
- Create a responsive shell with left navigation, central work area, and optional right assistant/activity rail.
- Create invitation-only login shell with institutional-account primary action, optional magic-link presentation, generic access messaging, and no public signup flow.
- Create dashboard shell for assignments, decisions, deadlines, recent updates, upcoming events, workload, and AI entry point using labeled fixtures.
- Create caption workspace shell showing metadata, editor placeholder, limit/Unicode controls, history, advisory reactions, approval timeline, activity, and assistant placeholder.
- Add loading, empty, error, disabled, mobile-navigation, and keyboard-focus states.
- Use Server Components by default; introduce client components only for local interaction required by the shell.

## Explicit non-goals

- No real authentication, membership checks, database, RLS, persistence, external calls, or credentials.
- No functional editor, versions, workflow transitions, collaboration, AI generation, Notion sync, email, or notifications.
- No copied Dribbble composition, proprietary assets, or claim of final brand approval.
- No client-only authorization logic presented as security.

## Expected files and components

- `src/app/` layouts and fixture-only login/dashboard/workspace routes.
- `src/components/` design-system primitives, navigation, status, loading/empty/error compositions.
- `src/features/dashboard/` and `src/features/captions/` fixture models and shell components.
- Shared theme/global styles and accessible token definitions.
- Component/unit tests and Playwright shell/accessibility tests.
- Story or fixture files only if the Phase 0 toolset includes that convention.

## Security considerations

- Fixture content must be synthetic and visibly non-production.
- Login errors remain generic and do not reveal invitation membership.
- UI role/capability examples must be labeled demonstration state and must not become the future enforcement layer.
- Links, rich-text placeholders, and image assets must not introduce unsafe external content.
- Accessibility includes WCAG 2.2 AA contrast targets, semantic landmarks, full keyboard use, visible focus, icon labels, and reduced motion.

## Acceptance criteria

- Desktop and mobile layouts render without overflow in defined representative viewports.
- Login provides no open registration path and clearly states the authorized-member restriction.
- Dashboard and workspace expose all spec-required regions with static representative states.
- Keyboard users can reach and operate all interactive shell controls with visible focus.
- State and urgency are not communicated by color alone; contrast and reduced-motion checks pass.
- New interface is recognizably original and uses only local fixtures.
- No network request to Auth, Liveblocks, OpenAI, Notion, or email occurs in tested shell flows.

## Tests and verification commands

Confirm actual scripts first, then run the Phase 0 equivalents of:

```powershell
{pm} run test -- ui
{pm} run test:e2e -- ui-shell
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Manual browser verification: keyboard-only login/navigation/workspace traversal, desktop/mobile responsive review, zoom/reflow, visible focus, reduced motion, loading/empty/error states, and browser network inspection proving fixture-only behavior.

## Evidence that must be recorded

- Tested viewport sizes, browsers, keyboard path, zoom level, and reduced-motion observation.
- Automated accessibility/checker results and any known limitations.
- Screenshots or artifact paths for login, dashboard, workspace, mobile, loading, empty, and error states.
- Network observation showing no external-service calls.
- Exact commands/results and files changed.

## Stop condition

Stop when the fixture-only shell meets responsive and accessibility criteria. Do not connect authentication, Supabase data, collaboration, AI, Notion, email, or any external service.

