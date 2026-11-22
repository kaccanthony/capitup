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
- **Decision:** Use Gemini API for synthetic-development-only caption assistance, with retrieval from authorized curated examples and explicit style profiles. AI creates editable drafts/suggestions only and never approves, publishes, silently replaces content, or impersonates a reviewer.
- **Boundary:** Gemini Free must receive only synthetic/test content. Private organization captions remain excluded until a provider/data-processing policy is explicitly approved. `GEMINI_API_KEY` remains server-only.

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

### A-021 - Phase 02 identity providers and email/password fallback

- **Status:** Accepted on 2026-10-25; resolves O-001
- **Decision:** Google OAuth is CapItUp's primary institutional identity provider. The login interface offers Google sign-in; a member may deliberately reveal a lower-page institutional email/password fallback. Microsoft Azure OAuth is no longer offered. Passwordless email magic links are not a CapItUp fallback.
- **Authorization boundary:** Every provider path must still verify the approved institutional identity and pass the exact allowlist, invitation claim, active-membership, and RLS checks. The email/password path must not permit open registration, username/local-part matching, or membership discovery. Passwords remain managed by Supabase Auth and are never stored or handled by CapItUp application code.
- **Configuration boundary:** No provider console, Supabase Auth setting, redirect URL, secret, or hosted project has been configured by this documentation decision. O-002 still determines approved domains and identity normalization; O-025 still determines CAPTCHA and rate-limit controls.

### A-022 - Mandatory Publicity Director review for standard captions

- **Status:** Accepted on 2026-10-26; resolves O-003
- **Decision:** Every standard caption requires a Publicity Director review step before final approval. The standard workflow is writer submission, mandatory Publicity Director review, then PRO final approval. A standard workflow cannot skip the Director step.

### A-023 - Only scheduled publication-time edits preserve approval

- **Status:** Accepted on 2026-11-06; resolves O-005
- **Decision:** Changing only the scheduled publication time preserves existing approval. Any change to caption content, title, content kind, tags, destination platforms, deliverable links, content assignments, special-case settings, or the evaluated policy invalidates the affected approval and moves the content into a new review state. Historical versions, decisions, and audit evidence remain immutable.

### A-024 - In-app notifications for the MVP

- **Status:** Partially accepted on 2026-10-26; partially resolves O-022
- **Decision:** Durable in-app notifications are sufficient for the MVP. External email notifications are deferred until a provider, sender domain, authentication, delivery policy, and unsubscribe requirements are separately chosen. Phase 04 may create in-app notification records but must not send email.

### A-025 - Independent approval of PRO-authored captions

- **Status:** Accepted on 2026-11-22; resolves O-004
- **Decision:** A PRO cannot independently self-approve a caption they authored. A workflow instance must freeze exactly one independent alternative: Publicity Director only, one existing `executive` with an explicit President designation, or unanimous active `junior_officer` members. A President designation is separate authorization data, never a client-provided or display-only title.
- **Junior-Officer roster rule:** The workflow snapshots every active Junior Officer at instance creation. A snapshot member who later becomes suspended, expires, resigns, or is temporarily unavailable is ignored for unanimity while that condition holds. Availability expiry or revocation restores the frozen member's obligation if the step remains pending.
- **Designation governance:** Only the website owner, Kent, may grant the President designation. The owner or a `publicity_director` may revoke it; a director may not grant it. Both paths must be server-authorized, require a reason, and create immutable audit evidence. The owner is a server-managed allowlist authority, never a client-editable display label.
- **Availability governance:** A `publicity_director` or `pro` may mark an active Junior Officer temporarily unavailable, with a required audit reason. The frozen workflow roster must exclude that unavailable member from unanimity until the recorded availability ends or is revoked; suspension, expiry, and resignation remain independently non-blocking.
- **Rationale:** Separating designation authority from ordinary roles prevents a director from appointing a President. A frozen roster preserves review accountability while documented absence and ended memberships cannot indefinitely block approval.

### A-026 - Phase 5 suggestion implementation

- **Status:** Accepted on 2026-10-26; resolves O-013
- **Decision:** CapItUp will not use Tiptap's paid Tracked Changes extension. It will implement a narrower first-party suggestion-record model: an attributed insert, delete, or replacement proposal is anchored to the live document and mirrored to Supabase. An authorized reviewer may accept or reject the intact proposal through a trusted server operation, which creates immutable audit evidence. A proposal that cannot be safely applied after intervening edits becomes stale and requires a new proposal; it must not silently overwrite current content.
- **Rationale:** This preserves the product's required human review, attribution, auditability, and authorization boundaries without introducing an external paid Tiptap dependency. It is intentionally not represented as the full Tiptap/word-processor tracked-changes product.

### A-027 - Phase 6 style and Gemini development policy

- **Status:** Accepted on 2026-10-27; resolves O-016, O-017, O-018, and the AI-log portion of O-023
- **Curatorship:** A `publicity_director` or `pro` may create and edit organization-default or campaign style profiles. An active `publicity_head` may create and edit campaign profiles only within their assigned project. A `publicity_director`, `pro`, `executive`, or eligible active `publicity_head` may activate the corresponding profile. Activation is server-authorized and audited; an Executive's exception applies only to style-profile activation, not caption editing or general settings.
- **Personal samples:** Personal samples are private to the author by default. Authors may explicitly share a sample with the organization and later revoke that sharing; revocation excludes it from every future retrieval immediately. It does not retroactively alter historical generation provenance.
- **Gemini development boundary:** Use `gemini-3.8-flash` as the current Gemini Flash model. Gemini Free is limited to synthetic/test content. Private organization captions, styles, samples, and prompts remain excluded until a provider/data-processing policy explicitly authorizes them.
- **Quota, abuse control, and retention:** Allow at most 5 requests per user per rolling 10-minute window, 25 requests per user per UTC day, and 250 requests per organization per UTC day. A rate-limited account resets automatically when its 10-minute window expires; there is no manual unblock. Enforce these limits atomically against the authenticated account and organization, never a username. Under the later A-033 retention decision, retain AI generation logs indefinitely rather than the original 180 days. Persist generated caption content only after a user explicitly inserts or saves it; a generation run may retain only non-content provenance/usage.
- **Evaluation gate:** Before private-caption use can be enabled with an approved provider, the versioned evaluation suite must show at least 80% human-reviewed acceptance. This does not override the Gemini Free synthetic-only boundary.

### A-028 - Phase 5 Liveblocks, canonical collaboration data, and revocation

- **Status:** Accepted on 2026-11-06; resolves O-012, O-014, and O-015
- **Provider:** Managed Liveblocks is the sole development and deployed realtime collaboration provider. CapItUp does not deploy Hocuspocus or another collaboration server. `LIVEBLOCKS_SECRET_KEY` remains server-only.
- **Canonical storage:** Liveblocks owns realtime Yjs transport, presence, cursors, selections, and provider snapshots. Supabase is the durable system of record for collaboration-document references, comments, replies, mentions, suggestions, resolutions, decisions, attribution, and audit evidence. Submitted caption versions retain the exact Liveblocks snapshot/version reference plus immutable JSON, plain text, normalized text, and a content hash.
- **Authorization lease:** CapItUp authorizes a collaboration session for no more than four hours. It revalidates on every connection or reconnection and at least once per minute while connected. A member who retains view access is downgraded to read-only; a member who loses view access is disconnected. Durable Supabase mutations always reauthorize independently of the room token.
- **Revocation and offline behavior:** Assignment or membership changes revoke matching CapItUp collaboration sessions. The client promptly reloads or disconnects after observing the change. Offline support is disabled; edits produced after authorization expires or is revoked are not accepted as an authoritative snapshot or durable mutation. Users may copy unsent local text, but it cannot overwrite the canonical document automatically.
- **Provider limitation:** The selected Liveblocks access-token API does not expose custom token expiry or active-token revocation. Four hours is therefore CapItUp's maximum application lease; Liveblocks may issue a shorter provider token. Prompt client downgrade/eviction is enforced through CapItUp revalidation, while hard provider-token expiry remains provider-controlled.

### A-029 - Notion posting calendar and manual caption exchange

- **Status:** Accepted on 2026-11-22; resolves O-019, O-020, and O-021. Implementation remains pending.
- **Calendar surface:** The existing calendar is a calendar view of the Notion database **2627 Postings New** (database `3e6e30de-b33c-804c-9228-deea599d1d85`, data source `0c2e30de-b33c-8396-a4c8-878f7225124b`), grouped by **Posting Date & Time**. It is not a separate Notion Calendar account calendar. Restrict the internal integration to this shared data source; do not add a Google or Microsoft Calendar dependency for it.
- **Record identity:** Each Notion row represents a posting/content item, not a CapItUp project. Link `notion_page_id` to one `content_item_id` within an explicitly selected project; do not infer a project from the row title or event label. Preserve existing Notion rows and their templates. The current project-level importer must be migrated before activating this data source.
- **Field ownership:** Import `Post ID` (title) as the posting title, `Posting Date & Time` (date, nullable, Asia/Manila display) as the schedule, and `Deliverable Deadline` (date, nullable) as a reference deadline. Import `Event Name` (select) as an explicit event label only if a matching controlled project/event mapping exists. Keep `Assignee`, `Assigner`, `Priority`, `Deliverable STATUS`, `Post STATUS`, `SHOOTING DAY`, `Parent item`, `Sub-item`, and `🖌️ Creatives Non-Post Tasks` Notion-owned and untouched. The app owns caption text, version/approval history, and the manual export of `Caption STATUS`; map only to existing Notion options (`NOT STARTED`, `WRITING`, `FOR REVIEW`, `NEEDS REVISION`, `APPROVED`, `PUBLISHED`, `ON HOLD`, `NOT NEEDED`, `CANCELLED`) with an explicit conversion table. Never equate `Post STATUS` with approval. Resolve and pin actual Notion property IDs/types from the data source API during setup; reject missing or changed fields instead of writing by a guessed ID.
- **Caption and viewer placement:** Add one dedicated `CapItUp Viewer` URL property to the data source. Its value is `${APP_ORIGIN}/projects/{projectId}/content/{contentItemId}/view`, with UUIDs resolved from a server-owned page-to-content link; it requires CapItUp sign-in and normal content-view authorization. Render a lightweight read-only view from the latest authorized Supabase snapshot/approved version, without issuing a Liveblocks write token. Store the exchangeable caption in a clearly tagged `CapItUp Caption` section of the linked Notion page; never replace the page's task template, unrelated blocks, or attachments.
- **Manual exchange:** Only a user click starts Push or Pull/Reconcile. No caption body is sent or ingested by webhooks, approval callbacks, or background jobs. Capture the local content/version hash and the Notion caption-section hash plus page edit time before either direction. Re-read both before writing. On divergence from the last common hash, show both versions and require an explicit choice; never silently overwrite. A Notion edit is not an approved CapItUp version: pulling changed text creates a new draft/version through the normal server workflow and invalidates any affected approval before it can be approved again. An unchanged Notion copy of an approved CapItUp version retains that approval. Never mutate immutable submitted versions.
- **Conversion and failure:** Convert supported Tiptap JSON nodes/marks to Notion paragraph/rich-text blocks and back with a restricted, sanitized converter. Preserve paragraph breaks, emoji, hashtags, and supported links; reject or visibly flag unsupported nodes/marks. Chunk each Notion rich-text text object to at most 2,000 characters without splitting Unicode surrogate pairs. Commit local Supabase edits and approval decisions before any independent Notion request. A Notion 429, timeout, validation error, or conflict records a retryable sync state and shows a manual Retry control; it never rolls back local approval. Store hashes, direction, actor, timestamps, and conflict/audit evidence in Supabase.
- **Rationale:** The live database schema and sample posting page show schedule fields and task-template content, but no caption property or CapItUp link. A dedicated caption section and URL property preserve that existing workflow while keeping Supabase authoritative for approval and Liveblocks authoritative only for live editing.

### A-030 - Institutional identity and role display

- **Status:** Accepted on 2026-11-22; resolves O-002 and O-006.
- **Identity:** `@fit.edu.ph` is the institutional email domain. An exact email outside that domain may still be admitted when the owner approves and records it in the server-managed allowlist. Domain membership alone never grants access; every account still needs a current allowlist entry and active membership. Normalize by trimming and lowercasing the full email, and never match only the username/local part.
- **Role display:** Show every active organization role, sorted highest first: `org_admin`, `executive`, `pro`, `publicity_director`, `junior_officer`. This is presentation order only; permissions are the union of each explicitly assigned active role and are not inherited from the display rank.
- **Rationale:** The exact allowlist allows owner-approved external collaborators without opening registration. A stable role order keeps multi-role identity readable without changing authorization.

### A-031 - CapItUp brand from supplied artwork

- **Status:** Accepted on 2026-11-22; resolves O-010. See [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md).
- **Decision:** Use the supplied square celestial pen illustration unchanged as the official image mark, with a separate CapItUp text lockup. Base the dark UI on its black/charcoal field, electric violet `#8C52FF`, and starlight gold `#FADF66`. Use Space Grotesk for headings and Inter for body/UI. Do not invent a recolored or light-background logo variant; use the original image on a dark badge when the surrounding surface is light.
- **Rationale:** The artwork contains no embedded wordmark or isolated small icon. Separating the type lockup preserves its visual identity and keeps the product name readable at small sizes.

### A-032 - In-app notifications only

- **Status:** Accepted on 2026-11-22; resolves O-022 and confirms A-024.
- **Decision:** CapItUp sends no email notifications. Keep workflow and other product notifications in-app only; no email notification provider, sender domain, delivery tracking, or unsubscribe flow is needed.
- **Rationale:** The accepted MVP notification channel already covers the requested workflow without external delivery operations.

### A-033 - Indefinite data retention

- **Status:** Accepted on 2026-11-22; resolves O-023 and supersedes A-027's former 180-day AI-log limit.
- **Decision:** Retain drafts, soft-deleted items, audit history, collaboration state, sync logs, security events, and AI generation logs indefinitely. Do not schedule deletion or anonymization for these records. Generated caption content still persists only after a user explicitly inserts or saves it, as A-027 requires.
- **Rationale:** The organization wants complete historical and audit records. This increases storage and privacy exposure; access controls, backups, and any future legal deletion requirement still need separate operational handling.

### A-034 - Backup and recovery targets

- **Status:** Accepted on 2026-11-22; resolves O-024 as a policy target. Restore execution remains unverified.
- **Decision:** On a paid tier, use Supabase daily automated backups or enable its PITR add-on for finer recovery points; Supabase stops separate daily backups while PITR is enabled. On a free tier, take a manual `pg_dump` at least weekly. Target RPO (maximum acceptable data loss) is 24 hours and RTO (time to restore service from backup plus redeploy) is 4 hours. The Publicity Director (Kent) is primary operator, with one designated backup person. Test a full restore quarterly. Recovery scope includes the database, securely stored `.env` secrets, migration files, and Git-managed code.
- **Operational gap:** Weekly `pg_dump` alone cannot meet a 24-hour RPO: up to seven days of changes could be lost. A free-tier deployment needs at least daily verified backups or an explicitly relaxed RPO before claiming the target is met. The backup person must be named and a quarterly restore test must be recorded. Store secrets in a protected backup vault, never in Git. Supabase's [backup documentation](https://supabase.com/docs/guides/platform/backups) distinguishes paid daily backups, the optional PITR add-on, and manual free-tier exports.

## Open decisions

| ID | Decision needed | Must resolve before | Required outcome/evidence |
|---|---|---|---|
| O-025 | CAPTCHA/rate-limit provider, thresholds, and administrative unblock procedure for authentication | Phase 2 | AI limits and automatic reset are set by A-027; authentication still needs an abuse policy that cannot globally lock another person's account |
| O-027 | Pilot participants, support owner, metrics baseline/targets, and exit criteria | Phase 8 | Approved pilot charter and privacy-safe measurement plan |
| O-028 | Permanent phase numbering after the user-directed Phase 01 foundation: retire/rename the earlier Phase 0 and UI-foundation files, or re-sequence the remaining roadmap | Before authorizing the next implementation phase | One unambiguous phase sequence reflected consistently in `PLANS.md` and `harness/build/` |

## Spec clarification notes

- The product brief contains legacy `CaptionFlow` prose and scaffold commands. Planning uses `CapItUp` because repository instructions explicitly make that the product identity; the product behavior is otherwise unchanged.
- Phase 4 owns durable workflow-notification creation. Phase 5 adds realtime delivery/presence and the integrated notification center; this avoids implementing the same responsibility twice.
- Liveblocks owns live Yjs transport, presence, selections, and provider snapshots. Under A-028, Supabase owns durable comments, replies, mentions, resolutions, suggestions, reactions, authorization evidence, immutable versions, workflow, and audit records.
- AI and Notion are included in the roadmap but are not gates for the first internal usability test of the trusted core. They remain part of the full planned sequence unless product scope is formally changed.
- The current Phase 01 foundation overlaps the earlier Phase 0 foundation scope by explicit user direction. Existing compliant implementation should be audited and reused rather than regenerated. Until O-028 is resolved, neither `PLANS.md` nor the older `phase-01-ui-foundation.md` authorizes the next implementation phase.

