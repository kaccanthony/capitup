import { describe, expect, it, vi } from "vitest";

const { verifyEvent, acceptEvent } = vi.hoisted(() => ({
  verifyEvent: vi.fn(),
  acceptEvent: vi.fn(),
}));

vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ NOTION_WEBHOOK_SECRET: "test-secret" }),
}));
vi.mock("@/features/notion/data", () => ({
  acceptVerifiedNotionWebhook: acceptEvent,
  sha256: vi.fn(),
}));
vi.mock("@/features/notion/sync", () => ({
  synchronizeNotionWebhookImport: vi.fn(),
}));
vi.mock("@/features/notion/webhook", () => ({
  verifyNotionWebhook: verifyEvent,
}));

import { POST } from "@/app/api/notion/webhook/route";

describe("Notion subscription verification route", () => {
  it("acknowledges the matching initial token without event processing", async () => {
    const response = await POST(
      new Request("http://localhost/api/notion/webhook", {
        method: "POST",
        body: JSON.stringify({ verification_token: "test-secret" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(verifyEvent).not.toHaveBeenCalled();
    expect(acceptEvent).not.toHaveBeenCalled();
  });

  it("rejects an incorrect initial token", async () => {
    const response = await POST(
      new Request("http://localhost/api/notion/webhook", {
        method: "POST",
        body: JSON.stringify({ verification_token: "wrong" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(verifyEvent).not.toHaveBeenCalled();
    expect(acceptEvent).not.toHaveBeenCalled();
  });
});
