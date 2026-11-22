export type SuggestionKind = "insert" | "delete" | "replace";
export type SuggestionState = "open" | "accepted" | "rejected" | "stale";

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  from: number;
  to: number;
  replacement: string;
  sourceText: string;
  state: SuggestionState;
};

export function applySuggestion(
  text: string,
  suggestion: Suggestion,
): string | null {
  if (
    suggestion.state !== "open" ||
    suggestion.from < 0 ||
    suggestion.to < suggestion.from ||
    suggestion.to > text.length
  )
    return null;
  if (text.slice(suggestion.from, suggestion.to) !== suggestion.sourceText)
    return null;
  return `${text.slice(0, suggestion.from)}${suggestion.replacement}${text.slice(suggestion.to)}`;
}
