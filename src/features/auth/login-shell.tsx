"use client";

import { useActionState } from "react";
import {
  Building2,
  Check,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/capitup/brand-mark";
import { Button } from "@/components/ui/button";
import {
  signInWithPassword,
  startOAuthSignIn,
  type SignInFormState,
} from "@/features/auth/actions";

const initialState: SignInFormState = { status: "idle" };

const statusMessages: Record<SignInFormState["status"], string | null> = {
  idle: null,
  invalid: "Sign-in failed. Check your email and password.",
  denied:
    "This account is not on the active organization allowlist. Contact an administrator.",
  unavailable:
    "Sign-in is temporarily unavailable. Contact your workspace administrator.",
};

export function LoginShell({ nextPath = "/" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const statusMessage = statusMessages[state.status];

  return (
    <main className="login-page" aria-labelledby="login-title">
      <div className="login-glow login-glow-left" aria-hidden="true" />
      <div className="login-glow login-glow-right" aria-hidden="true" />
      <div className="login-orbit" aria-hidden="true" />

      <section className="login-card" aria-label="CapItUp access">
        <div className="login-card-highlight" aria-hidden="true" />
        <div className="relative z-10">
          <BrandMark />

          <div className="mt-10 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--lavender-soft)]">
            <LockKeyhole aria-hidden="true" className="size-3.5" />
            Private workspace
          </div>
          <h1
            id="login-title"
            className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
          >
            Welcome back.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Continue with your organization-managed account to enter the CapItUp
            publicity workspace.
          </p>

          <div className="mt-8 space-y-3">
            <form action={startOAuthSignIn}>
              <input type="hidden" name="next" value={nextPath} />
              <Button className="w-full" size="lg" type="submit">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.22c0-.68-.06-1.36-.18-2.02H12v3.83h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.13c1.84-1.7 2.92-4.2 2.92-7.19Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.13-2.44c-.87.58-1.98.93-3.32.93a5.98 5.98 0 0 1-5.62-4.15H3.15v2.52A9.5 9.5 0 0 0 12 21.5Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.38 13.48a5.7 5.7 0 0 1 0-3.63V7.33H3.15a9.5 9.5 0 0 0 0 8.67l3.23-2.52Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.7c1.43 0 2.72.5 3.73 1.47l2.8-2.8A9.05 9.05 0 0 0 12 2.5a9.5 9.5 0 0 0-8.85 5.83l3.23 2.52A5.98 5.98 0 0 1 12 5.7Z"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium">
              Use email instead
            </summary>
            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="next" value={nextPath} />
              <div>
                <label
                  htmlFor="institutional-email"
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  Institutional email
                </label>
                <input
                  id="institutional-email"
                  className="login-input mt-2"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  aria-describedby="login-access-note login-form-status"
                />
              </div>
              <div>
                <label
                  htmlFor="institutional-password"
                  className="text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="institutional-password"
                  className="login-input mt-2"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button className="w-full" size="lg" disabled={pending}>
                <Building2 aria-hidden="true" data-icon="inline-start" />
                {pending ? "Signing in…" : "Sign in with email"}
              </Button>
            </form>
          </details>

          <p
            id="login-form-status"
            className="mt-4 min-h-5 text-sm leading-5 text-[var(--text-secondary)]"
            role="status"
          >
            {statusMessage}
          </p>

          <div className="mt-8 border-t border-white/8 pt-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--lavender)]/10 text-[var(--lavender-soft)]">
                <ShieldCheck aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Authorized members only
                </p>
                <p
                  id="login-access-note"
                  className="mt-1 text-xs leading-5 text-[var(--text-muted)]"
                >
                  Membership will be verified against the approved organization
                  roster. A matching username alone is not enough.
                </p>
              </div>
            </div>
          </div>

          <div className="login-notice">
            <Sparkles aria-hidden="true" className="size-4 shrink-0" />
            <p>
              Access requires an active invitation and organization membership.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
            <Check
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]"
            />
            <p>
              Access errors will remain generic and will not reveal whether an
              account is on the membership list.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
