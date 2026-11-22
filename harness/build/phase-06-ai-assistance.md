# Phase 6 — AI assistance

## Objective

Implement server-authorized, retrieval-assisted caption drafting with explicit style profiles, curated examples, structured outputs, provenance, quotas, feedback, and evaluation—while preserving human editorial responsibility.

## Dependencies

- Phases 2–5 complete and the core caption/approval workflow judged reliable.
- O-016, O-017, O-018, and affected O-023 retention choices resolved.
- Separately authorized organization-owned Gemini development project/credentials; no browser access to the key. Gemini Free is synthetic-development-only.

## In-scope work

- Organization, campaign, and personal style profiles with explicit rules, versions, ownership, consent, and authorized curation.
- Curated approved/published sample selection; drafts/rejected captions excluded by default.
- Authorized, metadata-filtered embeddings and `pgvector` retrieval limited to visible organization/project/campaign/author scope.
- Server-only Gemini API adapter for the specified initial actions and three-direction generation.
- Versioned prompt templates and validated structured output containing variants, tone, hook, body, CTA, hashtags, assumptions, and warnings.
- User confirmation of brief, visible disclosure of influencing style profile/examples, editable draft/suggestion insertion, and no automatic submission.
- Per-user/per-organization quotas, rate limiting, usage/provenance logging, feedback/final disposition, cached embeddings, and evaluation fixtures.
- Graceful service errors that leave core drafting available.

## Explicit non-goals

- No fine-tuning, automatic learning from all history, image generation, approval, publication, reviewer impersonation, or silent replacement.
- No retrieval from inaccessible projects or unapproved/rejected/draft samples by default.
- No API key or trusted prompt/retrieval implementation in browser code.
- No Notion integration or unrelated model/provider expansion.

## Expected files and components

- Migrations/RLS for style profiles/rules/samples, embeddings, generation runs, feedback, quotas/usage, and audit links.
- Server-only Gemini, embedding, retrieval, prompt, schema-validation, quota, and provenance modules.
- AI assistant UI for brief confirmation, action/profile selection, streamed/complete variants, influence disclosure, insertion as draft/suggestion, feedback, and errors.
- Background embedding path using the accepted Supabase job/Edge Function approach if needed.
- Mocked unit/integration tests and versioned evaluation fixtures/reports.

## Security considerations

- Re-authorize member/project and filter retrieval before any private content leaves the application boundary.
- Apply RLS to style/sample/vector/generation data and prevent vector-search side channels across organizations/projects.
- Keep keys server-only; redact secrets and unnecessary private prompt content from logs/errors.
- Treat model output as untrusted text/JSON and validate/sanitize it before display or storage.
- Enforce quotas/rate limits atomically to prevent bypass under concurrency.
- Respect personal-sample consent/revocation and approved retention/deletion policy.
- Record provenance sufficient for audit without claiming that the model permanently learned user style.

## Acceptance criteria

- Only authorized users can invoke allowed actions for an accessible project and within quota.
- Retrieval uses only curated samples the requester may access; cross-organization and inaccessible-project samples are excluded before ranking.
- Structured output validates; malformed responses fail safely without overwriting a draft.
- Users see assumptions/warnings, selected style profile, and influencing example references.
- AI content is visibly identified and enters as editable draft/suggestion only; it cannot submit, approve, publish, or impersonate.
- Model, prompt/profile versions, sample IDs, output, editor, usage, and disposition are recorded according to O-018/O-023.
- Evaluation fixtures score factual consistency, style, CTA, limits, avoided phrases, and human acceptance/edit distance against accepted thresholds.
- Gemini outage/quota exhaustion leaves manual drafting and approval usable.

## Tests and verification commands

Use mocks by default and separately authorize any paid/provider evaluation:

```powershell
{supabase-cli} db reset
{pm} run test -- ai prompts schemas quotas retrieval
{pm} run test:integration -- ai-authorization vector-isolation provenance
{pm} run test:eval -- ai-fixtures
{pm} run test:e2e -- ai-draft-assistance
{pm} run lint
{pm} run typecheck
{pm} run build
git diff --check
```

Test unauthorized retrieval, revoked personal consent, malformed JSON, prompt injection in samples/briefs, concurrent quota use, provider timeout, and insertion without automatic submission.

## Evidence that must be recorded

- Accepted curatorship, personal-sample, model/quota/retention, and evaluation-threshold decisions.
- Retrieval candidate/filter evidence for allowed and denied scopes without exposing private text unnecessarily.
- Prompt/profile/model versions and structured-schema validation results.
- Quota/rate-limit and provider-failure observations.
- Evaluation report with fixture version and human-review notes.
- Exact commands/results, costs if a live approved evaluation ran, files changed, and remaining provider-specific checks.

## Stop condition

Stop when authorization, structured generation, provenance, quotas, human control, and evaluation meet accepted criteria. Do not start Notion integration, deployment, pilot, commit, or push.

