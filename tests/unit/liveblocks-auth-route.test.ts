import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createLiveblocks } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createLiveblocks: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createClient,
}));
vi.mock("@/features/collaboration/server", () => ({
  createLiveblocksServerClient: createLiveblocks,
}));

import { POST } from "@/app/api/liveblocks-auth/[projectId]/[contentId]/route";

const context = {
  params: Promise.resolve({
    projectId: "00000000-0000-4000-8000-000000000001",
    contentId: "00000000-0000-4000-8000-000000000002",
  }),
};

describe("Liveblocks room token route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an anonymous session before reading content or issuing a token", async () => {
    const from = vi.fn();
    const rpc = vi.fn();
    createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
      from,
      rpc,
    });

    const response = await POST(
      new Request("http://localhost/api/liveblocks-auth"),
      context,
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(createLiveblocks).not.toHaveBeenCalled();
  });
});
