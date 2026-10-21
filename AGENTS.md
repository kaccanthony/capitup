# CapItUp Repository Instructions

## Project identity

- Product name: **CapItUp**.
- Repository, package, database-project, and deployment slug: `capitup`.
- `CaptionFlow` is an obsolete working name. Do not introduce it in new code or copy; update it when modifying affected files.
- CapItUp is a private, organization-only workspace for drafting, reviewing, approving, and storing publicity captions.

## Source of truth

Use the following precedence when instructions conflict:

1. The user's current request.
2. The active phase file in `harness/build/`, when one is specified.
3. `docs/PRODUCT_SPEC.md` for product behavior and requirements.
4. Accepted decisions in `docs/DECISIONS.md`.
5. `docs/ARCHITECTURE.md` and `docs/SECURITY.md` for their respective concerns.
6. Existing code and tests.

Read the files relevant to the requested task before editing. Do not load every project document for a trivial change. If a required document does not exist yet, say so and create it only when the request or current phase calls for it.

## Working method

- Work on one bounded phase or task at a time. Do not begin later roadmap phases unless asked.
- Inspect the existing repository and package scripts before proposing or making changes.
- Preserve unrelated changes in a dirty worktree.
- Prefer the smallest complete change that satisfies the acceptance criteria.
- State assumptions when requirements are ambiguous. Ask before making a choice that materially affects security, permissions, data loss, cost, or product behavior.
- Never deploy, publish, push, merge, rotate credentials, modify a production service, or perform other external writes without explicit authorization for that action.
- Do not claim a command, test, migration, or integration succeeded unless it was actually run and observed.
- Use the package manager selected by the repository lockfile. Do not mix package managers.

## Approved architecture

Unless an accepted decision changes it, use:

- Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.
- Supabase for Postgres, authentication, Row Level Security, storage, workflow records, immutable caption versions, audit events, and vector search.
- TipTap with Yjs and Liveblocks for the collaborative editor, presence, cursors, anchored comments, and suggestions.
- OpenAI Responses API for caption assistance.
- A Notion internal integration for the first organization-level synchronization.
- Vercel for the Next.js application. Realtime collaboration may use the managed Liveblocks service; self-hosted collaboration belongs on a persistent service such as Fly.io or Render, not a Vercel serverless function.

Do not add Express or another standalone API server unless a requirement cannot reasonably be handled by Next.js route handlers/server actions or an accepted architecture decision calls for it.

Keep these concepts separate:

- The live collaborative document is mutable working state.
- A submitted caption version is an immutable snapshot.
- Comments and suggestions refer to stable document anchors and, where applicable, a specific version.
- Approval decisions always refer to an exact immutable caption version.

## Authorization and security invariants

- Never rely on hidden buttons or client-side checks for authorization.
- Enforce access in Supabase RLS and in trusted server-side operations.
- Enable RLS on every table exposed through the Supabase API.
- Keep organization roles, project assignments, and workflow approval steps as separate concepts.
- Organization roles are `junior_officer`, `publicity_director`, `pro`, `executive`, and `org_admin`.
- Project assignments include `publicity_head`, `co_project_head`, `project_head`, `writer`, and `viewer`.
- Executives are read-only unless they also receive an authorized project assignment.
- A director override must be explicit, require a reason, and create an audit event.
- Editing content after approval invalidates affected approvals and requires review of the new version.
- Collaborative rooms require a server-authorized membership check; possession of a room ID is not permission.
- Keep service-role keys, OpenAI keys, Notion secrets, and webhook secrets on the server only.
- Never expose a Supabase service-role key or trusted integration token to browser code.
- Verify webhook signatures, make handlers idempotent, and protect against replay.
- Use generic authentication errors. Apply rate limiting and abuse protection to authentication and AI endpoints.
- Membership must come from the approved organization roster or invitation flow. A matching username alone is not sufficient proof of access.
- Do not implement a custom five-attempt lockout by username alone. Prefer provider protections, CAPTCHA/rate limits, and an audited account-based cooldown that cannot be used to lock out another person.

## Domain rules

### Content structure

Each content item supports:

- title;
- content kind: `post`, `video`, or `article`;
- one or more approved tags valid for that kind;
- caption body;
- deliverable URL;
- destination platforms;
- assigned writers and reviewers;
- workflow status and approval requirements;
- normal or special-case length policy.

Do not allow arbitrary tags. Use only the controlled taxonomy:

- Article: `GENERAL`, `ANNOUNCEMENT`, `EVENT`, `STORY`.
- Video: `VIDEO`, `AVP`, `REEL`.
- Post: `GENERAL`, `BIRTHDAY`, `ANNOUNCEMENT`, `EVENT`, `BRANDING`, `STORY`, `HN`, `HOLIDAY`.

Tag emoji and presentation labels belong in shared metadata, not duplicated conditional UI code.

### Review language and workflow

- Use constructive actions such as **Looks good** and **Needs refinement**; do not label feedback as a downvote.
- Writers can draft, comment, suggest changes, and give non-binding peer feedback.
- Publicity directors can perform writer actions and intermediate approval/review actions.
- The P.R.O. normally gives final approval.
- Special workflows may require the publicity head, co-project head, project head, publicity director, and/or P.R.O. in a configured order.
- AI output is always a draft. AI must never approve, publish, silently replace a caption, or impersonate a reviewer.

### Caption length

- Store length rules and platform limits in the database with effective dates or versions; do not hard-code policy values in components.
- Count user-perceived characters using Unicode grapheme clusters, preferably `Intl.Segmenter` with a tested fallback.
- Treat a normal emoji sequence as one visible character where grapheme segmentation does so.
- A special case may exempt the organization recommendation, but it must not hide a real platform hard limit.
- Show the count, recommendation, warning state, and exemption reason clearly.

### Unicode style converter

Support these transformations as explicit utilities with tests:

- bold serif;
- bold sans-serif;
- bold italic serif;
- bold italic sans-serif;
- bold Fraktur;
- double-struck.

Preserve plain text as the canonical/searchable representation. Do not transform URLs, hashtags, or mentions by default. Warn that mathematical Unicode characters may have accessibility, search, copy/paste, and platform compatibility limitations.

## AI and writing-style rules

- Use retrieval from approved caption examples and explicit style profiles; do not describe this as the model permanently learning from users.
- Keep organization-wide style guidance separate from personal preferences.
- Record which examples, style profile version, model, and prompt template produced a generation when practical.
- Do not send private captions to an AI provider until the server has authorized the requester and the project.
- Make generated text editable and visibly distinguish it from approved human-authored content.

## Notion integration rules

- Prefer an internal integration for a single controlled organization workspace.
- The relevant Notion pages or databases must be explicitly shared with that integration by an authorized workspace member.
- Do not assume a user's Notion login proves CapItUp membership.
- Treat Notion IDs as integration references, not primary authorization identifiers.
- Define a system of record for every synchronized field and prevent update loops.
- Use OAuth only if multiple independently administered workspaces must connect themselves.

## Code standards

- Keep TypeScript strict. Avoid `any`; if unavoidable, narrow it immediately and document why.
- Validate untrusted input at every server boundary, using the repository's schema validation library (prefer Zod if none is established).
- Prefer Server Components. Add `"use client"` only where browser state, effects, or interactive APIs require it.
- Keep authorization and workflow policy in shared server/domain modules, not repeated inside UI components.
- Use database migrations for schema, indexes, constraints, triggers, and RLS policies.
- Use transactions or database functions for state transitions that must be atomic.
- Prefer accessible semantic HTML, keyboard operation, visible focus states, sufficient contrast, and reduced-motion support.
- Avoid copying the referenced Dribbble designs exactly. Use them as visual direction while creating an original CapItUp interface.
- Add comments for non-obvious policy or algorithm decisions, not for code that is already self-explanatory.

## Testing and verification

Before finishing a change:

- Inspect available scripts rather than inventing command names.
- Run the narrowest relevant tests first, then the broader checks appropriate to the change.
- For application changes, normally verify formatting/linting, TypeScript, relevant unit/integration tests, and a production build when those scripts exist.
- Add positive and negative authorization tests for protected behavior.
- Test RLS policies with at least an allowed user, a disallowed user, and cross-organization access.
- Test workflow transitions, stale approval/version rejection, director overrides, and audit creation.
- Test grapheme counting with combined emoji, skin tones, flags, family emoji, combining marks, and ordinary text.
- Test Unicode conversion without corrupting URLs, hashtags, mentions, unsupported characters, or the canonical plain-text value.
- Use browser/end-to-end tests for the highest-risk collaboration and approval flows when the phase includes them.

If a check cannot run, report the exact reason and what remains unverified. Never silently weaken or delete a failing test merely to make the suite pass.

## Documentation and progress records

- `docs/PRODUCT_SPEC.md`: product requirements and user-visible behavior.
- `PLANS.md`: roadmap, milestones, and phase ordering.
- `harness/build/<phase>.md`: scope, acceptance criteria, and verification plan for a bounded phase.
- `harness/context/`: durable implementation discoveries and decisions that future work needs.
- `harness/build-log.md`: concise observed progress and commands actually run.
- `docs/DECISIONS.md`: accepted product and architecture decisions with rationale.
- `docs/ARCHITECTURE.md`: system boundaries and data flow.
- `docs/SECURITY.md`: threat model, authorization design, secrets, abuse controls, and security operations.

Update documentation when behavior or an accepted decision changes. Do not rewrite the product specification to match an accidental implementation shortcut.

## Definition of done

A task is complete only when:

- its requested behavior and acceptance criteria are satisfied;
- authorization is enforced at the correct trusted boundary;
- relevant tests are added or updated and the executed checks are reported truthfully;
- migrations and documentation are included when needed;
- no secrets, credentials, generated build output, or unrelated edits are introduced;
- remaining risks, assumptions, and follow-up work are clearly listed.

When reviewing code, prioritize authorization bypasses, RLS gaps, collaboration-room access, service-key exposure, approval/version mismatches, unsafe external synchronization, webhook replay, AI data leakage, and incorrect Unicode counting before cosmetic issues.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
