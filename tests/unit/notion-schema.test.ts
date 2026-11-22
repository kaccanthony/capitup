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
});
