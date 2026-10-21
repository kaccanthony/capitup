# CapItUp decisions

## How to use this log

- **Accepted** entries restate decisions already made by `docs/PRODUCT_SPEC.md` or higher-priority repository instructions.
- **Open** entries are not permission to choose during implementation. Resolve each before the named phase, then record the selected option, rationale, date, and approver.
- Product behavior changes must be made in the product specification first; this log captures the choice and its consequences.

## Accepted decisions

### A-001 — Product identity

- **Status:** Accepted
- **Decision:** The product, repository, package, database project, and deployment slug are `CapItUp` / `capitup`. New material must not use the obsolete working name `CaptionFlow`.
- **Source:** `AGENTS.md` project identity. This resolves older-name references that remain in the product brief.

### A-002 — MVP application architecture

- **Status:** Accepted
- **Decision:** Use Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and Vercel. Do not add a standalone Express API for the MVP.
- **Rationale:** Route handlers/server actions cover the stated MVP needs without another deployment or trust boundary.

### A-003 — Durable platform ownership

- **Status:** Accepted
- **Decision:** Supabase owns Auth, PostgreSQL/RLS, Storage, workflow state, immutable caption versions, audit events, application notifications, and vector search.

### A-004 — Collaboration baseline

- **Status:** Accepted with an open hosting/commercial choice
- **Decision:** TipTap with Yjs supplies the editor/CRDT model. Live collaboration includes presence, cursors, selections, anchored comments, suggestions, and snapshot handoff. The recommended managed provider is Liveblocks; self-hosting requires persistent Hocuspocus infrastructure rather than a Vercel serverless function.

### A-005 — State separation

- **Status:** Accepted
- **Decision:** Mutable live documents, immutable submitted versions, anchored comments/suggestions, and formal version-bound decisions remain distinct. Approval never targets a moving live document.

### A-006 — Authorization model

- **Status:** Accepted
- **Decision:** Active membership, organization roles, temporal project assignments, and frozen workflow steps are separate inputs to authorization. Enforcement occurs in RLS and trusted server operations, not client presentation.

### A-007 — Human-controlled AI

- **Status:** Accepted
- **Decision:** Use the OpenAI Responses API with retrieval from authorized curated examples and explicit style profiles. AI creates editable drafts/suggestions only and never approves, publishes, silently replaces content, or impersonates a reviewer.

### A-008 — Notion integration model

- **Status:** Accepted
- **Decision:** The first release uses one organization-managed internal integration. Notion initially owns agreed event/project metadata; CapItUp owns captions, versions, comments, decisions, and approval history. Sync only explicitly mapped fields.

### A-009 — Character and Unicode policy

- **Status:** Accepted
- **Decision:** Store versioned length policies in the database, count extended grapheme clusters with a tested fallback, keep hard platform limits distinct from recommendations, and preserve canonical normalized plain text when applying supported Unicode styles.

### A-010 — Controlled taxonomy

- **Status:** Accepted
- **Decision:** Content formats are `post`, `video`, and `article`; tags are seeded controlled vocabulary constrained by format. Users request new tags rather than creating arbitrary ones.

### A-011 — Package manager

- **Status:** Accepted on 2026-10-20
- **Decision:** Use npm with a single committed `package-lock.json` and invoke it as `npm.cmd` on Windows PowerShell hosts where script execution policy blocks the `npm.ps1` shim.
- **Rationale:** npm ships with the available Node.js installation, while pnpm was not installed. This avoids adding a second global package manager and satisfies the one-lockfile rule.

## Open decisions

| ID | Decision needed | Must resolve before | Required outcome/evidence |
|---|---|---|---|
| O-001 | Institutional identity provider: Google, Microsoft, magic-link/email fallback, or permitted combination | Phase 2 | Provider, ownership, verified claim used, callback requirements |
| O-002 | Exact institutional email domain(s) and normalization rules | Phase 2 | Approved domains and exception process |
| O-003 | Whether the Publicity Director review is mandatory for every standard caption | Phase 4 | Standard workflow template and skip rules |
| O-004 | Whether a PRO may author and submit directly to final approval or requires independent review | Phase 4 | Separation-of-duties rule and tests |
| O-005 | Which metadata edits do not invalidate approval | Phase 4 | Explicit field allowlist; all unspecified edits invalidate |
| O-006 | Organization role cardinality and primary-title presentation for people holding multiple roles | Phase 2 | Storage/UI rule without reducing authorization to one role |
| O-007 | Who may approve caption-length special cases | Phase 3 | Authorized roles/steps, evidence, and audit behavior |
| O-008 | Default character recommendation by content format and initial effective date/term | Phase 3 | Seed policy values and provenance |
| O-009 | Publication destinations available at launch and any documented hard-limit algorithms | Phase 3 | Seeded channels and verified platform-limit sources |
| O-010 | Official colors, logo rules, and typefaces | Phase 1 for final branding; placeholders may precede it | Approved brand inputs; otherwise retain provisional accessible tokens |
| O-012 | Managed Liveblocks/TipTap budget versus self-hosted Hocuspocus on Render/Fly.io | Phase 5 | Provider/hosting, cost owner, data residency, retention, recovery |
| O-013 | Whether full tracked changes is required at launch and whether paid TipTap capability is acceptable | Phase 5 | Paid feature or approved narrower suggestion-record behavior |
| O-014 | Canonical storage/mirroring and export model for anchored comments/suggestions | Phase 5 | Liveblocks versus Supabase ownership, retention, audit, recovery contract |
| O-015 | Assignment revocation/expiry behavior for already-connected collaboration sessions | Phase 5 | Token lifetime, revalidation, eviction, offline behavior |
| O-016 | Who curates organization-level AI style profiles and samples | Phase 6 | Authorized roles and audit workflow |
| O-017 | Whether personal writing samples are author-only or may be shared with the organization | Phase 6 | Consent, visibility, revocation, retrieval rules |
| O-018 | AI model selection, quota limits, prompt/output retention, and evaluation thresholds | Phase 6 | Versioned model/prompt policy, budgets, retention, go/no-go criteria |
| O-019 | Whether the existing Notion calendar is a database view or the separate Notion Calendar product | Phase 7 | Confirmed integration surface; use source calendar API if required |
| O-020 | Existing Notion properties and exact field ownership/mapping | Phase 7 | Property IDs/types, source of truth, direction, null/conflict rules |
| O-021 | Whether final approved captions sync to Notion | Phase 7 | Explicit opt-in field, direction, sanitization, failure behavior |
| O-022 | Whether email plus in-app notifications are sufficient for MVP and which email provider is used | Phase 4 before external email; Phase 8 before pilot | Channel scope, provider, sender domain, unsubscribe/delivery rules |
| O-023 | Retention for drafts, deleted items, audit history, collaboration state, AI logs, sync logs, and security events | Before production data in affected phase; no later than Phase 8 | Per-class duration, deletion/anonymization, legal owner |
| O-024 | Backup frequency, recovery point/time objectives, and responsible operator | Phase 8 | Documented targets and successful recovery exercise |
| O-025 | CAPTCHA/rate-limit provider, thresholds, and administrative unblock procedure | Phase 2 for auth; Phase 6 for AI | Abuse policy that cannot globally lock another person's account |
| O-026 | Attachment scope, limits, accepted types, and malware-scanning requirement | Phase 3 if attachments are included | Upload policy or explicit deferral |
| O-027 | Pilot participants, support owner, metrics baseline/targets, and exit criteria | Phase 8 | Approved pilot charter and privacy-safe measurement plan |

## Spec clarification notes

- The product brief contains legacy `CaptionFlow` prose and scaffold commands. Planning uses `CapItUp` because repository instructions explicitly make that the product identity; the product behavior is otherwise unchanged.
- Phase 4 owns durable workflow-notification creation. Phase 5 adds realtime delivery/presence and the integrated notification center; this avoids implementing the same responsibility twice.
- Liveblocks owns live anchors and transport while Supabase owns authorization, immutable versions, workflow, and audit. O-014 must settle durable comment/suggestion canonical storage before implementation.
- AI and Notion are included in the roadmap but are not gates for the first internal usability test of the trusted core. They remain part of the full planned sequence unless product scope is formally changed.

