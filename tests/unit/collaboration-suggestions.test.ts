import { describe, expect, it } from "vitest";
import { applySuggestion } from "@/features/collaboration/suggestions";

describe("applySuggestion", () => {
  it("applies an intact attributed proposal", () => {
    expect(
      applySuggestion("Hello world", {
        id: "s1",
        kind: "replace",
        from: 6,
        to: 11,
        replacement: "CapItUp",
        sourceText: "world",
        state: "open",
      }),
    ).toBe("Hello CapItUp");
  });
  it("rejects stale and already decided proposals", () => {
    const base = {
      id: "s1",
      kind: "delete" as const,
      from: 0,
      to: 5,
      replacement: "",
      sourceText: "Hello",
      state: "open" as const,
    };
    expect(applySuggestion("Hi world", base)).toBeNull();
    expect(
      applySuggestion("Hello world", { ...base, state: "accepted" }),
    ).toBeNull();
  });
});
