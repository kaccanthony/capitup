import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261026000700_phase_05_collaboration.sql";
const hardeningMigrationPath =
  "supabase/migrations/20261026000800_phase_05_server_snapshot_notifications.sql";

describe("Phase 05 collaboration schema", () => {
  it("closes the nullable anchor predicate before the COALESCE fallback", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("    )\n  ), false);\n$$;");
    expect(sql).not.toContain("    ), false);\n$$;");
  });

  it("keeps durable collaboration records canonical in Supabase and protected by RLS", async () => {
    const sql = await readFile(migrationPath, "utf8");

    for (const table of [
      "collaboration_documents",
      "collaboration_sessions",
      "collaboration_threads",
      "collaboration_comments",
      "collaboration_mentions",
      "collaboration_suggestions",
      "caption_reactions",
      "collaboration_audit_events",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
    }

    expect(sql).toContain("from anon, authenticated");
    expect(sql).toContain("private.can_view_content_item");
    expect(sql).toContain("private.can_review_content");
  });

  it("implements the four-hour lease, revalidation, and assignment revocation", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("interval '4 hours'");
    expect(sql).toContain(
      "create or replace function public.authorize_collaboration_session",
    );
    expect(sql).toContain(
      "create or replace function public.revalidate_collaboration_session",
    );
    expect(sql).toContain(
      "collaboration_sessions_revoke_for_content_assignment",
    );
    expect(sql).toContain(
      "collaboration_sessions_revoke_for_project_assignment",
    );
    expect(sql).toContain("collaboration_sessions_revoke_for_membership");
  });

  it("binds submission to an exact Liveblocks snapshot and immutable caption version", async () => {
    const sql = await readFile(hardeningMigrationPath, "utf8");

    expect(sql).toContain("collaboration_snapshot_version_id");
    expect(sql).toContain("snapshot_hash");
    expect(sql).toContain(
      "create or replace function public.finalize_collaboration_snapshot",
    );
    expect(sql).toContain("private.create_workflow_instance");
  });

  it("provides trusted comment, mention, resolution, and suggestion operations", async () => {
    const sql = await readFile(migrationPath, "utf8");

    for (const operation of [
      "create_collaboration_thread",
      "reply_to_collaboration_thread",
      "resolve_collaboration_thread",
      "create_collaboration_suggestion",
      "decide_collaboration_suggestion",
      "mark_collaboration_suggestion_applied",
      "set_caption_reaction",
    ]) {
      expect(sql).toContain(`create or replace function public.${operation}`);
    }
  });

  it("keeps advisory reactions non-binding and streams durable review state", async () => {
    const sql = await readFile(migrationPath, "utf8");

    expect(sql).toContain("unique (caption_version_id, actor_user_id)");
    expect(sql).toContain("kind = 'needs_refinement'");
    expect(sql).toContain("char_length(btrim(comment)) between 1 and 1000");
    expect(sql).toContain(
      "alter publication supabase_realtime add table public.caption_reactions",
    );
    expect(sql).toContain(
      "alter publication supabase_realtime add table public.workflow_notifications",
    );
  });
});
