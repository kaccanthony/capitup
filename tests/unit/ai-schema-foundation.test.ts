import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Phase 06 schema foundation", () => {
  it("defines RLS-protected AI records and atomic accepted quota limits", async () => {
    const migration = await readFile(
      "supabase/migrations/20261027000100_phase_06_ai_foundation.sql",
      "utf8",
    );

    for (const table of [
      "ai_style_profiles",
      "ai_style_profile_versions",
      "ai_style_samples",
      "ai_caption_embeddings",
      "ai_generation_runs",
      "ai_feedback",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }

    expect(migration).toContain("private.can_retrieve_ai_sample");
    expect(migration).toContain("sample.revoked_at is null");
    expect(migration).toContain("request_count < 5");
    expect(migration).toContain("request_count < 25");
    expect(migration).toContain("request_count < 250");
    expect(migration).toContain("private.can_edit_content(p_content_item_id)");
    expect(migration).toContain("from anon, authenticated");
  });
});
