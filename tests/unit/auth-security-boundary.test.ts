import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261024000100_phase_02_auth_membership.sql";

describe("Phase 02 security boundaries", () => {
  it("keeps service-role configuration out of browser modules", async () => {
    const browserClient = await readFile("src/lib/supabase/browser.ts", "utf8");
    const publicEnvironment = await readFile("src/lib/env/client.ts", "utf8");
    const serverClient = await readFile("src/lib/supabase/server.ts", "utf8");

    expect(browserClient).not.toContain("SERVICE_ROLE");
    expect(publicEnvironment).not.toContain("SERVICE_ROLE");
    expect(serverClient).toContain('import "server-only"');
  });

  it("enables RLS on every Phase 02 API table", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const tables = [
      "organizations",
      "organization_identity_requirements",
      "profiles",
      "member_allowlist",
      "organization_memberships",
      "organization_role_assignments",
      "access_security_events",
    ];

    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security;`,
      );
    }
  });

  it("withholds browser writes and the authentication hook", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete|all)[^;]*\s+to\s+(?:anon|authenticated)/i,
    );
    expect(migration).toContain(
      "revoke all on function public.before_user_created(jsonb) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;",
    );
  });

  it("anchors authorization to auth.uid and exact allowlist membership", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain("membership.user_id = (select auth.uid())");
    expect(migration).toContain("entry.normalized_email = v_email");
    expect(migration).not.toMatch(/split_part\s*\([^)]*email/i);
    expect(migration).not.toMatch(/username/i);
  });

  it("derives protected-denial and sign-out audit actors from auth.uid", async () => {
    const migration = await readFile(migrationPath, "utf8");
    const authorization = await readFile(
      "src/lib/auth/authorization.ts",
      "utf8",
    );
    const actions = await readFile("src/features/auth/actions.ts", "utf8");

    expect(migration).toContain(
      "create or replace function public.record_current_access_denied()",
    );
    expect(migration).toContain(
      "create or replace function public.record_current_sign_out()",
    );
    expect(migration).toMatch(/v_user_id uuid := auth\.uid\(\)/);
    expect(authorization).toContain(
      'client.rpc("record_current_access_denied")',
    );
    expect(actions).toContain('client.rpc("record_current_sign_out")');
  });
});
