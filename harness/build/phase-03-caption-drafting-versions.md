# Phase 3 — Caption drafting and version history

## Objective

Implement the durable caption domain: projects/requests, controlled formats and tags, destinations/deliverables, assignments, policy-aware drafting, immutable versions, advisory reactions, Unicode conversion, optimistic concurrency, and authorized search.

## Dependencies

- Phase 2 authorization/RLS foundation complete.
- O-007, O-008, O-009, and O-026 resolved before their affected features are enabled.
- Phase 1 workspace shell available for integration.

## In-scope work

- Projects, content requests, caption items, assignments, deliverables, publication channels, and scheduled/deadline metadata.
- Seeded formats/tags and database-enforced format/tag relationships, tag retirement, closest-approved suggestion, and new-tag request workflow for Director/admin review.
- Versioned character-limit policies with specificity resolution, effective dates, recommendation versus hard maximum, and audited special-case exceptions.
- Shared Unicode grapheme counter using `Intl.Segmenter` plus tested fallback.
- TipTap single-user editor foundation, canonical editor JSON/plain text/normalized search text, immutable submitted snapshots, version history, and visual diff.
- Unicode Style Converter for all six required styles, preview/removal/skipped-character/accessibility warnings, protected URLs/emails/mentions/hashtags, undo/redo preservation, and canonical normalization.
- Looks Ready and Needs Refinement advisory reactions; Needs Refinement requires a short comment and neither reaction advances workflow.
- Optimistic concurrency for mutable records and authorized search/filter/archive over canonical data.

## Explicit non-goals

- No formal approval transitions or final approval; Phase 4 owns them.
- No simultaneous Yjs collaboration, remote cursors, anchored provider comments, suggesting mode, or room authorization; Phase 5 owns them.
- No AI generation/embeddings or Notion synchronization.
- No automatic publication or arbitrary tags.
- No hard-coded policy values inside UI components.

## Expected files and components

- Migrations for project/request/taxonomy/channel/deliverable/caption/version/assignment/reaction/limit/exception/search records with constraints, indexes, audit triggers, and RLS.
- Seed data for the exact approved content formats/tags and accepted publication channels/policies.
- Feature modules for projects, captions, taxonomy, limits, Unicode conversion, reactions, versions/diffs, and search.
- Server schemas/actions/queries and editor serialization/normalization utilities.
- Unit tests for validation, mappings, grapheme counting, policy resolution, normalization, concurrency, and reaction rules.
- RLS/integration and browser tests for create/edit/submit/history/search flows.

## Security considerations

- Every mutation revalidates active membership, project access, assignment, and resource organization.
- Database constraints and server validation enforce controlled vocabulary and valid format/tag pairs.
- Submitted versions are append-only and store exact editor JSON, plain text, normalized text, visible count, author, and timestamps.
- Rich text and URLs are validated/sanitized; uploaded attachments, if accepted, follow O-026 and Storage RLS.
- Search queries and results remain organization/project scoped, including historical versions.
- Special-case approval is authorized/audited and cannot suppress a true platform hard limit.
- Unicode conversion never destroys canonical searchable content or silently changes protected token classes.

## Acceptance criteria

- Authorized writers can create assigned caption items with all required metadata and multiple valid tags/destinations/deliverables.
- Invalid or retired tags and cross-format combinations fail at server/database boundaries.
- Submission creates a new immutable version without overwriting prior snapshots; stale optimistic updates are rejected clearly.
- Count behavior is correct for ASCII, combining marks, skin tones, flags, family/ZWJ emoji, line breaks, and supported Unicode symbols.
- Active policy resolution selects/explains the strictest applicable recommendation and distinguishes platform maximums.
- An approved exception changes only recommendation state and remains visible/audited.
- All six Unicode styles apply/remove on selected eligible text, preserve protected tokens and undo/redo, report skips, and retain normalized search text.
- Advisory reactions are version-bound, unique per defined category, require refinement comment, and never alter formal workflow state.
- Authorized filters/search return current and historical approved content without cross-project/organization leakage.

## Tests and verification commands

After inspecting actual scripts:

```powershell
{supabase-cli} db reset
{pm} run test -- captions taxonomy graphemes unicode limits reactions search
{pm} run test:integration -- captions rls versions concurrency
{pm} run test:e2e -- caption-drafting version-history
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Include direct mutation attempts against immutable versions, invalid tag relations, unauthorized searches, hard-limit exceptions, duplicate reactions, and stale update tokens.

## Evidence that must be recorded

- Migration/seed identifiers and exact accepted policy/channel values with decision references.
- Grapheme/Unicode fixture table and observed counts/conversions.
- Immutable version before/after evidence and stale-write rejection.
- RLS matrix for caption/project/search operations.
- Screenshots/artifacts for counter states, exception reason, converter warning, history/diff, and reactions.
- Exact commands/results, files changed, and deferred collaboration behavior.

## Stop condition

Stop when single-user durable drafting/version behavior and its authorization evidence pass. Do not implement formal approvals, realtime collaboration, AI, Notion, deployment, commit, or push.

