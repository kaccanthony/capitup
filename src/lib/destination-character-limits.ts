export type DestinationCharacterPolicy = Readonly<{
  slug: string;
  displayLabel: string;
  maximumVisibleCharacters: number;
}>;

export type DestinationCharacterLimitFailure = Readonly<{
  slug: string;
  displayLabel: string;
  currentVisibleCharacters: number;
  maximumVisibleCharacters: number;
}>;

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

/**
 * Destination limits count all visible graphemes. Unlike the word counter,
 * URLs, hashtags, mentions, punctuation, whitespace, and emoji are included.
 */
export function countDestinationCharacters(value: string): number {
  return Array.from(graphemeSegmenter.segment(value.normalize("NFC"))).length;
}

function assertCharacterLimit(policy: DestinationCharacterPolicy): void {
  if (
    !Number.isSafeInteger(policy.maximumVisibleCharacters) ||
    policy.maximumVisibleCharacters < 1
  ) {
    throw new RangeError(
      "maximumVisibleCharacters must be a positive safe integer.",
    );
  }
}

export function validateDestinationCharacterLimits(
  value: string,
  destinations: readonly DestinationCharacterPolicy[],
): DestinationCharacterLimitFailure[] {
  const currentVisibleCharacters = countDestinationCharacters(value);

  return destinations.flatMap((destination) => {
    assertCharacterLimit(destination);

    return currentVisibleCharacters > destination.maximumVisibleCharacters
      ? [
          {
            slug: destination.slug,
            displayLabel: destination.displayLabel,
            currentVisibleCharacters,
            maximumVisibleCharacters: destination.maximumVisibleCharacters,
          },
        ]
      : [];
  });
}
