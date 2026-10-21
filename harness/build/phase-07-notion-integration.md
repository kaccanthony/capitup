# Phase 7 — Notion integration

## Objective

Implement a narrow, organization-managed Notion integration for agreed calendar/project imports and optional CapItUp-owned status/deep-link/final-caption exports, with explicit field ownership, verified webhooks, idempotency, retries, and visible conflicts.

## Dependencies

- Phases 2–5 complete and the core workflow reliable; Phase 6 need not provide data to Notion.
- O-019, O-020, O-021, and affected O-023 retention choices resolved.
- Separately authorized organization-owned Notion internal integration and explicitly shared development content.

## In-scope work

- Organization-admin setup/status UI for one internal integration without exposing its token.
- Import of explicitly mapped Notion-owned event/project title/date/deadline fields from the confirmed calendar data source.
- Optional app-owned writer summary, workflow status, deep link, and final-approved-caption export only where O-020/O-021 approve it.
- Durable connection metadata, object links, cursors, sync runs, webhook events, conflicts, retries, and dead-letter events.
- Raw-body webhook signature/timestamp verification, event-ID deduplication, authoritative object fetch, and idempotent application.
- Loop prevention, per-field source-of-truth enforcement, last-success/failure visibility, manual retry/reconciliation, and degraded-mode behavior.

## Explicit non-goals

- No use of Notion login as CapItUp membership proof.
- No multi-workspace public OAuth unless the product specification is formally changed.
- No full two-way page/block synchronization, working-version sync, personal-calendar assumption, or automatic publication.
- No field writable by both systems without an accepted deterministic conflict rule.
- No token in browser code, ordinary exposed tables, logs, screenshots, or build artifacts.

## Expected files and components

- Migrations/RLS for integration connections/references, Notion object links, cursors, sync runs, webhook/dead-letter events, and conflict state.
- Server-only Notion client, field mapper, import/export, signature verification, idempotency, retry/backoff, and loop-prevention modules.
- Webhook route handler that retains raw-body verification semantics.
- Admin integration/sync status, mapping review, conflict, and retry UI.
- Unit tests for mapping/signatures/idempotency and integration/e2e tests against mocks or a separately authorized development workspace.

## Security considerations

- Grant the internal integration minimum capabilities and share only the required database/page.
- Store the token as a server secret and connection IDs as references, not authorization identities.
- Only authorized administrators configure mappings/retries; imported objects remain subject to organization/project RLS.
- Verify signature, freshness, and idempotency before processing; fetch authoritative current state after valid receipt.
- Validate/sanitize external text, URLs, property types, and sizes before persistence/rendering.
- Avoid leaking private caption data to Notion unless O-021 explicitly permits the final-approved field.
- Audit integration writes, mapping changes, conflict resolutions, and manual replay.

## Acceptance criteria

- The internal integration can access only explicitly shared development content and its status is visible without exposing the token.
- Mapped Notion-owned event/project fields import idempotently; app-owned fields export only in the approved direction.
- Invalid, stale, or forged webhook requests are rejected; duplicate/replayed valid events do not duplicate work.
- Out-of-order and transient failures produce deterministic retry/conflict/dead-letter outcomes without update loops.
- Working captions/versions are never synchronized; optional final caption behavior matches O-021.
- Users can see last successful sync and actionable failure/conflict state.
- Notion outage does not block core caption drafting, approval, search, or export/recovery.

## Tests and verification commands

Use signed fixtures/mocks by default; live workspace checks require separate authorization:

```powershell
{supabase-cli} db reset
{pm} run test -- notion mapping signatures idempotency
{pm} run test:integration -- notion-sync webhooks retries conflicts
{pm} run test:e2e -- notion-admin-sync-status
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Test invalid signatures, stale timestamps, duplicate IDs, reordered updates, missing/renamed/wrong-type properties, rate limits, provider outage, retry exhaustion, manual replay, and bidirectional-loop attempts.

## Evidence that must be recorded

- Confirmed calendar type, shared development object scope, property IDs/types, and accepted source-of-truth map without secret values.
- Webhook verification/replay matrix and sync-run/idempotency identifiers.
- Import/export before/after data for each mapped field and proof that working versions are absent.
- Retry/backoff/conflict/dead-letter and degraded-mode observations.
- Exact commands/results, files changed, provider/API versions, and any live checks not performed.

## Stop condition

Stop when approved fields synchronize safely and all signature/idempotency/conflict/degraded-mode criteria pass. Do not broaden scope, deploy, start the pilot, commit, or push.

