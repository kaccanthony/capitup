# AI quota fallback and browser-extension privacy note

## Status

This is a future design note, not authorization to implement Phase 06, add an OpenAI credential, contact OpenAI, build a browser extension, or detect installed extensions. `docs/PRODUCT_SPEC.md`, the active phase plan, and accepted decisions remain authoritative.

The exact extension referred to in the initial discussion has not been identified. Before any extension integration is planned, record its owner, purpose, supported browsers, requested capabilities, data access, and whether CapItUp controls its source code.

## OpenAI configuration baseline

- The repository variable is `OPENAI_API_KEY`, not `OPENAUTH_API_KEY`.
- A real key belongs only in the untracked server environment such as `.env.local` or the deployment platform's encrypted server environment.
- `.env.example` must keep `OPENAI_API_KEY=` empty.
- Never prefix an OpenAI secret with `NEXT_PUBLIC_`, import it into a Client Component, serialize it into browser data, or log it.
- Configuring the variable by itself does not enable AI. AI remains Phase 06 work and requires separate authorization.

## “Running out of tokens” can mean different things

The application must classify the failure before deciding whether a retry or fallback is safe.

| Condition                                      | Meaning                                                        | Planned response                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request/context is too large                   | One request exceeds the model's supported input/output context | Do not change keys. Reduce retrieved examples, summarize earlier material, reserve output space, and ask the user to shorten the brief if necessary. |
| Temporary request/token rate limit             | Requests or tokens are arriving too quickly                    | Respect `Retry-After` when present; otherwise use bounded exponential backoff with jitter. Limit total attempts and preserve the user's draft.       |
| Temporary provider overload or network failure | The provider cannot currently serve the request                | Retry a small bounded number of times, then offer delayed retry and manual drafting.                                                                 |
| Project or organization spend limit            | The configured hard budget has been reached                    | Do not retry or silently rotate a key. Disable AI generation temporarily, keep manual drafting available, and alert the responsible administrator.   |
| Organization usage limit or exhausted credits  | The provider account cannot accept more usage                  | Do not retry. Require an authorized billing/limit change or wait for the applicable reset.                                                           |
| Invalid, expired, or revoked key               | The credential cannot authenticate                             | Do not fall back silently. Disable the adapter, emit a secret-free operational alert, and require credential rotation by an authorized operator.     |

Official OpenAI guidance distinguishes temporary rate-limit/overload responses from billing, spend, and quota errors. Temporary limits may be retried according to `Retry-After`; billing, spend, and quota errors require operator action instead of repeated requests:

- <https://developers.openai.com/api/docs/guides/rate-limits>
- <https://developers.openai.com/api/docs/guides/error-codes>

## Recommended fallback hierarchy

1. **Manual CapItUp drafting remains available.** AI is optional and must never block drafting, review, approval, or access to existing captions.
2. **Bounded retry for temporary failures only.** Follow provider delay headers, add jitter, and avoid nested SDK plus application retry loops.
3. **Queue or defer the generation.** Preserve the confirmed brief and let the user retry deliberately when capacity returns. Do not auto-submit or auto-approve a delayed result.
4. **Optional model fallback only after O-018 approval.** A different model may have different quality, cost, context, and rate-limit behavior. Record the chosen model in provenance and tell the user when a fallback model was used.
5. **Optional secondary API credential only after explicit approval.** A secondary credential is for controlled credential rotation or a separately governed project—not a way to evade limits.

## Secondary-key proposal

Do not add a fallback key now. During Phase 06 planning, O-018 may consider a server-only variable such as:

```env
OPENAI_API_KEY=
OPENAI_FALLBACK_API_KEY=
```

If accepted, all of the following are required:

- Both values remain server-only and empty in tracked examples.
- The secondary key has an identified organization owner, OpenAI project, budget, usage limit, and rotation procedure.
- The adapter does not switch keys for context errors, invalid requests, authorization failures, policy refusals, spend-limit errors, organization usage exhaustion, or exhausted credits.
- Failover occurs only for explicitly approved availability cases and uses a circuit breaker to prevent request multiplication.
- Every failover records the non-secret reason, selected provider project/model identifier, request correlation ID, and usage provenance.
- The UI discloses a meaningful model change and never represents fallback output as approved human work.
- Tests prove that keys never reach browser bundles, logs, database rows, analytics, or error messages.

Multiple keys in the same OpenAI project or organization may share the limit that caused the failure. Blind key rotation can increase cost, duplicate generations, conceal budget exhaustion, and make incident review harder.

## Detecting a browser extension

### Recommendation

Do not scan for arbitrary installed extensions. A website normally cannot request a complete extension inventory, and probing known extension IDs, web-accessible resources, injected DOM markers, timing, or CSS side effects is a form of browser fingerprinting. It is privacy-invasive, brittle across browser versions, and unrelated extensions may create false positives.

If the question refers to a third-party extension that modifies CapItUp's HTML, CapItUp should use generic compatibility handling and clear troubleshooting guidance. It should not fingerprint the extension to identify the user or silently report its presence.

### Acceptable design for a CapItUp-owned companion extension

Detect only an intentional connection—not “everything installed”—and make the integration optional:

1. Show a clear **Connect browser extension** action explaining the capability and data exchange.
2. Start the handshake only after the user chooses to connect.
3. Configure the extension's `externally_connectable` manifest entry for the exact CapItUp origin; do not allow every website.
4. Exchange a short-lived server or page nonce. Validate the page origin, message shape, nonce, extension identity/version, and requested capability on both sides.
5. Return only minimal capability data such as `{ connected: true, version, capabilities }`. Do not return browsing history, the complete extension list, unrelated page data, or device identifiers.
6. Keep a connection indicator and an accessible **Disconnect** action. CapItUp must continue working when the extension is missing, disabled, outdated, or disconnected.
7. Do not use extension presence for authentication, organization membership, authorization, risk scoring, advertising, or analytics identity.
8. Document data access, retention, permissions, and support behavior in the privacy notice before release.

Chrome and Firefox-compatible extension platforms allow an extension to opt into communication with named websites through `externally_connectable`; this is the appropriate basis for an explicit companion-extension handshake:

- <https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable>
- <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable>

### Privacy decision

- **Silent third-party extension detection:** reject.
- **Enumerating or fingerprinting installed extensions:** reject.
- **User-initiated connection to a CapItUp-owned extension with minimal disclosure:** potentially acceptable after privacy/security review.
- **Graceful operation without the extension:** required.

## Phase 06 decisions to resolve

- What “fallback” protects against: temporary availability, rate limiting, model availability, key rotation, spend exhaustion, or some combination.
- Primary and optional fallback model, quality threshold, context strategy, and user disclosure.
- Per-user and per-organization quotas, warning thresholds, hard limits, alert recipients, and reset rules.
- Whether a separately budgeted fallback OpenAI project is justified.
- Maximum retry attempts, total retry duration, queue expiry, cancellation, and duplicate-generation protection.
- Usage/provenance retention and access under O-018 and O-023.
- The exact browser extension, its owner, purpose, permissions, supported browsers, source-code control, and exchanged data.
- Whether the extension is necessary at all; ordinary CapItUp web functionality must not depend on it.

## Future acceptance checks

- Simulate temporary `429`, provider overload, network timeout, context overflow, invalid key, spend limit, usage limit, and exhausted-credit responses without contacting the live provider.
- Prove only temporary failures retry and that retry count plus total duration are bounded.
- Prove manual drafting remains usable and confirmed user text is not lost.
- Prove concurrent requests cannot bypass CapItUp user/organization quotas.
- Prove the primary and optional fallback secrets are absent from browser bundles, responses, logs, analytics, database rows, and test artifacts.
- Prove extension connection requires a user action, a permitted origin, a fresh nonce, and a validated minimal response.
- Prove the application works normally when the extension is absent or refuses the handshake.
- Record privacy review and user-facing disclosure before collecting any extension-integration telemetry.

## Stop boundary

This note records suggestions only. Do not add `OPENAI_FALLBACK_API_KEY`, implement OpenAI calls, build or probe an extension, modify privacy behavior, or begin Phase 06 until the relevant phase and decisions are explicitly authorized.
