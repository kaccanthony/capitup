import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Phase 04 workflow migration", () => {
  it("binds workflow instances to immutable caption versions", async () => {
    const sql = await readFile(
      "supabase/migrations/20261026000200_phase_04_workflows.sql",
      "utf8",
    );
    expect(sql).toContain(
      "caption_version_id uuid not null references public.caption_versions",
    );
    expect(sql).toContain("create table public.workflow_instance_steps");
    expect(sql).toContain("create table public.workflow_notifications");
    expect(sql).toContain("create table public.workflow_decisions");
    expect(sql).toContain("create table public.executive_designations");
    expect(sql).toContain("create table public.junior_officer_unavailability");
    expect(sql).toContain(
      "alter table public.workflow_instances enable row level security;",
    );
  });

  it("keeps transitions, frozen eligibility, override evidence, and notifications server-side", async () => {
    const [transitions, overrides, unanimity] = await Promise.all([
      readFile("supabase/migrations/20261026000300_phase_04_workflow_transitions.sql", "utf8"),
      readFile("supabase/migrations/20261026000400_phase_04_overrides_notifications.sql", "utf8"),
      readFile("supabase/migrations/20261026000500_phase_04_unanimity_and_notifications.sql", "utf8"),
    ]);

    expect(transitions).toContain("create table public.workflow_step_eligible_members");
    expect(transitions).toContain("create or replace function public.decide_workflow_step");
    expect(transitions).toContain("for update");
    expect(overrides).toContain("create or replace function public.director_override_workflow");
    expect(overrides).toContain("'director_override'");
    expect(unanimity).toContain("create table public.workflow_step_member_decisions");
    expect(unanimity).toContain("workflow_instance_enqueue_current_step");
  });
});
