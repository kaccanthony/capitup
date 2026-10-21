# CapItUp implementation plan

## Purpose

This roadmap turns `docs/PRODUCT_SPEC.md` into bounded, reviewable implementation phases. The product specification remains authoritative for behavior. `AGENTS.md` governs working practice, and each phase file governs only its named phase.

This document is planning material only. It does not authorize dependency installation, credentials, external-service changes, deployment, commits, or pushes.

## Product guardrails

- Build a private, organization-only caption workspace named **CapItUp**.
- Keep organization roles, project assignments, and workflow steps separate.
- Treat the live collaborative document as mutable working state and submitted caption versions as immutable snapshots.
- Tie every formal decision to one exact immutable caption version.
- Enforce access at trusted server and database boundaries; UI visibility is never authorization.
- Keep AI output human-controlled draft material and keep Notion from becoming a competing caption source of truth.
- Do not add a standalone Express service for the MVP.
- Do not start AI or Notion integration before the core caption and approval workflow is reliable.
- Resolve open choices in `docs/DECISIONS.md` before the phase that depends on them.

## Phase sequence

| Phase | Plan | Outcome | Entry gate |
|---|---|---|---|
| 0 | `harness/build/phase-00-repository-foundation.md` | Reproducible local foundation and verified project conventions | Planning artifacts approved |
| 1 | `harness/build/phase-01-ui-foundation.md` | Accessible responsive application shell using local fixtures | Phase 0 complete |
| 2 | `harness/build/phase-02-auth-membership-rls.md` | Invitation-only identity, membership, assignments, RLS, and security events | Identity choices resolved; Phases 0–1 complete |
| 3 | `harness/build/phase-03-caption-drafting-versions.md` | Caption records, drafting, immutable versions, limits, Unicode tools, reactions, and search | Phase 2 authorization foundation complete |
| 4 | `harness/build/phase-04-approval-workflow.md` | Version-bound configurable approvals, overrides, and workflow notifications | Phase 3 immutable versions complete |
| 5 | `harness/build/phase-05-realtime-collaboration.md` | Authorized collaborative editing, anchors, suggestions, presence, and snapshot handoff | Collaboration approach resolved; Phases 2–4 complete |
| 6 | `harness/build/phase-06-ai-assistance.md` | Authorized retrieval-assisted drafting with provenance, quotas, and evaluation | Core workflow reliable; AI governance choices resolved |
| 7 | `harness/build/phase-07-notion-integration.md` | Idempotent, narrow Notion calendar/status synchronization | Core workflow reliable; Notion mapping resolved |
| 8 | `harness/build/phase-08-hardening-pilot.md` | Security, accessibility, recovery, end-to-end, and controlled-pilot evidence | All included MVP capabilities complete |

Phases run in order unless an explicit accepted decision changes their dependencies. A phase may be split into smaller tasks, but its acceptance criteria may not be silently weakened.

## Milestone gates

### Gate A — Foundation ready

Phases 0–1 are complete when the repository has one package-manager lockfile, strict TypeScript and verification scripts, an accessible original CapItUp shell, fixture-only screens, and no live integrations.

### Gate B — Trusted core ready

Phases 2–4 are complete when invited membership, cross-organization isolation, project-scoped permissions, immutable versions, controlled taxonomy, caption policy handling, and both required approval paths pass positive and negative tests. This is the earliest point at which the core workflow can be considered for an internal usability exercise.

### Gate C — Collaboration ready

Phase 5 is complete when two authorized sessions can collaborate without lost edits, unauthorized sessions cannot observe a room, comments/suggestions remain attributable and anchored, and submission creates the exact immutable version later approved.

### Gate D — Optional integrations ready

Phases 6–7 are independently acceptable only after the core is reliable. AI must preserve authorization and human control. Notion synchronization must have explicit field ownership, verified webhooks, idempotency, retry, and visible conflict handling.

### Gate E — Controlled pilot ready

Phase 8 closes the MVP only when the product-spec pilot criteria, full authorization review, accessibility checks, backup/recovery exercise, and highest-risk end-to-end scenarios have recorded evidence.

## Cross-phase verification policy

- Before each implementation phase, inspect `package.json`, the selected lockfile, existing migrations, and available scripts. Commands in phase files are planned command families until Phase 0 establishes their exact names.
- Run focused tests first, followed by the phase-appropriate lint, typecheck, test, and build gates.
- Treat local build proof, browser behavior, database/RLS behavior, and external integration behavior as separate evidence.
- Use seeded allowed, denied, suspended, expired, and cross-organization personas for authorization work.
- Record commands actually run and their observed results in `harness/build-log.md`; never convert planned commands into claimed evidence.
- Stop at the end of the selected phase. Later phases require a new explicit request.

## Plan maintenance

- Product changes belong in `docs/PRODUCT_SPEC.md` first.
- Accepted choices and their rationale belong in `docs/DECISIONS.md`.
- System boundaries and flows belong in `docs/ARCHITECTURE.md`; security controls belong in `docs/SECURITY.md`.
- Implementation discoveries needed by later phases belong under `harness/context/`.
- Any plan update must preserve traceability to the product specification and identify newly introduced assumptions.

