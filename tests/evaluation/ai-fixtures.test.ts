import { describe, expect, it } from "vitest";
import { evaluateAiFixtures } from "@/features/ai/evaluation";

describe("AI fixture report v2026-11-15.v1", () => {
  it("records all required evaluation dimensions for synthetic fixtures", () => {
    const report = evaluateAiFixtures([
      {
        id: "synthetic-open-day-1",
        factualConsistency: true,
        style: true,
        cta: true,
        withinLimits: true,
        avoidedPhrases: true,
        humanAccepted: true,
        editDistance: 1,
        maxEditDistance: 4,
      },
    ]);

    expect(report).toMatchObject({
      fixtureVersion: "2026-11-15.v1",
      factualConsistencyPercent: 100,
      stylePercent: 100,
      ctaPercent: 100,
      limitsPercent: 100,
      avoidedPhrasesPercent: 100,
      humanAcceptancePercent: 100,
      editDistancePercent: 100,
    });
  });
});
