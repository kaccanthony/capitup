export type WordWarningLevel =
  | "normal"
  | "approaching_recommendation"
  | "exceeds_recommendation"
  | "exceeds_hard_maximum";

/**
 * Values must come from the resolved, versioned policy for the content tag.
 * This module deliberately provides no fallback policy values.
 */
export type WordWarningPolicy = Readonly<{
  tagRecommendedWordLimit: number;
  approachingOffsetWords: number;
  globalHardMaximumWords: number;
}>;

const URL_TOKEN = /^(?:https?:\/\/|www\.)\S+$/iu;
const HASHTAG_TOKEN = /^#\S+$/u;
const MENTION_TOKEN = /^@\S+$/u;
const WORD_CONTENT = /[\p{L}\p{N}]/u;
const EMOJI_CONTENT = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u;

function countEmojiGraphemes(value: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

  return Array.from(segmenter.segment(value)).filter(({ segment }) =>
    EMOJI_CONTENT.test(segment),
  ).length;
}

function countToken(token: string): number {
  if (URL_TOKEN.test(token) || MENTION_TOKEN.test(token)) {
    return 1;
  }

  if (HASHTAG_TOKEN.test(token)) {
    return 0;
  }

  return token.split("-").reduce((count, component) => {
    if (component.length === 0) {
      return count;
    }

    if (WORD_CONTENT.test(component)) {
      return count + 1;
    }

    return count + countEmojiGraphemes(component);
  }, 0);
}

/**
 * Counts the product-defined word units. This intentionally does not use
 * language-specific tokenization: a word-like non-whitespace sequence is one
 * word unless it is a hashtag, URL, mention, or hyphen-separated term.
 */
export function countWords(value: string): number {
  return (value.match(/\S+/gu) ?? []).reduce(
    (count, token) => count + countToken(token),
    0,
  );
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function validatePolicy(policy: WordWarningPolicy): void {
  assertNonNegativeSafeInteger(
    policy.tagRecommendedWordLimit,
    "tagRecommendedWordLimit",
  );
  assertNonNegativeSafeInteger(
    policy.approachingOffsetWords,
    "approachingOffsetWords",
  );
  assertNonNegativeSafeInteger(
    policy.globalHardMaximumWords,
    "globalHardMaximumWords",
  );

  if (policy.tagRecommendedWordLimit > policy.globalHardMaximumWords) {
    throw new RangeError(
      "tagRecommendedWordLimit cannot exceed globalHardMaximumWords.",
    );
  }
}

export function getWordWarningLevel(
  wordCount: number,
  policy: WordWarningPolicy,
): WordWarningLevel {
  assertNonNegativeSafeInteger(wordCount, "wordCount");
  validatePolicy(policy);

  if (wordCount > policy.globalHardMaximumWords) {
    return "exceeds_hard_maximum";
  }

  if (wordCount > policy.tagRecommendedWordLimit) {
    return "exceeds_recommendation";
  }

  if (
    wordCount >=
    policy.tagRecommendedWordLimit - policy.approachingOffsetWords
  ) {
    return "approaching_recommendation";
  }

  return "normal";
}
