import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Phase 07 Notion schema", () => {
  it("keeps integration state RLS-protected and direct browser mutation denied", async () => {
    const migration = await readFile(
      "supabase/migrations/20261115000200_phase_07_notion_integration.sql",
      "utf8",
    );

    for (const table of [
      "integration_connections",
      "notion_object_links",
      "sync_cursors",
      "sync_runs",
      "webhook_events",
      "sync_conflicts",
      "dead_letter_events",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }

    expect(migration).toContain("private.valid_notion_field_mappings");
    expect(migration).toContain("public.accept_notion_webhook_event");
    expect(migration).toContain("public.apply_notion_project_import");
    expect(migration).toContain("public.resume_notion_sync_run");
    expect(migration).toContain("public.resolve_notion_sync_conflict");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("notion_owned_project_fields");
    expect(migration).toContain("status not in ('active', 'degraded')");
    expect(migration).toContain(
      "set status = 'active', last_success_at = now()",
    );
    expect(migration).not.toContain("final_approved_caption");
  });

  it("keeps Notion schedule status and assignee IDs separate from editorial assignments", async () => {
    const migration = await readFile(
      "supabase/migrations/20261123000400_notion_posting_metadata.sql",
      "utf8",
    );

    expect(migration).toContain("notion_post_status text");
    expect(migration).toContain("notion_assignee_user_ids text[]");
    expect(migration).toContain("apply_notion_posting_metadata_import");
    expect(migration).toContain("'SCHEDULED'");
    expect(migration).toContain("'NOT NEEDED'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("content_item_assignments");
    expect(migration).not.toContain("content_status");
  });
});
