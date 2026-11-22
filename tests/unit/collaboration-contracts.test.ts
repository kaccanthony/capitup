import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  collaborationEditorNodeSchema,
  createSuggestionSchema,
  createThreadSchema,
  setCaptionReactionSchema,
} from "@/features/collaboration/contracts";

const projectId = "11111111-1111-4111-8111-111111111111";
const contentItemId = "22222222-2222-4222-8222-222222222222";

describe("collaboration contracts", () => {
  it("accepts bounded durable comment input and rejects a reversed anchor", () => {
    expect(
      createThreadSchema.safeParse({
        projectId,
        contentItemId,
        anchor: { from: 4, to: 9, quote: "draft" },
        body: "Please tighten this line.",
        mentionedUserIds: [],
      }).success,
    ).toBe(true);

    expect(
      createThreadSchema.safeParse({
        projectId,
        contentItemId,
        anchor: { from: 9, to: 4, quote: "draft" },
        body: "Invalid anchor.",
        mentionedUserIds: [],
      }).success,
    ).toBe(false);
  });

  it("enforces suggestion-kind text semantics", () => {
    const base = {
      projectId,
      contentItemId,
      anchor: { from: 1, to: 4, quote: "old" },
    };

    expect(
      createSuggestionSchema.safeParse({
        ...base,
        kind: "replace",
        sourceText: "old",
        replacementText: "new",
      }).success,
    ).toBe(true);
    expect(
      createSuggestionSchema.safeParse({
        ...base,
        kind: "delete",
        sourceText: "old",
        replacementText: "new",
      }).success,
    ).toBe(false);
  });

  it("validates serializable TipTap documents", () => {
    expect(
      collaborationEditorNodeSchema.safeParse({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "CapItUp", marks: [{ type: "bold" }] },
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("requires constructive context for needs-refinement reactions", () => {
    const base = {
      projectId,
      contentItemId,
      captionVersionId: "33333333-3333-4333-8333-333333333333",
    };
    expect(
      setCaptionReactionSchema.safeParse({
        ...base,
        kind: "looks_ready",
        comment: null,
      }).success,
    ).toBe(true);
    expect(
      setCaptionReactionSchema.safeParse({
        ...base,
        kind: "needs_refinement",
        comment: null,
      }).success,
    ).toBe(false);
  });

  it("keeps an OpenAPI contract for every collaboration route", async () => {
    const contract = JSON.parse(
      await readFile("docs/api/collaboration.openapi.json", "utf8"),
    ) as { paths: Record<string, unknown> };

    expect(Object.keys(contract.paths)).toEqual([
      "/api/liveblocks-auth/{projectId}/{contentId}",
      "/api/liveblocks-auth/{projectId}/{contentId}/access",
      "/api/collaboration-snapshot/{projectId}/{contentId}",
    ]);
  });
});
