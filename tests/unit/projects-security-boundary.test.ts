import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261025000100_phase_03_projects_content.sql";

describe("Phase 03 database and server boundaries", () => {
  it("enables RLS on every Phase 03 API table", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const tables = [
      "content_formats",
      "content_tags",
      "content_format_tags",
      "projects",
      "project_assignments",
      "content_items",
      "content_item_tags",
      "publication_channels",
      "content_publication_channels",
      "deliverables",
      "content_item_assignments",
      "project_content_audit_events",
    ];

    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
  });

  it("withholds direct browser writes and audit-table reads", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i,
    );
    expect(migration).toContain(
      "revoke all on public.project_content_audit_events from anon, authenticated;",
    );
    expect(migration).not.toContain(
      "grant select on public.project_content_audit_events to authenticated;",
    );
  });

  it("uses exact project roles and keeps organization roles out of the enum", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const enumBlock = migration.match(
      /create type public\.project_assignment_role[\s\S]*?\);/,
    )?.[0];

    expect(enumBlock).toContain("'publicity_head'");
    expect(enumBlock).toContain("'co_project_head'");
    expect(enumBlock).toContain("'project_head'");
    expect(enumBlock).toContain("'writer'");
    expect(enumBlock).toContain("'viewer'");
    expect(enumBlock).not.toContain("'org_admin'");
    expect(enumBlock).not.toContain("'executive'");
  });

  it("seeds only the controlled taxonomy and enforces kind/tag pairs", async () => {
    const migration = await readFile(migrationPath, "utf8");

    for (const kind of ["post", "video", "article"]) {
      expect(migration).toContain(`'${kind}'`);
    }
    for (const tag of [
      "GENERAL",
      "BIRTHDAY",
      "ANNOUNCEMENT",
      "EVENT",
      "BRANDING",
      "STORY",
      "HN",
      "HOLIDAY",
      "VIDEO",
      "AVP",
      "REEL",
    ]) {
      expect(migration).toContain(`'${tag}'`);
    }
    expect(migration).toContain("constraint content_item_tags_allowed_pair_fk");
    expect(migration).toContain(
      "raise exception 'invalid content taxonomy' using errcode = '22023';",
    );

    const associationBlock = migration.match(
      /insert into public\.content_format_tags[\s\S]*?;\n\ncreate table public\.projects/,
    )?.[0];
    const pairs = [
      ...(associationBlock?.matchAll(/\((\d+),\s*(\d+)\)/g) ?? []),
    ].map((match) => [Number(match[1]), Number(match[2])]);

    expect(pairs).toEqual([
      [1, 1],
      [1, 8],
      [1, 2],
      [1, 3],
      [1, 9],
      [1, 4],
      [1, 10],
      [1, 11],
      [2, 5],
      [2, 6],
      [2, 7],
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
    ]);
  });

  it("anchors trusted operations to auth.uid and checks resource scope", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("v_actor uuid := auth.uid()");
    expect(migration).toContain(
      "assignment.membership_id = private.current_membership_id(project.organization_id)",
    );
    expect(migration).toContain(
      "v_project_assignment.project_id <> v_item.project_id",
    );
  });

  it("normalizes the special-case reason before metadata comparison", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("v_special_case_reason text;");
    expect(migration).toContain("v_special_case_reason := case");
    expect(migration).toContain("special_case_reason = v_special_case_reason,");
    expect(migration).toContain(
      "v_item.special_case_reason is distinct from v_special_case_reason then",
    );
  });

  it("keeps data access server-only and reauthorizes inside server actions", async () => {
    const data = await readFile("src/features/projects/data.ts", "utf8");
    const actions = await readFile("src/features/projects/actions.ts", "utf8");

    expect(data).toContain('import "server-only"');
    expect(data).toContain("getAuthorizationForClient");
    expect(actions).toContain('"use server"');
    expect(actions).not.toContain("SERVICE_ROLE");
    expect(data).not.toContain("SERVICE_ROLE");
  });
});
