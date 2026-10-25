import { describe, expect, it } from "vitest";
import { CONTROLLED_TAGS, TAGS_BY_KIND } from "@/features/content/taxonomy";
import {
  contentCreateSchema,
  deliverableInputSchema,
  projectAssignmentInputSchema,
} from "@/features/projects/schemas";

const projectId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";

describe("Phase 03 controlled inputs", () => {
  it("matches the exact product-spec controlled taxonomy", () => {
    expect(TAGS_BY_KIND).toEqual({
      article: ["GENERAL", "ANNOUNCEMENT", "EVENT", "STORY"],
      video: ["VIDEO", "AVP", "REEL"],
      post: [
        "GENERAL",
        "BIRTHDAY",
        "ANNOUNCEMENT",
        "EVENT",
        "BRANDING",
        "STORY",
        "HN",
        "HOLIDAY",
      ],
    });
    expect(CONTROLLED_TAGS).toEqual({
      GENERAL: { label: "General", emoji: "📄" },
      BIRTHDAY: { label: "Birthday", emoji: "🎂" },
      ANNOUNCEMENT: { label: "Announcement", emoji: "📢" },
      EVENT: { label: "Event", emoji: "📰" },
      BRANDING: { label: "Branding", emoji: "🗞️" },
      STORY: { label: "Story", emoji: "🖼️" },
      HN: { label: "HN", emoji: "‼️" },
      HOLIDAY: { label: "Holiday", emoji: "🗓️" },
      VIDEO: { label: "Video", emoji: "📽️" },
      AVP: { label: "AVP", emoji: "🎥" },
      REEL: { label: "Reel", emoji: "🎥" },
    });
  });

  it("accepts an approved content kind and tag combination", () => {
    expect(
      contentCreateSchema.safeParse({
        projectId,
        title: "Launch announcement",
        kind: "post",
        tags: ["ANNOUNCEMENT", "EVENT"],
        isSpecialCase: false,
        specialCaseReason: null,
      }).success,
    ).toBe(true);
  });

  it("rejects arbitrary tags and invalid content-kind/tag combinations", () => {
    const arbitrary = contentCreateSchema.safeParse({
      projectId,
      title: "Launch announcement",
      kind: "post",
      tags: ["CUSTOM"],
      isSpecialCase: false,
      specialCaseReason: null,
    });
    const invalidPair = contentCreateSchema.safeParse({
      projectId,
      title: "Launch announcement",
      kind: "article",
      tags: ["REEL"],
      isSpecialCase: false,
      specialCaseReason: null,
    });

    expect(arbitrary.success).toBe(false);
    expect(invalidPair.success).toBe(false);
  });

  it("requires at least one unique controlled tag", () => {
    for (const tags of [[], ["EVENT", "EVENT"]]) {
      expect(
        contentCreateSchema.safeParse({
          projectId,
          title: "Event",
          kind: "post",
          tags,
          isSpecialCase: false,
          specialCaseReason: null,
        }).success,
      ).toBe(false);
    }
  });

  it("requires a reason only for descriptive special cases", () => {
    expect(
      contentCreateSchema.safeParse({
        projectId,
        title: "Event",
        kind: "post",
        tags: ["EVENT"],
        isSpecialCase: true,
        specialCaseReason: "",
      }).success,
    ).toBe(false);
    expect(
      contentCreateSchema.safeParse({
        projectId,
        title: "Event",
        kind: "post",
        tags: ["EVENT"],
        isSpecialCase: false,
        specialCaseReason: "Do not retain this reason",
      }).success,
    ).toBe(false);
  });

  it("accepts only project assignment roles, not organization roles", () => {
    expect(
      projectAssignmentInputSchema.safeParse({
        projectId,
        membershipId,
        role: "writer",
      }).success,
    ).toBe(true);
    expect(
      projectAssignmentInputSchema.safeParse({
        projectId,
        membershipId,
        role: "org_admin",
      }).success,
    ).toBe(false);
  });

  it("rejects dangerous and credential-bearing deliverable URLs", () => {
    const base = {
      projectId,
      contentItemId: membershipId,
      label: "Publication material",
      sourceCommittee: "Creatives",
      deliverableType: "design",
      status: null,
    };

    expect(
      deliverableInputSchema.safeParse({ ...base, url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      deliverableInputSchema.safeParse({
        ...base,
        url: "https://user:secret@example.test/file",
      }).success,
    ).toBe(false);
    expect(
      deliverableInputSchema.safeParse({
        ...base,
        url: "https://example.test/file",
      }).success,
    ).toBe(true);
  });
});
