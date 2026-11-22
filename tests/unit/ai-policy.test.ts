import { describe, expect, it } from "vitest";
import { aiPolicy, isWithinAiQuota } from "@/features/ai/policy";

describe("AI policy", () => {
  it("records the accepted Gemini development configuration", () => {
    expect(aiPolicy).toMatchObject({
      version: "2026-10-27",
      model: "gemini-3.8-flash",
      userRequestsPerTenMinutes: 5,
      userRequestsPerUtcDay: 25,
      organizationRequestsPerUtcDay: 250,
      generationLogRetentionDays: 180,
      minimumHumanReviewedAcceptancePercent: 80,
      providerUse: "synthetic_test_only",
    });
  });

  it("rejects a request when either accepted quota is exhausted", () => {
    expect(
      isWithinAiQuota({
        userRequestsInTenMinutes: 4,
        userRequestsToday: 24,
        organizationRequestsToday: 249,
      }),
    ).toBe(true);
    expect(
      isWithinAiQuota({
        userRequestsInTenMinutes: 1,
        userRequestsToday: 25,
        organizationRequestsToday: 1,
      }),
    ).toBe(false);
    expect(
      isWithinAiQuota({
        userRequestsInTenMinutes: 1,
        userRequestsToday: 1,
        organizationRequestsToday: 250,
      }),
    ).toBe(false);
    expect(
      isWithinAiQuota({
        userRequestsInTenMinutes: 5,
        userRequestsToday: 1,
        organizationRequestsToday: 1,
      }),
    ).toBe(false);
  });
});
