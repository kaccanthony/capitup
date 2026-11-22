import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261026000100_caption_versions_prerequisite.sql";

describe("caption-version prerequisite", () => {
  it("uses append-only submitted snapshots and trusted mutations", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain("create table public.caption_versions");
    expect(migration).toContain("unique (content_item_id, version_number)");
    expect(migration).toContain(
      "create or replace function public.submit_caption_version",
    );
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "revoke all on public.caption_drafts, public.caption_versions",
    );
  });
});
