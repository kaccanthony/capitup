import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("collaboration route security", () => {
  it("authorizes Liveblocks through a trusted Supabase RPC", async () => {
    const source = await readFile(
      "src/app/api/liveblocks-auth/[projectId]/[contentId]/route.ts",
      "utf8",
    );

    expect(source).toContain("authorize_collaboration_session");
    expect(source).toContain("createLiveblocksServerClient");
    expect(source).toContain("comments:none");
    expect(source).toContain('"Cache-Control": "no-store"');
    expect(source).not.toContain("LIVEBLOCKS_SECRET_KEY");
  });

  it("authenticates normally, requires write capability, and finalizes only through the server-only client", async () => {
    const [source, serviceRoleSource, browserSource] = await Promise.all([
      readFile(
        "src/app/api/collaboration-snapshot/[projectId]/[contentId]/route.ts",
        "utf8",
      ),
      readFile("src/lib/supabase/service-role.ts", "utf8"),
      readFile("src/lib/supabase/browser.ts", "utf8"),
    ]);

    expect(source).toContain("get_collaboration_capabilities");
    expect(source).toContain("getAuthorizationForClient");
    expect(source).toContain('access_mode !== "write"');
    expect(source).toContain("createVersionHistorySnapshot");
    expect(source).toContain("getYjsVersion");
    expect(source).toContain("createServiceRoleSupabaseClient");
    expect(source).toContain("finalize_collaboration_snapshot");
    expect(source).not.toContain("submit_collaboration_snapshot");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serviceRoleSource).toContain('import "server-only"');
    expect(serviceRoleSource).not.toContain("console.");
    expect(browserSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("disables offline collaboration and continuously revalidates access", async () => {
    const source = await readFile(
      "src/features/collaboration/collaboration-workspace.tsx",
      "utf8",
    );

    expect(source).toContain("offlineSupport_experimental: false");
    expect(source).toContain("60_000");
    expect(source).toContain('window.addEventListener("online"');
    expect(source).toContain("room.disconnect()");
    expect(source).toContain("window.location.reload()");
  });
});
