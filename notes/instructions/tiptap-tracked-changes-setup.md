# Tiptap Tracked Changes alternative

## Current scope

CapItUp will not use Tiptap's `@tiptap-pro/extension-tracked-changes`. It is a paid add-on currently marked alpha by Tiptap, but the accepted Phase 5 implementation is a first-party narrower suggestion-record model instead. This retained note explains the rejected option; it does not authorize buying a subscription, creating an account, entering a token, installing a package, deploying a collaboration service, or enabling the feature.

Liveblocks Free remains the managed realtime provider for rooms, presence, cursors, and basic comments. The CapItUp suggestion records remain application-owned and mirrored to Supabase.

## Rejected paid-extension path

1. Obtain the organization-owned Tiptap subscription or trial that grants access to Tracked Changes, and record the accountable owner outside this repository.
2. Confirm the extension's current license terms, supported Tiptap versions, collaboration-provider compatibility, and alpha-production risk before approval. Do not assume a subscription includes every Pro extension.
3. Create a dedicated Tiptap account for CI/package access where the vendor permits it; avoid a departing officer's personal token.
4. In the Tiptap dashboard, copy the private-registry personal access token from **My features > Pro Extensions**.
5. Keep the token in a secret manager or the deployment platform's encrypted settings as `TIPTAP_PRO_TOKEN`. It is a package-install credential, not a browser value and not a `NEXT_PUBLIC_*` variable.
6. Add a project-local `.npmrc` only during the authorized installation, with the token referenced rather than written literally:

   ```ini
   @tiptap-pro:registry=https://registry.tiptap.dev/
   //registry.tiptap.dev/:_authToken=${TIPTAP_PRO_TOKEN}
   ```

7. Ensure `.npmrc` is ignored before any token is available. Never put the token in `package.json`, `package-lock.json`, `.env.example`, source code, screenshots, test fixtures, build logs, or chat.
8. With the environment variable available only in the authorized install/CI process, install the exact tracked-changes package version approved for the selected Tiptap version:

   ```powershell
   npm.cmd install --save @tiptap-pro/extension-tracked-changes
   ```

9. Pin compatible `@tiptap/*` versions together, review the resulting lockfile, and run the repository's format, lint, typecheck, unit, integration, and browser checks. Do not use an unlicensed substitute while presenting the feature as full tracked changes.

## Required CapItUp safeguards

- The browser receives only the minimum, server-authorized room access needed for the current member. It never receives the Tiptap private-registry token or a trusted Liveblocks secret.
- Every suggestion must retain trusted actor attribution and an immutable accept/reject audit record.
- Suggestion acceptance/rejection requires server-side membership, project capability, current version, and review-lock checks. Client-side editor state is not authorization.
- The Supabase mirror is the durable canonical record for CapItUp audit/recovery. Liveblocks supplies live transport and interaction state according to the Phase 5 decision.
- Because the extension is alpha, test concurrent edits, reconnects, stale suggestions, review locks, snapshot handoff, and rollback before treating it as production-ready.

## Hosted fallback

If managed Liveblocks becomes unavailable or its Free-plan limits are unsuitable for development, use a Render Web Service running persistent Hocuspocus as the non-local fallback. Do not use Render's Free instance as a production collaboration service: it can idle, restart, and has ephemeral local storage. This fallback does not remove the separate Tiptap Tracked Changes license requirement.

## Official references

- Tiptap, [Tracked Changes extension](https://tiptap.dev/docs/editor/extensions/functionality/tracked-changes)
- Tiptap, [Pro extension registry setup](https://tiptap.dev/docs/guides/pro-extensions)
- Liveblocks, [Free plan limits](https://liveblocks.io/docs/pricing/plans/free)
- Render, [Free web-service limitations](https://render.com/docs/free)
