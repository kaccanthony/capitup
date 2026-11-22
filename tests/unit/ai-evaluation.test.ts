import { describe, expect, it } from "vitest";
import { evaluateAiFixtures } from "@/features/ai/evaluation";

describe("AI evaluation", () => {
  it("requires at least 80 percent human-reviewed acceptance", () => {
    const fixture = {
      factualConsistency: true,
      style: true,
      cta: true,
      withinLimits: true,
      avoidedPhrases: true,
      editDistance: 2,
      maxEditDistance: 3,
    };
    const report = evaluateAiFixtures([
      { id: "1", ...fixture, humanAccepted: true },
      { id: "2", ...fixture, humanAccepted: true },
      { id: "3", ...fixture, humanAccepted: true },
      { id: "4", ...fixture, humanAccepted: true },
      { id: "5", ...fixture, humanAccepted: false },
    ]);

    expect(report.humanAcceptancePercent).toBe(80);
    expect(report.meetsPrivateCaptionGate).toBe(true);
    expect(report.factualConsistencyPercent).toBe(100);
    expect(report.editDistancePercent).toBe(100);
  });
});
