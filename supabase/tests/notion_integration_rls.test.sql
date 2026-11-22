-- Phase 07 hosted-development RLS and trusted-operation checks.
-- Run only after the forward Phase 02-07 migrations are recorded on an
-- isolated hosted development project. Never run against production.

begin;

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notion-admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('71000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notion-writer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('71000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notion-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, slug, display_name) values
  ('72000000-0000-4000-8000-000000000001', 'notion-a', 'Notion A'),
  ('72000000-0000-4000-8000-000000000002', 'notion-b', 'Notion B');

insert into public.member_allowlist (
  id, organization_id, normalized_email, status, initial_role, claimed_by_user_id, claimed_at
) values
  ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'notion-admin@example.test', 'claimed', 'org_admin', '71000000-0000-4000-8000-000000000001', now()),
  ('73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', 'notion-writer@example.test', 'claimed', 'junior_officer', '71000000-0000-4000-8000-000000000002', now()),
  ('73000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000002', 'notion-other@example.test', 'claimed', 'junior_officer', '71000000-0000-4000-8000-000000000003', now());

insert into public.organization_memberships (
  id, organization_id, allowlist_entry_id, user_id, normalized_email, status, activated_at
) values
  ('74000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'notion-admin@example.test', 'active', now()),
  ('74000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', 'notion-writer@example.test', 'active', now()),
  ('74000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000003', 'notion-other@example.test', 'active', now());

insert into public.profiles (user_id, display_name) values
  ('71000000-0000-4000-8000-000000000001', 'Notion Admin'),
  ('71000000-0000-4000-8000-000000000002', 'Notion Writer'),
  ('71000000-0000-4000-8000-000000000003', 'Notion Other');

insert into public.organization_role_assignments (membership_id, role, reason) values
  ('74000000-0000-4000-8000-000000000001', 'org_admin', 'synthetic_fixture'),
  ('74000000-0000-4000-8000-000000000002', 'junior_officer', 'synthetic_fixture'),
  ('74000000-0000-4000-8000-000000000003', 'junior_officer', 'synthetic_fixture');

insert into public.projects (id, organization_id, title, created_by_user_id) values
  ('75000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Notion linked project', '71000000-0000-4000-8000-000000000001');

insert into public.project_assignments (organization_id, project_id, membership_id, role, assigned_by_user_id) values
  ('72000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000002', 'writer', '71000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","email":"notion-writer@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.integration_connections $$,
  array[0::bigint],
  'a non-admin organization member cannot read integration connection metadata'
);

select throws_ok(
  $$ select public.configure_notion_integration('72000000-0000-4000-8000-000000000001', 'Notion A', 'workspace-a', 'subscription-a', 'data-source-a', '[{"field":"project_title","direction":"import","propertyId":"Name","propertyType":"title"},{"field":"event_start_at","direction":"import","propertyId":"Event","propertyType":"date"},{"field":"deadline_at","direction":"import","propertyId":"Deadline","propertyType":"date"}]'::jsonb) $$,
  'P0001', 'notion_integration_not_authorized',
  'a non-admin cannot configure an integration'
);

select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","email":"notion-admin@example.test"}', true);

select lives_ok(
  $$ select public.configure_notion_integration('72000000-0000-4000-8000-000000000001', 'Notion A', 'workspace-a', 'subscription-a', 'data-source-a', '[{"field":"project_title","direction":"import","propertyId":"Name","propertyType":"title"},{"field":"event_start_at","direction":"import","propertyId":"Event","propertyType":"date"},{"field":"deadline_at","direction":"import","propertyId":"Deadline","propertyType":"date"}]'::jsonb) $$,
  'an organization administrator can configure the accepted import-only mapping'
);

select results_eq(
  $$ select count(*)::bigint from public.integration_connections $$,
  array[1::bigint],
  'the configuring administrator can read the organization connection status'
);

select throws_ok(
  $$ select public.configure_notion_integration('72000000-0000-4000-8000-000000000001', 'Notion A', 'workspace-a', 'subscription-a', 'data-source-a', '[{"field":"final_approved_caption","direction":"export","propertyId":"Caption","propertyType":"rich_text"}]'::jsonb) $$,
  'P0001', 'notion_integration_not_authorized',
  'the unresolved final-caption export cannot be configured'
);

select throws_ok(
  $$ insert into public.integration_connections (organization_id, provider, label, notion_workspace_id, notion_subscription_id, notion_data_source_id, field_mappings, configured_by_user_id) values ('72000000-0000-4000-8000-000000000001', 'notion', 'direct', 'x', 'y', 'z', '[]'::jsonb, '71000000-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table integration_connections',
  'a browser cannot insert integration records directly'
);

reset role;
set local role service_role;

update public.integration_connections set status = 'active'
where organization_id = '72000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ select public.accept_notion_webhook_event('workspace-a', 'subscription-a', 'event-a', 'page.properties_updated', now(), 'page-a', repeat('a', 64)) $$,
  'only the trusted service path can persist a verified webhook receipt'
);

insert into public.notion_object_links (
  integration_connection_id, organization_id, project_id, notion_page_id
) select id, organization_id, '75000000-0000-4000-8000-000000000001', 'page-a'
from public.integration_connections where organization_id = '72000000-0000-4000-8000-000000000001';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","email":"notion-admin@example.test"}', true);

select throws_ok(
  $$ select public.update_project('75000000-0000-4000-8000-000000000001', 1, 'Manual overwrite', null) $$,
  'P0001', 'notion_owned_project_fields',
  'a linked Notion-owned title cannot be overwritten through the normal project RPC'
);

select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated","email":"notion-other@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.integration_connections $$,
  array[0::bigint],
  'a member in another organization cannot discover the integration'
);

select results_eq(
  $$ select count(*)::bigint from public.notion_object_links $$,
  array[0::bigint],
  'a member in another organization cannot discover a linked external page'
);

reset role;
select * from finish();
rollback;
