# Phase 4 — Approval workflow

## Objective

Implement configurable, frozen, version-bound approval workflows with change-request loops, PRO final approval, distinct audited Director overrides, and durable workflow notifications.

## Dependencies

- Phases 2–3 complete with trusted authorization and immutable versions.
- O-003, O-004, and O-005 resolved.
- O-022 resolved before external email is enabled; durable in-app notifications may proceed independently.

## In-scope work

- Workflow templates and ordered template steps with applicable organization/project roles, required/skipped configuration, and override permission.
- Frozen workflow instances/steps copied at caption submission.
- Standard Director-to-PRO workflow and one configurable project-led workflow using the applicable subset of head/Director/PRO steps.
- Atomic recommend/approve/request-changes transitions, current-blocker calculation, resubmission loop, stale-decision detection, and status/step separation.
- PRO ordinary final approval and Director Override with mandatory reason, exact version, audit evidence, PRO notification, and distinct presentation.
- New-version invalidation/reopen behavior based on accepted content-versus-metadata policy.
- Durable in-app notification records for assignment, changes requested, approval requested, final approval, deadline, and override; email only if separately configured by O-022.
- Approval timeline and actionable queues.

## Explicit non-goals

- No live Yjs synchronization, room access, cursor/presence, anchored comments, or realtime notification-center transport from Phase 5.
- No AI or Notion integration.
- No automatic publishing and no approval inferred from reactions.
- No silent template edits affecting active instances and no Director impersonation of PRO approval.

## Expected files and components

- Migrations for workflow templates/steps, frozen instances/steps, approval decisions, notifications, audit constraints/functions/triggers, and RLS.
- Central workflow transition/invalidation policy module and validated server entry points.
- Template administration UI, review queues, approval timeline, decision forms, changes-requested loop, and override UI.
- Notification creation/read-state modules; optional email adapter only after its decision/configuration.
- Unit, database integration/RLS, and Playwright workflow tests.

## Security considerations

- Each transition atomically checks actor identity, active membership, current assignment/role, current step, template rules, current version, and stale state.
- Freeze instances so later template changes cannot rewrite in-flight authority.
- Reject forged step IDs, version IDs, actor IDs, out-of-order transitions, repeated decisions, and stale approvals.
- Ensure `org_admin`, ordinary writers, reactions, and unassigned executives cannot approve unless a matching workflow step independently authorizes them.
- Overrides require all specified evidence and produce an append-only audit event/notification in the same transaction.
- Notification payloads reveal only resources the recipient may access.

## Acceptance criteria

- The standard writer submission → Director review → PRO final approval path works end to end.
- One configured project-led subset works end to end with only matching assigned heads deciding their steps.
- Requesting changes blocks advancement; resubmission targets a new immutable version and old decisions cannot approve it.
- A content edit after approval creates/reopens the correct workflow; only the accepted metadata allowlist avoids invalidation.
- Ordinary final approval is possible only for PRO or an explicitly configured terminal matching role.
- Director override fails unless permitted and reasoned, and succeeds only as a visibly distinct audited event with PRO notification.
- Workflow step and overall caption status remain separate.
- Direct unauthorized/stale requests fail at trusted boundaries even if UI is bypassed.

## Tests and verification commands

After inspecting actual scripts:

```powershell
{supabase-cli} db reset
{pm} run test -- workflows transitions invalidation notifications
{pm} run test:integration -- workflow-rls approvals overrides audit
{pm} run test:e2e -- standard-approval project-led-approval director-override
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Exercise concurrent/stale decisions, template mutation after instance creation, unassigned executive, wrong head role, `org_admin` without editorial authority, override without reason, and reactions attempting to advance state.

## Evidence that must be recorded

- Accepted workflow/separation/invalidation decisions and configured template fixtures.
- Transition matrix with actor, version, prior state, expected outcome, and audit/notification result.
- Database evidence that template edits leave active instances unchanged.
- Before/after evidence for stale approvals and Director Override presentation.
- Notification recipient/payload authorization checks.
- Exact commands/results, files changed, and email/realtime delivery items deferred.

## Stop condition

Stop when durable version-bound workflows and notifications pass their full transition/authorization matrix. Do not begin realtime collaboration, AI, Notion, deployment, commit, or push.

