# Future email-notification provider and sender setup

## Current scope

CapItUp's MVP uses durable in-app notifications only. This note prepares a later email-delivery setup; it does not authorize selecting a provider, buying a domain, adding DNS records, entering credentials, sending email, deploying, or changing application code.

The in-app notification record remains the source of truth. Email is a best-effort delivery channel for an already-authorized notification; it must never create a workflow decision, expose a caption to an unauthorized recipient, or be the only evidence that a user was notified.

## Decisions needed before enabling email

1. Select the email provider and organization account owner.
2. Select a sender domain and From address, such as a controlled organization subdomain.
3. Define which in-app events also send email, the allowed recipient categories, retry limits, and quiet-hour policy.
4. Define unsubscribe or notification-preference behavior for non-essential messages and any applicable organization policy.
5. Approve retention for delivery logs, bounce/suppression data, and provider event identifiers under O-023.

## Future setup checklist

1. Create the provider account under organization ownership, with at least two authorized administrators and recovery details held outside the application repository.
2. Verify the sender domain with the provider. Add only the DNS records supplied by that provider, typically SPF and DKIM records, and keep DMARC policy under the domain administrator's control.
3. Use a dedicated sender address for CapItUp notifications; do not send as a personal officer account.
4. Create a server-only provider API credential with the minimum sending capability. Store it only in the deployment platform's encrypted environment settings, never in `.env.example`, `NEXT_PUBLIC_*`, client code, Git, screenshots, or logs.
5. Add a server-only delivery adapter after explicit authorization. It must consume an already-created in-app notification, reauthorize the recipient's current access, and record only secret-free delivery state such as queued, delivered, bounced, or suppressed.
6. Verify bounce, complaint, and unsubscribe/suppression behavior with synthetic addresses. Do not test against the real member roster.
7. Add rate limits, idempotency keys, retry/backoff, and an operator-visible failure state so an email-provider outage never blocks the caption workflow.

## Required security checks

- The provider API key and webhook secret remain server-only.
- Email content contains only the minimum metadata the recipient is currently allowed to view. Prefer a short notice plus an authenticated deep link over including full caption text.
- Delivery webhooks verify signatures, deduplicate provider event IDs, and reject replayed/forged events.
- Sender-domain DNS, provider credentials, and recipient addresses are never copied into build logs or test fixtures.
- Disabling email must leave in-app notifications and workflow records fully usable.
