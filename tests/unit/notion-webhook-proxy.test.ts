import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfiguration: () => null,
}));

import {
  isProtectedApplicationPath,
  updateSupabaseSession,
} from "@/lib/supabase/proxy";

describe("Notion webhook proxy boundary", () => {
  it("lets anonymous provider requests reach only the exact webhook path", async () => {
    const correct = new NextRequest("https://example.test/api/notion/webhook", {
      method: "POST",
    });
    const typo = new NextRequest("https://example.test/api/notion/wehbook", {
      method: "POST",
    });

    expect(isProtectedApplicationPath(correct.nextUrl.pathname)).toBe(false);
    expect((await updateSupabaseSession(correct)).status).toBe(200);
    expect(isProtectedApplicationPath(typo.nextUrl.pathname)).toBe(true);
    expect((await updateSupabaseSession(typo)).status).toBe(307);
  });
});
