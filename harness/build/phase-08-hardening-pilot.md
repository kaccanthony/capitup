# Phase 8 — Hardening and controlled pilot

## Objective

Prove that the completed MVP is secure, accessible, recoverable, observable, and understandable enough for a small controlled team pilot, then record the pilot outcome without expanding product scope.

## Dependencies

- All capabilities included in the intended pilot are complete; Phases 0–5 are mandatory, while Phases 6–7 are included only if the approved pilot scope includes them.
- O-022, O-023, O-024, and O-027 resolved, plus every earlier open decision relevant to enabled features.
- Explicit separate authorization for any deployment, production-like data, external-service change, security test against hosted systems, or real-user pilot.

## In-scope work

- Full privilege/RLS/Storage/Realtime/room authorization review and negative test matrix.
- Dependency, secret, client-bundle, headers/CSP/cookies, webhook, AI privacy, and sync security review.
- WCAG 2.2 AA-focused accessibility audit across login, navigation, dashboard, workspace, editor, workflow, notifications, admin, and enabled integrations.
- Complete unit/integration/e2e suite, including main standard and project-led approval journeys and two-session collaboration.
- Performance/reliability checks for agreed representative loads, refresh persistence, reconnect, provider failure, and optional integration degradation.
- Database/Storage/collaboration backup/export and recovery exercise with recorded recovery point/time observations.
- Operational runbooks for access suspension, secret rotation procedure (documentation only unless separately authorized), incident handling, provider outage, dead-letter replay, restore, and member support.
- Controlled pilot setup, consent/onboarding, measurement of approval time/revision loops/confusion, issue triage, and exit recommendation.

## Explicit non-goals

- No unapproved deployment, real credentials, production writes, penetration testing of third parties, public launch, or open signup.
- No new product features, multi-organization tenancy expansion, automatic social posting, AI images, custom model training, or integration broadening.
- No weakening/deleting failing tests to meet a date and no claim of readiness without recorded evidence.
- No Phase 6/7 requirement for the first core usability pilot if those optional integrations are intentionally excluded.

## Expected files and components

- Expanded unit/integration/e2e/security/accessibility/performance test suites and fixtures.
- Audit reports/artifacts under an agreed non-secret evidence location.
- Backup/recovery, incident, access, integration-degradation, and support runbooks.
- Pilot charter, participant-role matrix, privacy-safe metrics plan, issue log, and exit report.
- Final updates to `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `PLANS.md`, `harness/context/`, and `harness/build-log.md` reflecting observed reality.

## Security considerations

- Treat any critical/high authorization bypass, missing RLS, secret exposure, room leakage, mutable approval, unsafe webhook, AI data leak, or unrecoverable final-caption data as a release blocker.
- Use synthetic/non-production data for destructive recovery tests unless separately approved.
- Limit pilot membership to approved active identities and least privilege; define rapid suspension/removal.
- Collect only approved pilot metrics and avoid storing unnecessary personal behavior data.
- Redact secrets/private captions from evidence; restrict security and backup artifacts.
- Document secret rotation but do not rotate or change external systems without explicit authorization.

## Acceptance criteria

- Every product-spec MVP criterion included in the pilot has linked automated or manual evidence.
- All exposed tables/buckets/channels/rooms pass positive and negative authorization review, including cross-organization and revoked access.
- Standard Director-to-PRO and one project-head workflow pass end to end with exact-version decisions, invalidation, and override evidence.
- Two-session collaboration, anchors, suggestions, snapshot handoff, refresh, and reconnect pass without unauthorized observation or lost acknowledged edits.
- Controlled taxonomy, database-driven limits, grapheme counting, special cases, Unicode normalization, search, and final-caption export/recovery pass.
- Accessibility audit has no unresolved launch-blocking issue and all limitations have owners/disposition.
- Backup/recovery exercise succeeds against accepted O-024 targets.
- AI and Notion failures do not block core workflow when those integrations are enabled.
- Pilot metrics and feedback are reviewed against O-027 exit criteria; unresolved blockers prevent a readiness claim.

## Tests and verification commands

Inspect actual scripts and approved environments first:

```powershell
{supabase-cli} db reset
{pm} run format:check
{pm} run lint
{pm} run typecheck
{pm} run test
{pm} run test:integration
{pm} run test:e2e
{pm} run test:a11y
{pm} run build
git diff --check
git status --short
```

Run any dependency/secret/header/performance/recovery tools only if they are already approved and documented in the repository. Manual checks must cover the product-spec MVP acceptance list and record the environment/date/persona used.

## Evidence that must be recorded

- Traceability matrix from every pilot-scoped MVP criterion to test, artifact, result, and owner.
- Full command/version/environment results, flaky/retried tests, and explicit unverified items.
- RLS/Storage/Realtime/room authorization matrix and security-review findings/dispositions.
- Accessibility report and keyboard/screen-reader/reduced-motion observations.
- Backup/export/restore timestamps, measured recovery point/time, integrity comparison, and responsible operator.
- Pilot participant roles (without unnecessary personal data), dates, metrics, issues, decisions, and exit recommendation.
- Complete files changed and confirmation of which external actions were separately authorized and performed.

## Stop condition

Stop after recording the hardening and pilot evidence plus a clear ready/not-ready recommendation. Do not deploy, expand the pilot, remediate out-of-scope findings, commit, push, or begin new features without a separate request.

