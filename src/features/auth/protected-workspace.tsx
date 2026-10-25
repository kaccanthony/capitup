import {
  DashboardShell,
  type WorkspaceView,
} from "@/features/dashboard/dashboard-shell";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireActiveMembership } from "@/lib/auth/authorization";

export async function ProtectedWorkspace({
  view = "overview",
}: {
  view?: WorkspaceView;
}) {
  await requireActiveMembership();

  return <DashboardShell view={view} sessionControls={<LogoutButton />} />;
}
