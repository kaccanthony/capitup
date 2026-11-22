export const aiPolicy = {
  version: "2026-10-27",
  model: "gemini-3.8-flash",
  userRequestsPerTenMinutes: 5,
  userRequestsPerUtcDay: 25,
  organizationRequestsPerUtcDay: 250,
  generationLogRetentionDays: 180,
  minimumHumanReviewedAcceptancePercent: 80,
  providerUse: "synthetic_test_only",
} as const;

export function isWithinAiQuota(input: {
  userRequestsInTenMinutes: number;
  userRequestsToday: number;
  organizationRequestsToday: number;
}) {
  return (
    input.userRequestsInTenMinutes < aiPolicy.userRequestsPerTenMinutes &&
    input.userRequestsToday < aiPolicy.userRequestsPerUtcDay &&
    input.organizationRequestsToday < aiPolicy.organizationRequestsPerUtcDay
  );
}
