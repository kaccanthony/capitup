import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Notion webhook route boundary", () => {
  it("verifies the exact raw body before durable processing", async () => {
    const source = await readFile(
      "src/app/api/notion/webhook/route.ts",
      "utf8",
    );

    expect(source).toContain("request.text()");
    expect(source).toContain("x-notion-signature");
    expect(source).toContain("verifyNotionWebhook");
    expect(source).toContain("acceptVerifiedNotionWebhook");
    expect(source).not.toContain("NOTION_API_TOKEN");
  });
});
