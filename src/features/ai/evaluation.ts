export const aiEvaluationFixtureVersion = "2026-11-15.v1";

export type AiEvaluationFixture = {
  id: string;
  factualConsistency: boolean;
  style: boolean;
  cta: boolean;
  withinLimits: boolean;
  avoidedPhrases: boolean;
  humanAccepted: boolean;
  editDistance: number;
  maxEditDistance: number;
};

export type AiEvaluationReport = {
  fixtureVersion: string;
  total: number;
  factualConsistencyPercent: number;
  stylePercent: number;
  ctaPercent: number;
  limitsPercent: number;
  avoidedPhrasesPercent: number;
  humanAcceptancePercent: number;
  editDistancePercent: number;
  meetsPrivateCaptionGate: boolean;
};

function percentage(matches: number, total: number) {
  return total === 0 ? 0 : Math.round((matches / total) * 100);
}

export function evaluateAiFixtures(
  fixtures: readonly AiEvaluationFixture[],
): AiEvaluationReport {
  const total = fixtures.length;
  const count = (predicate: (fixture: AiEvaluationFixture) => boolean) =>
    fixtures.filter(predicate).length;
  const humanAcceptancePercent = percentage(
    count((fixture) => fixture.humanAccepted),
    total,
  );

  return {
    fixtureVersion: aiEvaluationFixtureVersion,
    total,
    factualConsistencyPercent: percentage(
      count((fixture) => fixture.factualConsistency),
      total,
    ),
    stylePercent: percentage(
      count((fixture) => fixture.style),
      total,
    ),
    ctaPercent: percentage(
      count((fixture) => fixture.cta),
      total,
    ),
    limitsPercent: percentage(
      count((fixture) => fixture.withinLimits),
      total,
    ),
    avoidedPhrasesPercent: percentage(
      count((fixture) => fixture.avoidedPhrases),
      total,
    ),
    humanAcceptancePercent,
    editDistancePercent: percentage(
      count((fixture) => fixture.editDistance <= fixture.maxEditDistance),
      total,
    ),
    meetsPrivateCaptionGate: total > 0 && humanAcceptancePercent >= 80,
  };
}
