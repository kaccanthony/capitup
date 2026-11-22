import { describe, expect, it } from "vitest";
import { selectAuthorizedSamples } from "@/features/ai/retrieval";

const scope = {
  organizationId: "org-a",
  projectId: "project-a",
  requesterUserId: "writer-a",
};

describe("AI retrieval filtering", () => {
  it("filters inaccessible, revoked, and uncurated candidates before ranking", () => {
    const result = selectAuthorizedSamples(
      [
        {
          sampleId: "allowed-global",
          organizationId: "org-a",
          projectId: null,
          authorUserId: "writer-b",
          visibility: "organization_shared",
          curatedAt: "2026-11-15T00:00:00Z",
          revokedAt: null,
          similarity: 0.5,
          plainText: "Allowed organization sample",
        },
        {
          sampleId: "allowed-private",
          organizationId: "org-a",
          projectId: "project-a",
          authorUserId: "writer-a",
          visibility: "private",
          curatedAt: "2026-11-15T00:00:00Z",
          revokedAt: null,
          similarity: 0.9,
          plainText: "Allowed personal sample",
        },
        {
          sampleId: "other-org",
          organizationId: "org-b",
          projectId: null,
          authorUserId: "writer-b",
          visibility: "organization_shared",
          curatedAt: "2026-11-15T00:00:00Z",
          revokedAt: null,
          similarity: 1,
          plainText: "Cross organization",
        },
        {
          sampleId: "other-project",
          organizationId: "org-a",
          projectId: "project-b",
          authorUserId: "writer-b",
          visibility: "organization_shared",
          curatedAt: "2026-11-15T00:00:00Z",
          revokedAt: null,
          similarity: 1,
          plainText: "Inaccessible project",
        },
        {
          sampleId: "revoked",
          organizationId: "org-a",
          projectId: null,
          authorUserId: "writer-a",
          visibility: "private",
          curatedAt: "2026-11-15T00:00:00Z",
          revokedAt: "2026-11-15T00:01:00Z",
          similarity: 1,
          plainText: "Revoked personal sample",
        },
        {
          sampleId: "draft-like",
          organizationId: "org-a",
          projectId: null,
          authorUserId: "writer-a",
          visibility: "private",
          curatedAt: null,
          revokedAt: null,
          similarity: 1,
          plainText: "Uncurated sample",
        },
      ],
      scope,
    );

    expect(result.map((sample) => sample.sampleId)).toEqual([
      "allowed-private",
      "allowed-global",
    ]);
  });
});
