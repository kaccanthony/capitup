# Phase 8 local hardening evidence — 2026-11-22

**Recommendation: not ready for a controlled pilot.** This is a local source and command review, not hosted authorization, accessibility, backup, or pilot proof. No hosted services or real data were changed.

Security release evidence: [Next.js v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5).

## Security review

| Area | Local evidence | Disposition |
|---|---|---|
| Authentication and RLS | Protected workspace routes redirect anonymously; browser database access relies on Supabase RLS. Server functions and policies need allowed, denied, cross-organization, and revoked-user tests against a development database. | Open; no database environment was exercised. |
| Room and snapshot authorization | Liveblocks auth checks a scoped content record and database authorization; snapshot requires active membership, write capability, matching project/content IDs, and a draft/revision state before the service-role operation. Added an anonymous API E2E check. | Local review only; two-session/revocation proof open. |
| Secrets and inputs | Service-role key is read in the server-only module; public variables are limited to app URL and Supabase publishable configuration. API routes use Zod checks and generic errors. No `dangerouslySetInnerHTML` or `eval` use was found under `src`. | Bundle inspection, CSRF/header tests, and hostile-input tests remain open. |
| Notion webhook | Paused on `master`; implementation remains on `feature/notion-sync-paused`. | No active route is shipped; applied schema and data are retained. |
| Dependencies | `next` is pinned to 16.4.2. The production build and dev server stopped with a Next.js security warning. The official Next.js v16.4.5 release lists security fixes. | **Release blocker:** update and repeat build/E2E before pilot. The attempted local `npm install next@16.4.5 --save-exact` did not complete; no package files changed. The original 16.4.2 package was restored from its registry tarball after verifying the lockfile SHA-512 integrity; typecheck passed again afterward. |
| AI privacy/rate limits | `/api/ai/generate` validates input and authorization, then returns 503 without invoking a provider for private content. | Provider-enabled quota and privacy paths remain unverified. |

## Accessibility review

Source inspection found `main` landmarks on login, workspace, and integration pages; labeled primary navigation; skip links on the dashboard and project workspace; visible focus styles; and a reduced-motion CSS rule. The sign-in E2E suite checks keyboard focus and the reduced-motion media query. **No screen reader session, authenticated editor keyboard journey, focus-trap audit, or WCAG 2.2 AA assessment was performed.** These remain pilot gates.

## Recovery and rollback

No database/Storage/Liveblocks backup or restore was performed. Local Supabase containers are unavailable in this workspace, and no isolated hosted development target or approved synthetic restore target was supplied. O-024 has no accepted backup frequency, recovery point objective (RPO), recovery time objective (RTO), or operator. Do not label a file copy or migration dry run a restore drill.

Recovery exercise once a synthetic target exists: export PostgreSQL schema/data, Storage objects and metadata, and the approved Liveblocks snapshots; record UTC export start/end and source high-water marks; restore into a separate clean target; compare row counts, immutable caption hashes, attachment hashes, authorization policies, and sample readable captions; measure elapsed restore time and data lag; then document any failed items. Treat migrations as forward-only: rehearse a compensating migration against the restored copy instead of assuming an automatic down migration. The owner must approve RPO/RTO and backup cadence before those measurements can pass a gate.

## Checks run

| Command | Observed result |
|---|---|
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm run test` | 37 files, 123 tests passed. |
| `npm run build` | Compiled and generated pages, then failed at the Next.js security check. |
| `npm run dev -- --hostname 127.0.0.1` | Started, then stopped at the same security check. |
| `prettier --check docs/PHASE_08_READINESS.md tests/e2e/foundation.spec.ts` | Passed. |
| `git diff --check` | Passed. |
| `npm run test:e2e` | Not run; its runner requires a successful production build. |

The new anonymous room/snapshot E2E case is unexecuted. Authenticated approval and collaboration snapshot E2E cases need synthetic accounts and working Supabase/Liveblocks test environments; no passing result is claimed.

## Pilot evidence and exit criteria

| Criterion | Evidence now | Gate |
|---|---|---|
| No critical/high security blocker | Next.js security stop is present. | Fail |
| Positive/negative/cross-organization RLS | Source review only. | Open |
| Approval exact-version and override journeys | Unit tests only; no hosted E2E. | Open |
| Two-session collaboration, refresh/reconnect, snapshot | No two-session run. | Open |
| Notion failure does not block local approval | Design A-029 only; caption exchange not implemented. | Open if Notion is in pilot scope |
| WCAG 2.2 AA and screen reader | Source and sign-in test only. | Open |
| Measured restore within accepted RPO/RTO | No approved targets or restore. | Open |
| Participant roles, baseline metrics, consent, support owner, exit thresholds | O-027 unresolved; no real pilot observations. | Open |

For a pilot charter, define an approved active-member role matrix, support owner, issue triage owner, consent text, baseline approval duration/revision count, and numeric exit thresholds before inviting participants. Measure aggregated workflow durations and issue counts without logging private caption bodies. A pilot can be declared ready only after the listed gates have dated evidence and no unresolved release blocker.
