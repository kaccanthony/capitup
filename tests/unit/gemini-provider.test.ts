import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ GEMINI_API_KEY: "synthetic-test-key" }),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import {
  GeminiUnavailableError,
  generateStructuredGeminiOutput,
} from "@/features/ai/gemini";

describe("Gemini provider boundary", () => {
  it("keeps the API key in a server-only module", async () => {
    const source = await readFile("src/features/ai/gemini.ts", "utf8");

    expect(source).toContain('import "server-only"');
    expect(source).toContain("GEMINI_API_KEY");
    expect(source).not.toContain("NEXT_PUBLIC_");
  });

  it("validates provider JSON and converts provider failures to a safe error", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        variants: [
          {
            tone: "synthetic",
            hook: "Test",
            body: "Synthetic test body",
            cta: "Learn more",
            hashtags: [],
            assumptions: [],
            warnings: [],
          },
        ],
      }),
    });
    await expect(
      generateStructuredGeminiOutput({
        action: "naturalize",
        prompt: "synthetic",
      }),
    ).resolves.toMatchObject({ variants: [{ tone: "synthetic" }] });

    generateContent.mockRejectedValueOnce(new Error("provider timeout"));
    await expect(
      generateStructuredGeminiOutput({
        action: "naturalize",
        prompt: "synthetic",
      }),
    ).rejects.toBeInstanceOf(GeminiUnavailableError);
  });
});
