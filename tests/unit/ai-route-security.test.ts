import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("AI generation route", () => {
  it("authorizes content access and cannot invoke Gemini for private captions", async () => {
    const source = await readFile("src/app/api/ai/generate/route.ts", "utf8");

    expect(source).toContain("aiGenerationRequestSchema.safeParse");
    expect(source).toContain("getAccessibleContentItem");
    expect(source).toContain("!item || !item.canEdit");
    expect(source).toContain("status: 503");
    expect(source).not.toContain("createGeminiClient");
    expect(source).not.toContain("GEMINI_API_KEY");
  });
});
