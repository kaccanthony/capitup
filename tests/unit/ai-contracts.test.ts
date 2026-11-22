import { describe, expect, it } from "vitest";
import {
  AiOutputValidationError,
  confirmedAiBriefSchema,
  parseAiGenerationOutput,
} from "@/features/ai/contracts";

const syntheticVariant = {
  tone: "friendly",
  hook: "Join the synthetic test event",
  body: "This is synthetic fixture content only.",
  cta: "Register today",
  hashtags: ["#Synthetic"],
  assumptions: ["The date is confirmed."],
  warnings: [],
};

describe("AI assistance contracts", () => {
  it("requires a user-confirmed brief", () => {
    expect(
      confirmedAiBriefSchema.safeParse({
        action: "generate_three_directions",
        brief: "",
        confirmedAt: "2026-10-26T08:00:00+08:00",
      }).success,
    ).toBe(false);

    expect(
      confirmedAiBriefSchema.safeParse({
        action: "generate_three_directions",
        brief: "Create a synthetic event caption.",
        confirmedAt: "2026-10-26T08:00:00+08:00",
      }).success,
    ).toBe(true);
  });

  it("accepts exactly three structured directions and strips unknown output", () => {
    const result = parseAiGenerationOutput("generate_three_directions", {
      variants: [syntheticVariant, syntheticVariant, syntheticVariant],
      unexpectedProviderField: "discarded",
    });

    expect(result.variants).toHaveLength(3);
    expect(result).not.toHaveProperty("unexpectedProviderField");
  });

  it("fails safely for malformed output or the wrong direction count", () => {
    expect(() =>
      parseAiGenerationOutput("generate_three_directions", {
        variants: [syntheticVariant],
      }),
    ).toThrow(AiOutputValidationError);

    expect(() =>
      parseAiGenerationOutput("naturalize", {
        variants: [{ ...syntheticVariant, hook: "" }],
      }),
    ).toThrow(AiOutputValidationError);
  });
});
