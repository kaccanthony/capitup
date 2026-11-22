import "server-only";

import { GoogleGenAI } from "@google/genai";
import {
  parseAiGenerationOutput,
  type AiAction,
  type AiGenerationOutput,
} from "@/features/ai/contracts";
import { aiPolicy } from "@/features/ai/policy";
import { getServerEnvironment } from "@/lib/env/server";

export class GeminiUnavailableError extends Error {
  constructor() {
    super("AI assistance is unavailable.");
    this.name = "GeminiUnavailableError";
  }
}

export function createGeminiClient() {
  const apiKey = getServerEnvironment().GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiUnavailableError();
  }

  return new GoogleGenAI({ apiKey });
}

export async function generateStructuredGeminiOutput(input: {
  action: AiAction;
  prompt: string;
}): Promise<AiGenerationOutput> {
  let response: Awaited<
    ReturnType<
      ReturnType<typeof createGeminiClient>["models"]["generateContent"]
    >
  >;
  try {
    response = await createGeminiClient().models.generateContent({
      model: aiPolicy.model,
      contents: input.prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
  } catch {
    throw new GeminiUnavailableError();
  }

  if (!response.text) {
    throw new GeminiUnavailableError();
  }

  let output: unknown;
  try {
    output = JSON.parse(response.text);
  } catch {
    throw new GeminiUnavailableError();
  }

  try {
    return parseAiGenerationOutput(input.action, output);
  } catch {
    throw new GeminiUnavailableError();
  }
}
