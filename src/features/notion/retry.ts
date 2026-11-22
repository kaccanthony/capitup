export type NotionSyncFailure = "retry" | "conflict" | "dead_letter";

const retryDelaysMs = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const;

export function classifyNotionSyncFailure(input: {
  statusCode?: number;
  attempt: number;
}): NotionSyncFailure {
  if (input.statusCode === 409 || input.statusCode === 412) return "conflict";
  if (input.attempt >= retryDelaysMs.length) return "dead_letter";
  if (
    input.statusCode === undefined ||
    input.statusCode === 429 ||
    input.statusCode >= 500
  ) {
    return "retry";
  }
  return "dead_letter";
}

export function nextNotionRetryAt(input: { attempt: number; now?: Date }) {
  if (input.attempt < 0 || input.attempt >= retryDelaysMs.length) return null;
  const now = input.now ?? new Date();
  return new Date(now.getTime() + retryDelaysMs[input.attempt]).toISOString();
}
