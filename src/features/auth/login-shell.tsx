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
  requestSignInLink,
  type SignInFormState,
} from "@/features/auth/actions";

const initialState: SignInFormState = { status: "idle" };

const statusMessages: Record<SignInFormState["status"], string | null> = {
  idle: null,
  invalid: "Enter a valid institutional email address.",
  submitted:
    "If this identity is authorized, a secure sign-in link will arrive shortly.",
  unavailable:
    "Sign-in is temporarily unavailable. Contact your workspace administrator.",
};

export function LoginShell({ nextPath = "/" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(
    requestSignInLink,
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

          <form action={action} className="mt-8 space-y-4">
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
            <Button className="w-full" size="lg" disabled={pending}>
              <Building2 aria-hidden="true" data-icon="inline-start" />
              {pending ? "Requesting access…" : "Send secure sign-in link"}
            </Button>
          </form>

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
