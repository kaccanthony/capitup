import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261026000600_phase_04_approval_invalidation.sql";

describe("Phase 04 approval invalidation", () => {
  it("invalidates the current workflow for every accepted approval-sensitive change", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "create or replace function private.invalidate_content_approval",
    );
    expect(migration).toContain("status = 'changes_requested'");
    expect(migration).toContain("event_type");
    expect(migration).toContain("'reopened'");

    for (const trigger of [
      "caption_drafts_invalidate_approval",
      "content_items_invalidate_approval",
      "content_publication_channels_invalidate_approval",
      "deliverables_invalidate_approval",
      "content_item_assignments_invalidate_approval",
    ]) {
      expect(migration).toContain(trigger);
    }

    expect(migration).toContain("approval_policy_fingerprint");
    expect(migration).toContain("v_existing_tag_slugs is distinct from");
  });

  it("stores scheduled publication time through a non-invalidating trusted operation", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const start = migration.indexOf(
      "create or replace function public.update_scheduled_publication_time",
    );
    const end = migration.indexOf("revoke all on function", start);
    const functionBody = migration.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(functionBody).toContain("scheduled_publication_at");
    expect(functionBody).not.toContain("invalidate_content_approval");
    expect(migration).toContain(
      "grant execute on function public.update_scheduled_publication_time",
    );
  });

  it("allows a protected draft or metadata edit to enter a new review loop", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "create or replace function public.save_caption_draft",
    );
    expect(migration).toContain(
      "create or replace function public.update_content_metadata",
    );
    expect(migration).toContain("v_item.status in ('published', 'archived')");
  });
});
