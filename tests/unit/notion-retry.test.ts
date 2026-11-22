import { describe, expect, it } from "vitest";
import {
  classifyNotionSyncFailure,
  nextNotionRetryAt,
} from "@/features/notion/retry";

describe("Notion sync retries", () => {
  it("uses bounded backoff and dead-letters exhausted transient failures", () => {
    expect(classifyNotionSyncFailure({ statusCode: 503, attempt: 0 })).toBe(
      "retry",
    );
    expect(classifyNotionSyncFailure({ statusCode: 503, attempt: 4 })).toBe(
      "dead_letter",
    );
    expect(
      nextNotionRetryAt({
        attempt: 1,
        now: new Date("2026-11-15T00:00:00.000Z"),
      }),
    ).toBe("2026-11-15T00:05:00.000Z");
  });

  it("keeps deterministic conflicts out of automatic retry loops", () => {
    expect(classifyNotionSyncFailure({ statusCode: 409, attempt: 0 })).toBe(
      "conflict",
    );
  });
});
