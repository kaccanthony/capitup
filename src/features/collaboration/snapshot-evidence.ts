import "server-only";

import { countDestinationCharacters } from "@/lib/destination-character-limits";
import { countWords } from "@/lib/word-count";

export type SnapshotCountEvidence = Readonly<{
  wordCount: number;
  graphemeCount: number;
}>;

export function countSnapshotEvidence(
  plainText: string,
): SnapshotCountEvidence {
  return {
    wordCount: countWords(plainText),
    graphemeCount: countDestinationCharacters(plainText),
  };
}
