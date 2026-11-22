import "server-only";

export type RetrievalCandidate = {
  sampleId: string;
  organizationId: string;
  projectId: string | null;
  authorUserId: string;
  visibility: "private" | "organization_shared";
  curatedAt: string | null;
  revokedAt: string | null;
  similarity: number;
  plainText: string;
};

export type RetrievalScope = {
  organizationId: string;
  projectId: string;
  requesterUserId: string;
};

export type RetrievedSample = Pick<
  RetrievalCandidate,
  "sampleId" | "plainText" | "similarity"
>;

/**
 * This is deliberately applied before ranking. A vector similarity score must
 * never become an oracle for inaccessible organization or project content.
 */
export function selectAuthorizedSamples(
  candidates: readonly RetrievalCandidate[],
  scope: RetrievalScope,
  limit = 8,
): RetrievedSample[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) {
    throw new Error("Invalid retrieval limit.");
  }

  return candidates
    .filter(
      (candidate) =>
        candidate.organizationId === scope.organizationId &&
        (candidate.projectId === null ||
          candidate.projectId === scope.projectId) &&
        candidate.curatedAt !== null &&
        candidate.revokedAt === null &&
        (candidate.authorUserId === scope.requesterUserId ||
          candidate.visibility === "organization_shared"),
    )
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
    .map(({ sampleId, plainText, similarity }) => ({
      sampleId,
      plainText,
      similarity,
    }));
}
