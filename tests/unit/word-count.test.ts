import { describe, expect, it } from "vitest";
import {
  countWords,
  getWordWarningLevel,
  type WordWarningPolicy,
} from "@/lib/word-count";

const tagPolicy: WordWarningPolicy = {
  tagRecommendedWordLimit: 200,
  approachingOffsetWords: 40,
  globalHardMaximumWords: 400,
};

describe("CapItUp word counting", () => {
  it("keeps apostrophes inside a word", () => {
    expect(countWords("Let's create captions")).toBe(3);
  });

  it("splits hyphenated terms while preserving apostrophes in components", () => {
    expect(countWords("FEU-Tech's event")).toBe(3);
  });

  it("counts numeric and alphanumeric terms as one word", () => {
    expect(countWords("The 10th batch has 2026 updates")).toBe(6);
  });

  it("counts standalone emoji by grapheme", () => {
    expect(countWords("🎉 👨‍👩‍👧‍👦 🇵🇭")).toBe(3);
    expect(countWords("🎉🎉")).toBe(2);
  });

  it("counts each URL as one word regardless of length", () => {
    expect(
      countWords(
        "Visit https://example.com/a/very/long/path?campaign=fit-games-2026 now",
      ),
    ).toBe(3);
  });

  it("excludes hashtags while retaining mentions", () => {
    expect(countWords("Hello #FITGames2026 @everyone")).toBe(2);
  });

  it("does not apply language-specific segmentation", () => {
    expect(countWords("你好世界")).toBe(1);
    expect(countWords("こんにちは 世界")).toBe(2);
  });

  it("does not count punctuation-only tokens", () => {
    expect(countWords("Hello, world! !!!")).toBe(2);
  });
});

describe("word recommendation warning levels", () => {
  it.each([
    [0, "normal"],
    [159, "normal"],
    [160, "approaching_recommendation"],
    [200, "approaching_recommendation"],
    [201, "exceeds_recommendation"],
    [400, "exceeds_recommendation"],
    [401, "exceeds_hard_maximum"],
  ] as const)("classifies %i words as %s", (wordCount, expected) => {
    expect(getWordWarningLevel(wordCount, tagPolicy)).toBe(expected);
  });

  it("uses the resolved tag policy instead of embedded thresholds", () => {
    const smallerTagPolicy: WordWarningPolicy = {
      tagRecommendedWordLimit: 120,
      approachingOffsetWords: 40,
      globalHardMaximumWords: 400,
    };

    expect(getWordWarningLevel(79, smallerTagPolicy)).toBe("normal");
    expect(getWordWarningLevel(80, smallerTagPolicy)).toBe(
      "approaching_recommendation",
    );
  });

  it("rejects invalid policy values instead of silently using a fallback", () => {
    expect(() =>
      getWordWarningLevel(10, {
        tagRecommendedWordLimit: 401,
        approachingOffsetWords: 40,
        globalHardMaximumWords: 400,
      }),
    ).toThrow(RangeError);
  });
});
