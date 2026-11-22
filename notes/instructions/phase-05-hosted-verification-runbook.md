# Phase 05 hosted verification runbook

## Purpose and phase status

Use this runbook to finish the deferred PostgreSQL, RLS, Supabase Realtime, and managed Liveblocks verification for Phase 05.

Phase 06 work may continue in parallel because it has already started, but Phase 05 must remain **open** until the required checks below pass. Do not describe Phase 05 as deployed, complete, or production-verified merely because Phase 06 work continues.

## Safety rules

- Run only against an isolated development Supabase project and development Liveblocks project.
- Never run these checks against production.
- Use synthetic users and synthetic caption content.
- Do not paste access tokens, service-role keys, Liveblocks secrets, cookies, or provider tokens into this file, screenshots, logs, issues, or commits.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `LIVEBLOCKS_SECRET_KEY` server-only. Neither may use a `NEXT_PUBLIC_` prefix.
- Record pass/fail outcomes and redacted evidence, not secret values.
- Do not apply Phase 06 SQL merely to complete this Phase 05 runbook.

## Required test identities and fixture

Create synthetic identities with the following relationships:

| Label      | Organization   | Access needed                                                                         |
| ---------- | -------------- | ------------------------------------------------------------------------------------- |
| Writer A   | Organization A | Current project assignment plus active writer responsibility                          |
| Writer B   | Organization A | Current project assignment plus active writer responsibility on the same content item |
| Viewer A   | Organization A | Current viewer assignment only                                                        |
| Revoked A  | Organization A | Initially authorized, then assignment or membership revoked during the test           |
| Outsider B | Organization B | No Organization A access                                                              |

Create one Organization A project and one synthetic caption item with:

- at least one controlled tag;
- at least one selected destination;
- active word and destination policies;
- two assigned writers;
- one viewer;
- one active workflow template with eligible reviewers.

Use separate browser profiles or isolated Playwright contexts. An incognito tab alone is insufficient if it shares authentication state with another test tab.

## 1. Apply and confirm the Phase 05 migrations

Apply missing migrations through Phase 05 in timestamp order. The final two Phase 05 files are:

1. `supabase/migrations/20261026000700_phase_05_collaboration.sql`
2. `supabase/migrations/20261026000800_phase_05_server_snapshot_notifications.sql`

Use the corrected `00700` file containing:

```sql
    )
  ), false);
```

Do not replay a migration already recorded in the target migration ledger. If a SQL client may have executed statements separately before reporting an error, inspect existing types, tables, functions, and the migration ledger before retrying.

Check the ledger:

```sql
select version, name
from supabase_migrations.schema_migrations
where version in ('20261026000700', '20261026000800')
order by version;
```

Expected: exactly one row for each version after both migrations succeed.

Check required objects:

```sql
select
  to_regclass('public.collaboration_documents') as collaboration_documents,
  to_regclass('public.collaboration_sessions') as collaboration_sessions,
  to_regclass('public.collaboration_threads') as collaboration_threads,
  to_regclass('public.collaboration_comments') as collaboration_comments,
  to_regclass('public.collaboration_mentions') as collaboration_mentions,
  to_regclass('public.collaboration_suggestions') as collaboration_suggestions,
  to_regclass('public.caption_reactions') as caption_reactions,
  to_regclass('public.caption_word_policies') as caption_word_policies,
  to_regclass('public.caption_version_word_policy_evidence') as word_evidence,
  to_regclass('public.caption_version_destination_policy_evidence') as destination_evidence;
```

Expected: every result is non-null.

## 2. Verify the server-only finalization boundary

Run this privilege audit:

```sql
select
  to_regprocedure(
    'public.submit_collaboration_snapshot(uuid,uuid,text,text,jsonb,text,text,text)'
  ) as obsolete_browser_rpc,
  has_function_privilege(
    'authenticated',
    'public.finalize_collaboration_snapshot(uuid,uuid,uuid,uuid,uuid,uuid,text,integer,bigint,text,jsonb,text,text,text,integer,integer)',
    'EXECUTE'
  ) as authenticated_can_finalize,
  has_function_privilege(
    'service_role',
    'public.finalize_collaboration_snapshot(uuid,uuid,uuid,uuid,uuid,uuid,text,integer,bigint,text,jsonb,text,text,text,integer,integer)',
    'EXECUTE'
  ) as service_role_can_finalize;
```

Expected:

| Column                       | Expected value |
| ---------------------------- | -------------- |
| `obsolete_browser_rpc`       | `null`         |
| `authenticated_can_finalize` | `false`        |
| `service_role_can_finalize`  | `true`         |

Also verify the deployed browser bundle contains neither the service-role variable name nor a secret value. From a production build directory:

```powershell
rg -n "SUPABASE_SERVICE_ROLE_KEY" .next/static
```

Expected: no matches. Never search for or print the real key value.

## 3. Verify RLS and Realtime registration

Check RLS declarations:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'collaboration_documents',
    'collaboration_sessions',
    'collaboration_threads',
    'collaboration_comments',
    'collaboration_mentions',
    'collaboration_suggestions',
    'caption_reactions',
    'collaboration_audit_events',
    'caption_word_policies',
    'caption_version_word_policy_evidence',
    'caption_version_destination_policy_evidence',
    'workflow_notifications'
  )
order by c.relname;
```

Expected: every row reports `rls_enabled = true`.

Check Realtime publication membership:

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in (
    'collaboration_threads',
    'collaboration_comments',
    'collaboration_suggestions',
    'collaboration_sessions',
    'caption_reactions',
    'workflow_instances',
    'workflow_instance_steps',
    'workflow_notifications'
  )
order by tablename;
```

Expected: all eight tables appear.

Important: the Supabase SQL editor normally runs with elevated access and cannot prove browser RLS isolation. Complete the user-session scenarios below with distinct authenticated clients.

## 4. Confirm policy configuration before snapshot testing

Check that every selected tag has an active word policy:

```sql
select
  item_tag.content_tag_id,
  policy.id as policy_id,
  policy.policy_version,
  policy.recommended_word_limit,
  policy.approaching_offset_words,
  policy.global_hard_maximum_words
from public.content_item_tags item_tag
left join public.caption_word_policies policy
  on policy.content_tag_id = item_tag.content_tag_id
 and policy.enabled
 and policy.effective_at <= now()
 and policy.superseded_at is null
where item_tag.content_item_id = '<content-item-uuid>'::uuid;
```

Expected: every selected tag has a non-null policy ID and version.

Check destination policies:

```sql
select
  channel.id as publication_channel_id,
  channel.display_label,
  policy.id as policy_id,
  policy.policy_version,
  policy.character_limit,
  policy.limit_classification
from public.content_publication_channels selected
join public.publication_channels channel
  on channel.id = selected.publication_channel_id
left join public.publication_channel_policies policy
  on policy.publication_channel_id = channel.id
 and policy.enabled
 and policy.effective_at <= now()
 and policy.superseded_at is null
where selected.content_item_id = '<content-item-uuid>'::uuid;
```

Expected: every selected destination has a non-null active policy. If a policy is intentionally absent, the resulting review evidence must say `unconfigured`; the application must not substitute a hidden fallback limit.

## 5. Two-writer collaboration test

Open the same caption as Writer A and Writer B in separate browser profiles.

1. Confirm both sessions show the same room and connected state.
2. Confirm each user sees the other user's name, cursor, and selection.
3. Have Writer A insert text and wait until Writer B sees it.
4. Have Writer B edit a different paragraph and wait until Writer A sees it.
5. Edit nearby text concurrently.
6. Confirm every acknowledged edit remains present in both sessions.
7. Refresh both sessions and confirm the merged state persists.

Pass conditions:

- no acknowledged edit disappears;
- no duplicate paragraph or silent whole-document replacement appears;
- presence displays trusted profile names rather than client-supplied identities;
- both sessions converge to the same text.

Evidence to record:

- timestamp;
- synthetic user labels;
- content item ID;
- screenshots or a short trace showing both cursors and the converged text;
- pass/fail and any observed delay.

## 6. Viewer and denied-user authorization test

### Viewer A

1. Open the same caption as Viewer A.
2. Confirm the document and allowed review records are visible.
3. Confirm editing is disabled.
4. Attempt keyboard input, paste, suggestion creation, and direct room reconnection.

Expected: Viewer A remains read-only and cannot create a write-capable provider session.

### Outsider B

1. Attempt to open the Organization A content URL.
2. Attempt the room-authorization endpoint using the outsider's authenticated session.

Expected: generic denial with no document, presence, identity, room, or content disclosure.

### Disabled identities

Repeat the authorization attempt with a suspended, expired, or revoked membership.

Expected: generic denial and no Liveblocks room token.

Record a matrix:

| Identity   | Page access | Room read | Room write | Presence visible | Expected                |
| ---------- | ----------- | --------- | ---------- | ---------------- | ----------------------- |
| Writer A   |             |           |            |                  | Write                   |
| Writer B   |             |           |            |                  | Write                   |
| Viewer A   |             |           |            |                  | Read only               |
| Revoked A  |             |           |            |                  | Denied after revocation |
| Outsider B |             |           |            |                  | Denied                  |

## 7. Revocation, reconnect, and offline behavior

1. Connect Revoked A while the assignment and membership are valid.
2. In another authorized administrative session, revoke the content/project assignment or disable the membership.
3. Wait for the application revalidation interval; do not manually refresh first.
4. Confirm Revoked A is downgraded or disconnected and cannot continue editing.
5. Restore only the access required by the test before proceeding.
6. Disconnect Writer A's network briefly while Writer B continues editing.
7. Reconnect Writer A.

Expected:

- revocation takes effect without trusting the existing room ID or old UI state;
- offline support does not silently preserve an unauthorized write path;
- reconnect fetches the newer shared state;
- Writer A's stale local state does not overwrite Writer B's newer acknowledged edits.

## 8. Anchored comment test

1. Writer A selects a known phrase and creates a comment mentioning Writer B.
2. Writer B inserts text immediately before the selected phrase.
3. Confirm the thread remains attached to the intended phrase.
4. Writer B replies.
5. An authorized reviewer resolves the thread.

Expected:

- the anchor follows nearby edits;
- author, mention, reply, resolver, and timestamps remain attributable;
- an unauthorized or cross-organization user cannot read or resolve the thread.

## 9. Suggestion authorization and stale-state test

1. Writer A creates insertion, deletion, and replacement suggestions.
2. Confirm each displays its author and proposed change.
3. Attempt accept/reject as Viewer A.
4. Accept one suggestion as an authorized reviewer.
5. Attempt to decide the same suggestion again using its old record version.
6. Change the anchored source text, then attempt to apply the now-stale suggestion.

Expected:

- Viewer A cannot decide suggestions;
- the authorized decision succeeds once;
- repeated or old-version decisions are rejected;
- a suggestion whose source no longer matches is rejected as stale;
- audit attribution identifies the author, decision actor, and application actor.

## 10. Exact snapshot and immutable evidence test

Before submission:

1. Record the visible caption text.
2. Record the current item `record_version` and collaboration `document_revision` through authorized server/database inspection.
3. Submit through the normal application route, not by directly calling the finalization RPC.

After submission, query the immutable version:

```sql
select
  id,
  content_item_id,
  version_number,
  plain_text,
  normalized_text,
  submitted_by_user_id,
  collaboration_room_id,
  collaboration_snapshot_version_id,
  collaboration_document_revision,
  snapshot_hash,
  word_count,
  grapheme_count,
  word_policy_configured
from public.caption_versions
where id = '<caption-version-uuid>'::uuid;
```

Check word-policy evidence:

```sql
select
  policy_id,
  policy_version,
  content_tag_id,
  evaluated_word_count,
  recommended_word_limit,
  approaching_offset_words,
  global_hard_maximum_words,
  warning_state,
  recommendation_exempt,
  exemption_reason,
  policy_effective_at
from public.caption_version_word_policy_evidence
where caption_version_id = '<caption-version-uuid>'::uuid
order by content_tag_id;
```

Check destination evidence:

```sql
select
  publication_channel_id,
  policy_id,
  policy_version,
  destination_slug,
  destination_label,
  evaluated_grapheme_count,
  character_limit,
  limit_classification,
  warning_state,
  policy_effective_at
from public.caption_version_destination_policy_evidence
where caption_version_id = '<caption-version-uuid>'::uuid
order by destination_slug;
```

Then continue editing the live document or create the policy-approved next draft. Query the same immutable version again.

Expected:

- stored text and hash match the submitted provider snapshot;
- the provider snapshot version ID is non-empty;
- the immutable version does not change after later live edits;
- word and grapheme counts match the submitted text;
- every configured policy row retains the exact ID, version, limits, and evaluated value used at submission;
- over-recommendation and destination-limit states remain warnings visible during review;
- no Phase 05 code invents a new publication decision.

## 11. Forgery, stale-state, and replay test

Use a controlled integration test or a server-side test harness; never expose the service-role key to the browser.

Attempt finalization with one altered value at a time:

- actor user ID;
- organization ID;
- project ID;
- project-assignment ID;
- content item ID;
- room ID;
- workflow template ID;
- expected item record version;
- expected document revision;
- snapshot version ID already finalized once.

Expected: every forged, mismatched, stale, or replayed request fails atomically and creates no caption version, workflow instance, evidence row, or partial audit event.

Also confirm that a normal authenticated browser role cannot execute the finalization function directly.

## 12. Review lock and approval binding test

1. Submit a version for review.
2. Confirm existing write collaboration sessions become read-only.
3. Confirm the workflow instance references the exact new `caption_version_id`.
4. Record an allowed review decision.
5. Create or resume the policy-approved next draft/change-request path.
6. Confirm prior approvals are not silently transferred to the new version.

Inspect the workflow binding:

```sql
select
  instance.id,
  instance.caption_version_id,
  instance.status,
  instance.current_step_id,
  instance.template_id,
  instance.reopened_from_instance_id
from public.workflow_instances instance
where instance.content_item_id = '<content-item-uuid>'::uuid
order by instance.created_at desc;
```

Expected: each workflow and approval decision remains bound to one immutable version.

## 13. App-wide notification-center test

Use two authenticated recipients and one non-recipient.

1. Open the application in two tabs for the same recipient.
2. Trigger a durable workflow notification.
3. Confirm both tabs receive the notification through Realtime without a manual refresh.
4. Confirm the unread badge increments.
5. Mark the notification read in one tab.
6. Confirm the read state persists and the other tab updates.
7. Attempt to mark the notification read as a different user.
8. Confirm the center appears in both dashboard and project workspaces.

Expected:

- only the recipient sees the row;
- unread counts come from durable RLS-filtered records;
- mark-read is idempotent;
- another user cannot read or mutate the notification even with its UUID;
- no notification content crosses organization boundaries.

## 14. Automated repository gates

Run from the repository root:

```powershell
npm run test -- tests/unit/collaboration-route-security.test.ts tests/unit/collaboration-schema.test.ts tests/unit/collaboration-finalization-security.test.ts tests/unit/collaboration-suggestions.test.ts tests/unit/notification-center.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

If a dedicated integration or E2E command is added, it must cover:

- two isolated writers;
- viewer and denied contexts;
- revocation/reconnect;
- anchored comments;
- stale suggestions;
- exact snapshot handoff;
- notification recipient isolation.

Do not silently weaken or delete a failing test. Record unavailable checks separately from failures.

## 15. Evidence record template

Copy this section to the Phase 05 build log or a dated verification record after testing:

```markdown
## Phase 05 hosted verification — YYYY-MM-DD

- Environment: isolated development only
- Supabase project reference: [non-secret identifier]
- Liveblocks project/environment: [non-secret identifier]
- App revision/commit: [value]
- Migrations 00700/00800: PASS | FAIL
- Finalization privilege audit: PASS | FAIL
- RLS table/policy checks: PASS | FAIL
- Realtime publication checks: PASS | FAIL
- Two-writer convergence/presence: PASS | FAIL | UNAVAILABLE
- Viewer/denied matrix: PASS | FAIL | UNAVAILABLE
- Revocation/reconnect/offline behavior: PASS | FAIL | UNAVAILABLE
- Anchored comments/mentions/resolution: PASS | FAIL | UNAVAILABLE
- Suggestion authorization/staleness: PASS | FAIL | UNAVAILABLE
- Exact immutable snapshot/evidence: PASS | FAIL | UNAVAILABLE
- Review lock/version binding: PASS | FAIL | UNAVAILABLE
- Notification isolation/realtime/mark-read: PASS | FAIL | UNAVAILABLE
- Focused tests: [command and result]
- Full tests: [command and result]
- Lint: [result]
- TypeScript: [result]
- Production build: [result]
- `git diff --check`: [result]
- Redacted evidence locations: [paths/links]
- Remaining risks: [list]
```

## Go/no-go decision

Phase 05 may be marked complete only when all of these are true:

- migrations `00700` and `00800` applied successfully;
- server-only finalization privileges verified;
- allowed, read-only, revoked, disabled, and cross-organization behavior verified with real authenticated sessions;
- two-writer convergence, presence, anchor movement, suggestions, reconnect, and immutable snapshot handoff verified against managed Liveblocks;
- RLS-filtered notification Realtime and mark-read behavior verified;
- focused and broader repository gates pass;
- required evidence is recorded without secrets.

If Phase 06 continues before these checks finish, record the decision as:

> Phase 06 development continues by explicit owner choice. Phase 05 remains open with hosted collaboration verification deferred; no Phase 06 result is evidence that Phase 05 passed.
