import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countDestinationCharacters,
  validateDestinationCharacterLimits,
} from "@/lib/destination-character-limits";

describe("destination character counting", () => {
  it("counts all visible content independently from word-count exclusions", () => {
    expect(countDestinationCharacters("#FIT @everyone https://x.co 🎉")).toBe(
      29,
    );
  });

  it("counts a combined emoji as one visible character", () => {
    expect(countDestinationCharacters("👨‍👩‍👧‍👦")).toBe(1);
  });
});

describe("destination character-limit validation", () => {
  it("identifies only the destinations that exceed their own limit", () => {
    const failures = validateDestinationCharacterLimits("a".repeat(500), [
      {
        slug: "facebook",
        displayLabel: "Facebook",
        maximumVisibleCharacters: 63206,
      },
      {
        slug: "x",
        displayLabel: "X (Twitter)",
        maximumVisibleCharacters: 280,
      },
    ]);

    expect(failures).toEqual([
      {
        slug: "x",
        displayLabel: "X (Twitter)",
        currentVisibleCharacters: 500,
        maximumVisibleCharacters: 280,
      },
    ]);
  });

  it("allows content at the configured maximum and rejects the next character", () => {
    const x = {
      slug: "x",
      displayLabel: "X (Twitter)",
      maximumVisibleCharacters: 280,
    };

    expect(validateDestinationCharacterLimits("a".repeat(280), [x])).toEqual(
      [],
    );
    expect(
      validateDestinationCharacterLimits("a".repeat(281), [x]),
    ).toHaveLength(1);
  });

  it("rejects invalid policy data instead of treating it as unlimited", () => {
    expect(() =>
      validateDestinationCharacterLimits("caption", [
        {
          slug: "x",
          displayLabel: "X (Twitter)",
          maximumVisibleCharacters: 0,
        },
      ]),
    ).toThrow(RangeError);
  });
});

describe("launch destination policy seed", () => {
  it("contains the owner-supplied v1 destination catalog and formats", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20261025000200_destination_policy_v1.sql",
      ),
      "utf8",
    );

    for (const seed of [
      "'facebook', 'Facebook', 63206",
      "'facebook_story', 'FB Story', 2000",
      "'facebook_community', 'Facebook Community', 63206",
      "'instagram', 'Instagram', 2200",
      "'instagram_story', 'Instagram Story', 2000",
      "'group_chat', 'Group Chats', 2000",
      "'x', 'X (Twitter)', 280",
      "'tiktok', 'TikTok', 4000",
      "'youtube', 'YouTube', 5000",
      "'discord', 'Discord', 2000",
      "'linkedin', 'LinkedIn', 3000",
      "'acm_website', 'ACM Website', 4000",
    ]) {
      expect(migration).toContain(seed);
    }
    expect(migration).toContain("('tiktok', 'video'), ('tiktok', 'post')");
    expect(migration).toContain(
      "('acm_website', 'post'), ('acm_website', 'article')",
    );
    expect(migration).toContain("'^[a-z0-9]+(?:[_-][a-z0-9]+)*$'");
    expect(migration).toContain("'Asia/Manila'");
    expect(migration).toContain("'v1'");
  });
});
