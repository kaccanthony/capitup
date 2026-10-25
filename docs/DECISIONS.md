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
- **Decision:** Store versioned length policies in the database. A-017 supersedes the earlier recommendation unit: organization recommendations use a versioned word-count algorithm, while character-based platform hard limits count extended grapheme clusters with a tested fallback unless the provider defines another algorithm. Keep hard platform limits distinct from recommendations, and preserve canonical normalized plain text when applying supported Unicode styles.

### A-010 — Controlled taxonomy

- **Status:** Accepted
- **Decision:** Content formats are `post`, `video`, and `article`; tags are seeded controlled vocabulary constrained by format. Users request new tags rather than creating arbitrary ones.

### A-011 — Package manager

- **Status:** Accepted on 2026-10-20
- **Decision:** Use npm with a single committed `package-lock.json` and invoke it as `npm.cmd` on Windows PowerShell hosts where script execution policy blocks the `npm.ps1` shim.
- **Rationale:** npm ships with the available Node.js installation, while pnpm was not installed. This avoids adding a second global package manager and satisfies the one-lockfile rule.

### A-012 — Current Phase 01 authority

- **Status:** Accepted on 2026-10-21 for the current user-directed phase
- **Decision:** `harness/build/phase-01-foundation.md` is the active plan for the user-requested Phase 01 project foundation. It supersedes `harness/build/phase-01-ui-foundation.md` only for this phase; the older UI plan must not be implemented under the foundation request.
- **Rationale:** The current request has higher precedence than the existing roadmap and deliberately limits Phase 01 to project foundation concerns. Permanent roadmap renumbering remains open in O-028.

### A-013 — Environment validation boundary

- **Status:** Accepted on 2026-10-21
- **Decision:** Use Zod for typed environment validation with separate public and server-only modules. Only documented `NEXT_PUBLIC_*` keys may cross into client code. Variables owned by later integrations remain optional until their feature is enabled or adapter is instantiated, but any configured value must validate. Validation errors identify keys without echoing values.
- **Rationale:** This follows the product specification's Zod architecture, protects server secrets from client imports, and permits credential-free foundation builds without weakening validation once a feature is activated.

### A-014 — Foundation Supabase scope

- **Status:** Accepted on 2026-10-21
- **Decision:** Phase 01 may initialize, start, inspect, and stop only the project-local Supabase stack. It must not link a hosted project, use hosted or real credentials, create business schema/Auth/RLS behavior, or substitute a remote project when local containers are unavailable.
- **Rationale:** The phase requires a local development setup while explicitly excluding authentication, product data, external services, and credentials.

### A-015 — Offline Phase 02 implementation authority

- **Status:** Accepted on 2026-10-24 for the current user-directed task
- **Decision:** Implement the credential-free portions of `harness/build/phase-02-auth-membership.md` as version-controlled migrations, application boundaries, synthetic tests, and hosted-development instructions. A hosted Supabase development project is the intended later verification target, but this pass must not link, contact, migrate, or otherwise modify any remote project. Docker and local Supabase containers are intentionally unavailable and are not prerequisites for this pass.
- **Rationale:** This preserves reviewable schema and authorization work while keeping credentials, external writes, production data, and unverifiable database claims outside the authorized scope. O-001, O-002, O-006, O-023, and O-025 remain unresolved where the implementation cannot safely choose policy.

### A-016 — Configurable caption-length exception approval

- **Status:** Accepted on 2026-10-25; resolves O-007
- **Decision:** A task selects a versioned exception-approval template or preset. The template selects one or more eligible categories—`publicity_director`, project `publicity_head`, `pro`, or an `executive` who also has the active project assignment `co_project_head` or `project_head`—and declares whether authorization requires any one selected category (`any_of`) or every selected category (`all_of`). The template must explicitly define its rejection-completion rule. The selected rules are frozen for the submitted caption version.
- **Requester and self-approval rule:** `junior_officer`, `publicity_director`, and `pro` may request with a trimmed justification of at least 50 characters. Only `publicity_director` and `pro` may approve their own requests; `junior_officer` may not.
- **Rationale:** Different tasks can require different combinations without conflating organization roles with project assignments or changing historical decisions when a preset is edited.
- **Consequences:** Exception decisions use version-bound child records rather than one mutable approver field. A changed caption version requires a new approval. Approval/rejection remarks are optional, revocation by an eligible `executive` or `pro` requires a reason, audit records remain immutable, notifications follow the product specification, and no exception may bypass a platform hard limit.

### A-017 — Versioned word-based caption recommendations

- **Status:** Accepted on 2026-10-25; resolves O-008
- **Decision:** Organization caption recommendations use maximum word counts. The organization intends to enter initial settings of 120 words for `post`, 100 words for `video`, and 200 words for `article`. These are created through application settings rather than compiled constants or migration seeds. Controlled-tag and destination overrides are also configured as versioned data rather than hard-coded in components. Effective times are stored as absolute timestamps and administered/displayed in `Asia/Manila` (Philippine Standard Time, UTC+08:00). With no active policy, the application reports that no organization recommendation is configured instead of applying a hidden fallback.
- **Governance:** `publicity_director` and `pro` may author or edit draft policy versions. `publicity_director`, `pro`, and `executive` may activate or reject a policy version. Executive policy activation is a narrow exception to the default read-only rule and grants no general content or settings write access.
- **History:** Active policies are immutable. A change creates a new version; submitted caption versions retain the exact policy-version identifiers and evaluated values used. Historical views continue to expose Policy v1 and its contents after Policy v2 supersedes it.
- **Warnings:** Policies support `Within recommendation`, `Approaching recommendation`, `Over recommendation`, `Special-case exemption`, and the separate provider-backed `Over platform maximum` state. Approaching thresholds are policy data, not component constants.
- **Rationale:** Editable, effective-dated policy records allow future term, tag, and destination changes without a redeploy or reinterpretation of prior approvals.

### A-018 — Word-counting and warning policy algorithm

- **Status:** Accepted on 2026-10-25; resolves O-029
- **Decision:** The shared word-count algorithm preserves apostrophes inside non-hyphenated terms, splits hyphenated terms into nonempty components, counts numeric/alphanumeric terms and mentions as one word, counts each standalone emoji grapheme as one word, counts an HTTP(S) or `www.` URL as one word, excludes hashtags, and treats a word-like non-whitespace sequence in non-whitespace writing systems as one word without language-specific segmentation.
- **Warning policy:** The content tag's resolved recommendation is the comparison basis. The active configuration provides a 40-word approaching offset and a 400-word global hard maximum for every tag. More than 40 remaining words is Normal; from exactly 40 remaining through the recommendation is Approaching recommendation; above the recommendation through 400 is Exceeds recommendation; above 400 is Exceeds hard maximum.
- **Implementation boundary:** The utility accepts the resolved policy values as input and embeds no fallback recommendation, offset, or maximum. Persisting, versioning, and resolving that policy data remains a later settings/data implementation.

### A-019 — Launch destination character-limit policy

- **Status:** Accepted on 2026-10-25; resolves O-009
- **Decision:** Seed the owner-supplied `v1` launch catalog as versioned destination-policy configuration in `Asia/Manila`: Facebook, FB Story, Facebook Community, Instagram, Instagram Story, Group Chats, X, TikTok, YouTube, Discord, LinkedIn, and ACM Website. The exact slug, label, allowed content kinds, maximum, and classification are in `docs/PRODUCT_SPEC.md`.
- **Validation:** Destination character limits are separate from word recommendations. The shared grapheme character counter includes all visible text, hashtags, mentions, URLs, whitespace, punctuation, and emoji. Every selected destination is evaluated independently, and only the failing destination is identified. Content above an applicable limit cannot reach ready-for-publication when that future workflow is implemented.
- **History and scope:** Per-organization policy rows are initialized idempotently from private launch templates, retain owner/source/version/effective-time metadata, and are never overwritten in place. Scheduling, external publishing, social OAuth, and provider integrations remain out of scope.

### A-020 — Deliverable links only

- **Status:** Accepted on 2026-10-25; resolves O-026
- **Decision:** CapItUp stores separate, validated deliverable-link records for images, videos, articles, Canva/Drive materials, registration links, and other committee-provided media. These links are metadata for the content item and are never part of the caption body.
- **Explicit exclusions:** No file uploads, Supabase Storage bucket, attachment table, malware scanning, upload/download controls, public asset URLs, or file-retention policy are included. A future change to native uploads requires a new accepted decision, migration, threat review, and security plan.

## Open decisions

| ID | Decision needed | Must resolve before | Required outcome/evidence |
|---|---|---|---|
| O-001 | Institutional identity provider: Google, Microsoft, magic-link/email fallback, or permitted combination | Phase 2 | Provider, ownership, verified claim used, callback requirements |
| O-002 | Exact institutional email domain(s) and normalization rules | Phase 2 | Approved domains and exception process |
| O-003 | Whether the Publicity Director review is mandatory for every standard caption | Phase 4 | Standard workflow template and skip rules |
| O-004 | Whether a PRO may author and submit directly to final approval or requires independent review | Phase 4 | Separation-of-duties rule and tests |
| O-005 | Which metadata edits do not invalidate approval | Phase 4 | Explicit field allowlist; all unspecified edits invalidate |
| O-006 | Organization role cardinality and primary-title presentation for people holding multiple roles | Phase 2 | Storage/UI rule without reducing authorization to one role |
| O-010 | Official colors, logo rules, and typefaces | The UI-foundation phase for final branding; placeholders may precede it | Approved brand inputs; otherwise retain provisional accessible tokens |
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
| O-027 | Pilot participants, support owner, metrics baseline/targets, and exit criteria | Phase 8 | Approved pilot charter and privacy-safe measurement plan |
| O-028 | Permanent phase numbering after the user-directed Phase 01 foundation: retire/rename the earlier Phase 0 and UI-foundation files, or re-sequence the remaining roadmap | Before authorizing the next implementation phase | One unambiguous phase sequence reflected consistently in `PLANS.md` and `harness/build/` |

## Spec clarification notes

- The product brief contains legacy `CaptionFlow` prose and scaffold commands. Planning uses `CapItUp` because repository instructions explicitly make that the product identity; the product behavior is otherwise unchanged.
- Phase 4 owns durable workflow-notification creation. Phase 5 adds realtime delivery/presence and the integrated notification center; this avoids implementing the same responsibility twice.
- Liveblocks owns live anchors and transport while Supabase owns authorization, immutable versions, workflow, and audit. O-014 must settle durable comment/suggestion canonical storage before implementation.
- AI and Notion are included in the roadmap but are not gates for the first internal usability test of the trusted core. They remain part of the full planned sequence unless product scope is formally changed.
- The current Phase 01 foundation overlaps the earlier Phase 0 foundation scope by explicit user direction. Existing compliant implementation should be audited and reused rather than regenerated. Until O-028 is resolved, neither `PLANS.md` nor the older `phase-01-ui-foundation.md` authorizes the next implementation phase.

