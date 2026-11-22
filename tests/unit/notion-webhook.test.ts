import { signWebhookPayload } from "@notionhq/client";
import { describe, expect, it } from "vitest";
import { verifyNotionWebhook } from "@/features/notion/webhook";

const verificationToken = "synthetic-notion-verification-token";
const payload = {
  id: "event-1",
  timestamp: "2026-11-15T04:00:00.000Z",
  type: "page.properties_updated",
  workspace_id: "workspace-1",
  subscription_id: "subscription-1",
  entity: { id: "page-1", type: "page" },
};

describe("Notion webhook verification", () => {
  it("accepts a fresh webhook signed over the exact raw body", async () => {
    const rawBody = JSON.stringify(payload);
    const signature = await signWebhookPayload({
      body: rawBody,
      verificationToken,
    });

    await expect(
      verifyNotionWebhook({
        rawBody,
        signature,
        verificationToken,
        now: new Date("2026-11-15T04:02:00.000Z"),
      }),
    ).resolves.toMatchObject({ ok: true, event: { id: "event-1" } });
  });

  it("rejects invalid signatures and signed-but-stale events", async () => {
    const rawBody = JSON.stringify(payload);
    const signature = await signWebhookPayload({
      body: rawBody,
      verificationToken,
    });

    await expect(
      verifyNotionWebhook({
        rawBody,
        signature: "sha256=not-valid",
        verificationToken,
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid_signature" });

    await expect(
      verifyNotionWebhook({
        rawBody,
        signature,
        verificationToken,
        now: new Date("2026-11-15T04:06:00.001Z"),
      }),
    ).resolves.toEqual({ ok: false, reason: "stale_event" });
  });
});
