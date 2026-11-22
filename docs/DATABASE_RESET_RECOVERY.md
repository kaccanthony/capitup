# CapItUp app-schema reset and migration replay

This is a **destructive runbook**, not an executed reset. It deletes CapItUp data in `public` and `private`. Run only against the intended disposable or explicitly approved database after saving anything that must survive. Do not drop Supabase-managed `auth`, `storage`, `realtime`, `extensions`, or `supabase_migrations` schemas. `auth.users` and Storage objects are outside this app-schema reset; preserve them deliberately and check for stale references afterward.

## Preferred route: let the Supabase CLI reset and replay

Confirm the exact project/branch target and inspect `supabase_migrations.schema_migrations` first. Supabase's `db reset` command resets user-created objects and applies local migrations in timestamp order; for a linked remote project, use the remote/linked option supported by the installed CLI. **Do not execute this against a production project.** A local reset needs the local Supabase stack, which this workspace has not had available. Do not use `db push` alone after manually dropping tables: recorded versions will be skipped.

```powershell
supabase migration list --remote
supabase db reset --linked --no-seed
```

The installed CLI may use `--remote` instead of `--linked`; check `supabase db reset --help` before running. `--no-seed` avoids loading `supabase/seed.sql` if it exists. The CLI handles migration history; avoid manually deleting from `supabase_migrations.schema_migrations`.

## Manual SQL option, only when migration history is empty/reconciled

First verify that `private` contains only CapItUp objects and inspect dependencies on `public`, because `CASCADE` can remove dependent objects in other schemas. Confirm the connection's `current_database()` and target project. Run the following as the schema owner/`postgres`, in one transaction, after backup. This restores schema usage for API roles without granting browser roles arbitrary `CREATE` or blanket table privileges. The migrations supply their own table/function grants and RLS policies.

```sql
begin;
drop schema if exists private cascade;
drop schema if exists public cascade;
create schema public authorization postgres;
grant usage on schema public to anon, authenticated, service_role;
commit;
```

Before using the CLI to replay after a manual reset, reconcile its recorded migration versions with the actual empty app schemas through the supported migration-repair workflow, or use the CLI reset instead. Do not reapply a version that is still recorded as applied. Do not copy all SQL into one untracked file: it loses the useful per-version failure point and can conflict with history. If manually executing individual files in SQL Editor, record each successful version through the supported migration mechanism rather than later running `db push` against mismatched history.

## Migration order

Apply each file exactly once, in this order, stopping on the first error:

1. `20261024000100_phase_02_auth_membership.sql`
2. `20261025000100_phase_03_projects_content.sql`
3. `20261025000200_destination_policy_v1.sql`
4. `20261026000100_caption_versions_prerequisite.sql`
5. `20261026000200_phase_04_workflows.sql`
6. `20261026000300_phase_04_workflow_transitions.sql`
7. `20261026000400_phase_04_overrides_notifications.sql`
8. `20261026000500_phase_04_unanimity_and_notifications.sql`
9. `20261026000600_phase_04_approval_invalidation.sql`
10. `20261026000700_phase_05_collaboration.sql`
11. `20261026000800_phase_05_server_snapshot_notifications.sql`
12. `20261027000100_phase_06_ai_foundation.sql`
13. `20261115000100_phase_06_ai_operations.sql`
14. `20261115000200_phase_07_notion_integration.sql`
15. `20261122000100_o004_governance.sql`

Files 1, 2, and 12 request `pgcrypto`, `btree_gist`, and `vector` in Supabase's `extensions` schema. Confirm those extensions and `extensions` schema exist and the migration role may create them. Files create RLS policies and explicit grants; a schema reset must not be followed by blanket grants to `anon`/`authenticated`. Functions and triggers are recreated by migrations. File 15 is a new, untracked local migration and has not been applied or database-tested; review it before replay. No migration file recreates organizational members, invitations, configured integrations, captions, or other lost business rows. Seed only approved synthetic/test data, and keep identity records in `auth.users` consistent with any restored memberships.

## Verification after replay

Compare the CLI's migration list with all 15 filenames; inspect `public` and `private` objects, RLS-enabled flags, policies, function grants, and extension availability. Run positive/negative/cross-organization RLS tests and relevant application checks. An applied schema alone does not recover lost data. Keep a backup and record the reset target, operator, timestamps, applied versions, first failure if any, and data-integrity results.
