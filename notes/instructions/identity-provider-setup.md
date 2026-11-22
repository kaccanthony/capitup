# CapItUp identity-provider setup: Google, Microsoft, and email/password fallback

## Purpose and boundary

This is a manual setup guide for a future **isolated hosted Supabase development project**. It records A-021 only. It does not authorize connecting a project, applying migrations, entering credentials, enabling providers, deploying, or changing any production setting.

CapItUp prioritizes Google OAuth and Microsoft Azure OAuth. The lower part of the login card will contain a collapsed **Use email instead** option for institutional email/password sign-in. It is not a magic-link, email-OTP, or open-registration flow.

Every successful sign-in still requires the user's verified approved identity to match a current allowlist invitation and active membership. A matching username, an address at an allowed domain, or possession of a password is not membership by itself.

## Before any configuration

1. Obtain explicit authorization for the named hosted development project. Confirm that it is not production.
2. Resolve O-002: the exact institutional email domain(s), normalization rules, provider identity claims, and exception process.
3. Resolve O-025: CAPTCHA, rate limits, cooldowns, abuse signals, and administrator unblock procedure.
4. Apply and verify the Phase 02 migration and Before User Created hook only after separate authorization. Do not use a provider setup as a substitute for those allowlist/RLS checks.
5. In Supabase Auth URL configuration, set the development Site URL and allow the exact application callback URL: `<development-origin>/auth/callback`.

## Google OAuth (primary)

1. In Google Cloud, create or select the OAuth client for the approved development project.
2. Add the exact Supabase Auth callback URL shown in the Supabase Google provider page to Google's authorized redirect URIs. Do not guess or substitute the application callback for this provider callback.
3. Restrict consent and supported accounts to the institution's policy where available. This provider restriction is not a replacement for CapItUp's allowlist.
4. Copy the Google OAuth client ID and client secret into the **Supabase Dashboard -> Authentication -> Providers -> Google** fields. Never place the client secret in `.env.local`, `NEXT_PUBLIC_*`, source code, notes, screenshots, or logs.
5. Enable Google only after the deployment's callback allowlist and the Phase 02 hook/allowlist configuration are authorized and ready for a synthetic test.

## Microsoft Azure OAuth (primary)

1. In Microsoft Entra ID, register a web application owned by the appropriate institutional administrator.
2. Choose the supported account type according to the institution's decision. Prefer a tenant-restricted configuration when the institution provides a single tenant.
3. Add the exact Supabase Auth callback URL shown in Supabase's Azure provider setup as the Entra redirect URI.
4. Create a client secret, record its expiry with the owning administrator, and put the **secret value** (not its identifier) and client ID only in **Supabase Dashboard -> Authentication -> Providers -> Azure**.
5. Configure the approved Azure tenant URL in Supabase. Request the `email` and `xms_edov` claims according to Supabase's guidance so verified-email handling is explicit.
6. Do not use provider access or refresh tokens for CapItUp features. They are not membership evidence and should not be stored in CapItUp tables or logs.

## Email/password fallback (deliberately disclosed)

1. In Supabase Auth provider settings, enable email/password authentication only after O-002 and O-025 are resolved.
2. Keep email confirmation enabled when the hosted project requires it. Password reset and confirmation emails require an appropriate SMTP configuration for reliable production use; do not use the development service as production evidence.
3. Disable public self-registration in the application flow. Before account creation, the trusted hook must reject identities without an active, unexpired exact allowlist entry.
4. Do not enable email magic links or email OTP as the fallback. The login UI should hide the email/password fields behind the lower-page **Use email instead** disclosure, while keeping Google and Microsoft visible first.
5. Use generic errors for all failure cases. Do not reveal whether an email is allowed, invited, suspended, expired, or associated with an existing account.
6. Apply rate limits, CAPTCHA, progressive cooldowns, password-strength controls, and password-reset protections according to O-025. Never implement a username-only or email-only lockout.

## Application environment variables

Only the public Supabase project URL and publishable/anonymous key belong in the local application environment, for example in ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-development-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anonymous-key
```

Do not put Google, Microsoft, SMTP, Supabase service-role, CAPTCHA-secret, or provider client-secret values in `.env.example`, `NEXT_PUBLIC_*`, client components, tracked files, build logs, or screenshots. Provider secrets belong in the respective provider console and Supabase's server-side Auth provider settings.

## Synthetic verification checklist after authorization

- Google allowlisted identity: can sign in, complete the callback, claim once, and access only its active organization.
- Microsoft allowlisted identity: same result; verify tenant and verified-email behavior.
- Email/password allowlisted identity: only available after the explicit disclosure; applies confirmation and O-025 controls.
- Uninvited, wrong-domain, suspended, expired, and cross-organization identities: receive a generic denial and no private data.
- Browser bundle, browser requests, logs, and tracked files: contain no provider client secret, service-role key, SMTP credential, or provider token.

## References

- Supabase, [Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- Supabase, [Sign in with Azure (Microsoft)](https://supabase.com/docs/guides/auth/social-sign-in/auth-azure)
- Supabase, [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
