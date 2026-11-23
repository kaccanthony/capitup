import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserCog, UserMinus, UserPlus, CalendarX, ShieldCheck, History } from "lucide-react";
import { getGovernanceOverviewAction } from "@/features/governance/actions";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GovernancePanel } from "@/features/governance/governance-panel";

export const metadata: Metadata = { title: "Governance" };

export default async function GovernancePage() {
  const client = await createServerSupabaseClient();
  if (!client) {
    redirect("/login");
  }
  const membership = await getAuthorizationForClient(client);
  if (membership.kind !== "active") {
    redirect(membership.kind === "unauthenticated" ? "/login" : "/access-denied");
  }

  let overview: Awaited<ReturnType<typeof getGovernanceOverviewAction>>;
  try {
    overview = await getGovernanceOverviewAction(new FormData());
  } catch {
    redirect("/access-denied");
  }

  if ("error" in overview) {
    redirect("/access-denied");
  }

  return (
    <main className="app-background min-h-dvh px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="surface-panel mb-6">
          <p className="eyebrow">Organization administration</p>
          <h1 className="mt-2 text-3xl font-semibold">Governance</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            President designation and Junior Officer availability are server-authorized
            actions that create immutable audit events. Only the website owner may grant
            President; the owner or a Publicity Director may revoke. A Publicity Director
            or Pro may mark a Junior Officer temporarily unavailable.
          </p>
        </header>
        <GovernancePanel
          organizationId={membership.organizationId}
          overview={overview}
        />
      </div>
    </main>
  );
}