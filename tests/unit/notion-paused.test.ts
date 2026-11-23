import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/notion/webhook/route";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Notion integration pause on this branch", () => {
  it("acknowledges webhook POSTs without starting Notion sync", async () => {
    expect(existsSync("src/app/api/notion/webhook/route.ts")).toBe(true);
    const response = await POST();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const route = readFileSync("src/app/api/notion/webhook/route.ts", "utf8");
    expect(route).not.toMatch(/import\s+.*(?:notion|sync|supabase)/i);
    expect(route).not.toContain("synchronizeNotionWebhookImport");
  });

  it("lets anonymous webhook POSTs reach the inert route without Supabase", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const response = await updateSupabaseSession(
      new NextRequest("https://capitup.example/api/notion/webhook", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("ships no Notion settings route or runtime package", () => {
    expect(existsSync("src/app/settings/integrations/notion/page.tsx")).toBe(
      false,
    );
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies["@notionhq/client"]).toBeUndefined();
  });

  it("keeps Notion out of shared session and environment runtime checks", async () => {
    const [proxy, serverSchema] = await Promise.all([
      readFileSync("src/lib/supabase/proxy.ts", "utf8"),
      readFileSync("src/lib/env/server-schema.ts", "utf8"),
    ]);
    expect(proxy).toContain('"/api/notion/webhook"');
    expect(proxy).toContain('request.method === "POST"');
    expect(serverSchema).not.toContain("NOTION_");
  });
});
