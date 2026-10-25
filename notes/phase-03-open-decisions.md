# Phase 03 open-decision worksheet

## Status

This note is a worksheet for the product owner. O-007, O-008, O-009, O-026, and O-029 were resolved on 2026-10-25 and are preserved below for context. This note does not authorize hosted database changes, credentials, deployment, commit, or push.

Record each final choice in `docs/DECISIONS.md` before enabling the affected Phase 03 behavior. Numeric policy values, platform limits, roles, and storage requirements must not be guessed during implementation.

## O-007 — Who may approve caption-length special cases?

### Decision required

Choose who may approve an exception to an organization recommendation and whether project assignment, organization role, or both are required.

Questions to answer:

- Which actors may request an exception?
- Which actors may approve or reject it?
- May the requester approve their own request?
- Is approval based on an organization role such as `publicity_director` or `pro`, a project assignment such as `publicity_head`, or an explicit combination?
- Is a reason mandatory for the request and the decision?
- Does approval expire or apply only to one content item/version?
- Who may revoke an exception?
- Which audit fields and notifications are required?

Non-negotiable product rule:

- An approved exception may suppress only an organization recommendation. It must never hide or bypass a real destination-platform hard limit.

Phase 03 implementation boundary:

- Store only the content record's `is_special_case` indicator and reason.
- Do not treat the indicator as an approved length exception.
- Do not expose an exception-approval action until the separately planned workflow phase implements A-016.

### Owner answer finalized 2026-10-25

Here, **actor** means the authenticated person performing an action. Their active organization role and relevant project assignment at the time are authorization inputs and must be captured in the audit record.

- Requester roles: `junior_officer`, `publicity_director`, and `pro`.
- Request evidence: a mandatory trimmed justification of at least 50 characters.
- Decision participants: `publicity_director`, project `publicity_head`, `pro`, and an `executive` who also has an active `co_project_head` or `project_head` assignment for the project.
- Approval preset: each task selects one or more decision-participant categories and uses either `any_of` (one selected category grants) or `all_of` (every selected category grants). The preset must explicitly define its rejection-completion rule and is frozen for the submitted version.
- Self-approval: a `junior_officer` may not self-approve. A requester acting as `publicity_director` or `pro` may self-approve.
- Decision remarks: optional for approval or rejection.
- Version rule: approval and exception decisions apply only to the immutable caption version. A changed caption/new version requires approval again.
- Revocation: an eligible `executive` or `pro` may revoke with a mandatory reason.
- Audit evidence: immutable, append-only records containing content item ID, version ID, action, actor ID, role and relevant assignment at action time, timestamp, applicable reason or remarks, previous status, and new status. Actions include `submitted`, `approved`, `rejected`, `exception_granted`, and `exception_revoked`.
- Notifications to owner/submitter: approval, rejection, exception grant, exception revocation, and re-approval caused by a new version.
- Notifications to approvers: a new or modified version has been submitted and requires their decision.

Organization roles and project assignments remain separate. `pro` does not inherit from the `executive` enum, although the same person may hold both roles. `publicity_head` remains a project assignment.

### Resolution

O-007 is accepted as A-016 in `docs/DECISIONS.md`. The exception workflow remains outside the implemented Phase 03 metadata scope and requires its own planned implementation, migrations, RLS, authorization tests, audit tests, and notification tests.

## O-008 — Default caption-length recommendations

### Decision required

Define the initial organization recommendations by content kind and their effective date. Do not confuse recommendations with destination hard limits.

Questions to answer:

- What is the recommended word maximum for `post`?
- What is the recommendation for `video` captions?
- What is the recommendation for `article` captions or article promotional copy?
- Are recommendations further specialized by controlled tag or destination?
- Which timezone and effective timestamp begin the policy version?
- Who supplied or approved the values?
- How will superseded policies remain auditable for old records?
- Should warning levels distinguish approaching, exceeding recommendation, and exceeding platform maximum?

### Owner answer finalized 2026-10-25

- Measurement: organization recommendations use words. Verified platform hard limits keep their documented provider-specific unit and counting algorithm.
- Intended initial `post` setting: 120 words, entered through application settings rather than code or migration seed data.
- Intended initial `video` setting: 100 words, entered through application settings rather than code or migration seed data.
- Intended initial `article` caption setting: 200 words, entered through application settings rather than code or migration seed data; this is not a limit on the full article body.
- Tag/destination overrides: authorized users configure optional controlled-tag and destination-specific policy versions in application settings. They are not hard-coded.
- Effective time: every version stores an absolute effective timestamp and uses `Asia/Manila` (Philippine Standard Time, UTC+08:00) for policy administration and display.
- Policy authors/editors: `publicity_director` and `pro`.
- Activation decision makers: `publicity_director`, `pro`, and `executive`. This is a narrow policy-governance exception to default executive read-only behavior.
- History: active policy versions are immutable. A change creates a new version, and each submitted caption version retains the exact policy versions and evaluated values it used. Policy v1 remains inspectable after Policy v2 supersedes it.
- Warning states: `Within recommendation`, `Approaching recommendation`, `Over recommendation`, `Special-case exemption`, and separately `Over platform maximum`.

### Resolved implementation details

O-029 is accepted as A-018 in `docs/DECISIONS.md`. The shared utility and unit tests implement the accepted rules. The 40-word approaching offset and 400-word hard maximum are passed to the utility as resolved policy/configuration values, not embedded as fallback values.

## O-009 — Launch publication destinations and hard limits

### Decision required

Select the organization-managed destination channels available at launch and document any verified platform hard-limit algorithm.

The product specification mentions Facebook, Instagram, LinkedIn, website, and other approved channels only as examples. They are not automatically approved launch seeds.

For each selected channel, record:

- Stable internal slug and display label.
- Whether the channel is enabled at launch.
- Whether it accepts `post`, `video`, `article`, or a defined combination.
- Verified hard limit, if any, including counting algorithm and authoritative source.
- Source verification date and responsible owner.
- Whether the value is truly a hard platform limit or only organization guidance.
- Effective date/version and retirement behavior.
- Whether scheduling or publication is handled elsewhere.

Safe behavior while unresolved:

- Define the organization-managed channel schema without seeding guessed destinations.
- Do not hard-code channel names or limits in UI components.
- Do not claim that a recommendation is a provider hard limit.

### Owner answer finalized 2026-10-25

O-009 is accepted as A-019 in `docs/DECISIONS.md`. The v1 catalog contains the 12 owner-supplied destinations and values in `docs/PRODUCT_SPEC.md`, including standard X at 280, standard Discord at 2,000, and temporary ACM Website at 4,000 visible characters. The catalog is stored in a versioned data migration with `Asia/Manila` policy metadata and an idempotent organization initializer.

Destination character validation is separate from O-029 word counting. It counts all visible graphemes, including hashtags, mentions, URLs, whitespace, punctuation, and emoji. Every selected destination is checked independently, and later ready-for-publication transitions must reject only the specific failing destination(s). No external scheduling or publishing behavior is authorized.

## O-026 — Attachment scope and malware scanning

### Decision required

Choose whether CapItUp accepts uploaded attachments in the MVP or uses links only.

Questions to answer if uploads are included:

- Allowed file types and MIME signatures.
- Maximum file size and number of files per content item.
- Supabase Storage bucket and organization/project path ownership.
- Who may upload, download, replace, or delete files?
- Malware-scanning provider and quarantine behavior.
- Retention, deletion, recovery, and audit requirements.
- Whether public URLs are prohibited and signed URLs are required.
- How filenames and file content are sanitized and previewed.

### Owner answer finalized 2026-10-25

O-026 is accepted as A-020 in `docs/DECISIONS.md`. CapItUp uses validated deliverable links only. Each reference is a separate child record of the content item—not caption text—and may point to an image, video, article, Canva/Drive material, registration form, or other Creative/Media Committee output.

No native file upload, Supabase Storage bucket, attachment table, malware scanning, public asset URL, or upload/download behavior is in scope. Native uploads require a future accepted decision and separate security review.

## Completion checklist

- [x] O-007 approval templates and authorization details recorded in `docs/DECISIONS.md` as A-016.
- [x] O-008 values, governance, version history, warning states, and `Asia/Manila` effective-time handling recorded as A-017.
- [x] O-029 word-counting rules and warning boundaries recorded as A-018 and covered by unit tests.
- [x] O-009 launch catalog, classifications, manual-publication boundary, and versioned storage recorded as A-019.
- [x] O-026 resolved as A-020: deliverable links only; native uploads excluded.
- [ ] Phase 03 plan and acceptance tests updated to match the accepted choices.
- [ ] No placeholder decision is presented as approved product behavior.
