import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/capitup/brand-mark";

export const metadata = {
  title: "Access unavailable",
};

export default function AccessDeniedPage() {
  return (
    <main className="login-page" aria-labelledby="access-denied-title">
      <div className="login-glow login-glow-left" aria-hidden="true" />
      <div className="login-glow login-glow-right" aria-hidden="true" />
      <section className="login-card" aria-label="CapItUp access unavailable">
        <BrandMark />
        <div className="mt-10 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--lavender-soft)]">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          Private workspace
        </div>
        <h1
          id="access-denied-title"
          className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
        >
          Access unavailable.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          We could not complete access to this workspace. Contact an
          organization administrator if you believe you should have access.
        </p>
        <div className="login-notice">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          <p>
            This message does not confirm whether an invitation or account
            exists.
          </p>
        </div>
        <Link className="login-return-link mt-6" href="/login">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
