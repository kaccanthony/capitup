import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const phaseMigrationPath =
  "supabase/migrations/20261026000700_phase_05_collaboration.sql";
const hardeningMigrationPath =
  "supabase/migrations/20261026000800_phase_05_server_snapshot_notifications.sql";

describe("server-only collaboration snapshot finalization", () => {
  it("removes the browser RPC and grants the replacement only to service_role", async () => {
    const [phaseSql, hardeningSql] = await Promise.all([
      readFile(phaseMigrationPath, "utf8"),
      readFile(hardeningMigrationPath, "utf8"),
    ]);

    expect(phaseSql).toContain(
      "public.submit_collaboration_snapshot(\n    uuid, uuid, text, text, jsonb, text, text, text\n  )\n  from public, anon, authenticated;",
    );
    expect(phaseSql).not.toMatch(
      /grant execute[\s\S]*submit_collaboration_snapshot[\s\S]*to authenticated;/,
    );
    expect(hardeningSql).toContain(
      "drop function public.submit_collaboration_snapshot",
    );
    expect(hardeningSql).toMatch(
      /grant execute on function public\.finalize_collaboration_snapshot\([\s\S]*?\) to service_role;/,
    );
    expect(hardeningSql).not.toMatch(
      /grant execute on function public\.finalize_collaboration_snapshot\([\s\S]*?\) to authenticated;/,
    );
  });

  it("rejects forged actor, organization, project, assignment, room, and workflow scope", async () => {
    const sql = await readFile(hardeningMigrationPath, "utf8");

    for (const requiredCheck of [
      "membership.user_id = p_actor_user_id",
      "membership.organization_id = p_organization_id",
      "assignment.id = p_project_assignment_id",
      "assignment.project_id = p_project_id",
      "assignment.membership_id = v_membership.id",
      "content_assignment.project_assignment_id = v_assignment.id",
      "v_document.room_id <> p_room_id",
      "template.id = p_template_id",
      "template.organization_id = p_organization_id",
    ]) {
      expect(sql).toContain(requiredCheck);
    }
  });

  it("locks mutable state and rejects stale item, document, workflow, and replayed snapshots", async () => {
    const sql = await readFile(hardeningMigrationPath, "utf8");

    expect(sql.match(/for update;/g)?.length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain(
      "v_item.record_version <> p_expected_item_record_version",
    );
    expect(sql).toContain(
      "v_document.document_revision <> p_expected_document_revision",
    );
    expect(sql).toContain("v_previous_workflow.status <> 'changes_requested'");
    expect(sql).toContain("snapshot already finalized");
    expect(sql).toContain("caption_versions_collaboration_snapshot_unique_idx");
  });

  it("resolves versioned database policies and stores warnings without blocking review", async () => {
    const sql = await readFile(hardeningMigrationPath, "utf8");
    const functionSql = sql.slice(
      sql.indexOf(
        "create or replace function public.finalize_collaboration_snapshot",
      ),
    );

    expect(sql).toContain("create table public.caption_word_policies");
    expect(sql).toContain("caption_version_word_policy_evidence");
    expect(sql).toContain("caption_version_destination_policy_evidence");
    expect(functionSql).toContain("policy.recommended_word_limit");
    expect(functionSql).toContain("policy.approaching_offset_words");
    expect(functionSql).toContain("policy.global_hard_maximum_words");
    expect(functionSql).toContain("policy.character_limit");
    expect(functionSql).toContain("'over_recommendation'");
    expect(functionSql).toContain("'over_platform_maximum'");
    expect(functionSql).not.toMatch(
      /p_(?:word|grapheme)_count\s*>[^\n]+then\s+raise exception/i,
    );
  });
});
