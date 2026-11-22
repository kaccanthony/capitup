import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("AI authorization and provenance migration", () => {
  it("filters vectors at the trusted database boundary before ranking", async () => {
    const migration = await readFile(
      "supabase/migrations/20261115000100_phase_06_ai_operations.sql",
      "utf8",
    );

    expect(migration).toContain("public.search_ai_caption_embeddings");
    expect(migration).toContain(
      "not private.can_edit_content(p_content_item_id)",
    );
    expect(migration).toContain(
      "sample.organization_id = v_item.organization_id",
    );
    expect(migration).toContain(
      "sample.project_id is null or sample.project_id = v_item.project_id",
    );
    expect(migration).toContain("sample.revoked_at is null");
    expect(migration).toContain("sample.curated_at is not null");
    expect(migration).toContain("p_retrieved_sample_ids");
    expect(migration).toContain("public.record_ai_generation_feedback");
  });
});
