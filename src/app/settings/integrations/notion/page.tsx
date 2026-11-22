import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotionIntegrationPanel } from "@/features/notion/notion-integration-panel";
import { getNotionIntegrationOverview } from "@/features/notion/data";
import { getServerEnvironment } from "@/lib/env/server";
import { requireActiveMembership } from "@/lib/auth/authorization";

export const metadata: Metadata = { title: "Notion integration" };

export default async function NotionIntegrationPage() {
  const membership = await requireActiveMembership();
  let overview: Awaited<ReturnType<typeof getNotionIntegrationOverview>>;

  try {
    overview = await getNotionIntegrationOverview();
  } catch {
    redirect("/access-denied");
  }

  const environment = getServerEnvironment();
  const serverConfigured = Boolean(
    environment.NOTION_API_TOKEN && environment.NOTION_WEBHOOK_SECRET,
  );

  return (
    <main className="app-background min-h-dvh px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="surface-panel mb-6">
          <p className="eyebrow">Organization administration</p>
          <h1 className="mt-2 text-3xl font-semibold">Notion integration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            A narrow internal-integration setup for Notion-owned project title,
            event date, and deadline imports. CapItUp captions and working
            versions are never synchronized.
          </p>
        </header>
        <NotionIntegrationPanel
          organizationId={membership.organizationId}
          overview={overview}
          serverConfigured={serverConfigured}
        />
      </div>
    </main>
  );
}
