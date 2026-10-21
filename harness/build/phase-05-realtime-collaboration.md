# Phase 5 — Realtime collaboration

## Objective

Add authorized simultaneous editing, presence, anchored discussions, suggestions, live workflow/reaction updates, notification center behavior, resilient reconnection, and exact snapshot handoff from the collaborative document to immutable approval versions.

## Dependencies

- Phases 2–4 complete.
- O-012, O-013, O-014, and O-015 resolved.
- Authorized development collaboration provider or self-hosted persistent service is separately approved and configured; this plan contains no credentials.

## In-scope work

- TipTap/Yjs collaborative document integration for one active room per caption item.
- Server-issued room authorization after Supabase session, active membership, project access, assignment, and requested read/write capability checks.
- Named presence, cursors, selections, reconnect state, and duplicate/offline recovery behavior.
- Text-range anchored comments, mentions/replies, thread resolution, and provider/Supabase metadata according to O-014.
- Suggesting mode with attributed insertions/deletions and accept/reject behavior using the accepted paid or narrower implementation.
- Review-lock behavior that prevents ordinary writers from silently changing the submitted immutable snapshot while allowing policy-approved new-draft/comments/suggestions work.
- Consistent document serialization to immutable versions and proof that final approval references that snapshot.
- Live workflow/reaction updates and integrated notification center backed by durable Supabase records.

## Explicit non-goals

- No AI drafting, Notion sync, automatic publication, or unrelated chat system.
- No trust in client-provided room names, roles, identities, or permissions.
- No custom WebSocket server on a Vercel serverless function.
- No paid tracked-changes feature unless O-013 explicitly approves it.
- No weakening of immutable-version or workflow rules to accommodate the live document.

## Expected files and components

- Collaboration provider configuration and server-only room authorization endpoint/adapters.
- `src/features/collaboration/` provider, room, presence, cursor, comment, mention, suggestion, reconnection, and serialization modules.
- Caption workspace integration and review-lock/new-draft behavior.
- Migrations/RLS for collaboration document references and any Supabase-owned comment/suggestion/mention metadata defined by O-014.
- Realtime subscriptions for workflow/reactions/notifications with authorized channel policy.
- Unit tests plus multi-context Playwright/end-to-end collaboration tests.

## Security considerations

- Possession or guessing of a room/document ID grants nothing; derive and authorize room scope server-side.
- Issue least-privilege, time-bounded room permissions and enforce accepted revocation/expiry behavior for connected/offline clients.
- Prevent read-only users from writing and unauthorized users from observing content, presence, identities, anchors, or notifications.
- Sanitize/validate rich text, mentions, suggestion payloads, and provider callbacks.
- Bind provider user identity/display data to trusted membership records, not client claims.
- Keep provider secrets server-only and exclude them from logs/client bundles.
- Preserve auditable attribution and ensure submitted snapshots cannot race with unacknowledged live state.

## Acceptance criteria

- Two authorized writers edit concurrently in separate browser sessions without lost acknowledged edits and see named cursors/selections/presence.
- An authorized viewer receives read-only access; an unauthorized, suspended, expired, revoked, or cross-organization user cannot join or observe the room.
- A selected-text comment remains anchored after nearby edits; mentions/replies and resolution preserve actor attribution.
- Suggestions display author and proposed changes and can be accepted/rejected only by an authorized actor using the accepted implementation.
- Reconnection/offline scenarios follow O-015 without silently overwriting newer content.
- Submission captures the intended consistent live state as immutable JSON/plain/normalized text/count, and later edits do not change that version.
- Review lock/new-draft behavior follows workflow policy and stale approvals remain impossible.
- Live workflow, reactions, and notification center updates remain backed by durable authorized data.

## Tests and verification commands

After inspecting actual scripts and approved local/provider test configuration:

```powershell
{supabase-cli} db reset
{pm} run test -- collaboration serialization suggestions
{pm} run test:integration -- room-authorization realtime-policies
{pm} run test:e2e -- collaboration-two-session collaboration-denied snapshot-handoff
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Use at least two isolated browser contexts plus denied/suspended/cross-organization contexts. Simulate reconnect, network interruption, revocation while connected, concurrent submission, comment-anchor movement, and suggestion accept/reject.

## Evidence that must be recorded

- Accepted provider/hosting, suggestion, canonical-storage, retention/recovery, and revocation decisions.
- Room authorization request/outcome matrix without token values.
- Two-session video/trace/screenshots showing concurrency, anchors, suggestions, presence, reconnect, and notification updates.
- Immutable snapshot hash/content comparison before and after continued live editing.
- Provider/local-service test environment used, exact commands/results, files changed, and unverified production-provider behavior.

## Stop condition

Stop when collaboration, authorization denial, recovery, and snapshot handoff pass in the approved test environment. Do not begin AI, Notion, hardening/pilot, deployment, commit, or push.

