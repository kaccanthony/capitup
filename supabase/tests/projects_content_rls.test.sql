-- Phase 03 hosted-development constraint and RLS integration tests.
-- Pending: run only after Phase 02 and Phase 03 migrations are applied to an
-- explicitly authorized isolated development project. Never run in production.

begin;

select plan(18);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'director-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'writer-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'executive-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'executive-head-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('51000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'writer-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, slug, display_name) values
  ('52000000-0000-4000-8000-000000000001', 'phase-three-a', 'Phase Three A'),
  ('52000000-0000-4000-8000-000000000002', 'phase-three-b', 'Phase Three B');

insert into public.member_allowlist (
  id, organization_id, normalized_email, status, initial_role,
  claimed_by_user_id, claimed_at
) values
  ('53000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'director-a@example.test', 'claimed', 'publicity_director', '51000000-0000-4000-8000-000000000001', now()),
  ('53000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', 'writer-a@example.test', 'claimed', 'junior_officer', '51000000-0000-4000-8000-000000000002', now()),
  ('53000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', 'viewer-a@example.test', 'claimed', 'junior_officer', '51000000-0000-4000-8000-000000000003', now()),
  ('53000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', 'executive-a@example.test', 'claimed', 'executive', '51000000-0000-4000-8000-000000000004', now()),
  ('53000000-0000-4000-8000-000000000005', '52000000-0000-4000-8000-000000000001', 'executive-head-a@example.test', 'claimed', 'executive', '51000000-0000-4000-8000-000000000005', now()),
  ('53000000-0000-4000-8000-000000000006', '52000000-0000-4000-8000-000000000002', 'writer-b@example.test', 'claimed', 'junior_officer', '51000000-0000-4000-8000-000000000006', now());

insert into public.organization_memberships (
  id, organization_id, allowlist_entry_id, user_id, normalized_email,
  status, activated_at
) values
  ('54000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'director-a@example.test', 'active', now()),
  ('54000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'writer-a@example.test', 'active', now()),
  ('54000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000003', '51000000-0000-4000-8000-000000000003', 'viewer-a@example.test', 'active', now()),
  ('54000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000004', '51000000-0000-4000-8000-000000000004', 'executive-a@example.test', 'active', now()),
  ('54000000-0000-4000-8000-000000000005', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000005', '51000000-0000-4000-8000-000000000005', 'executive-head-a@example.test', 'active', now()),
  ('54000000-0000-4000-8000-000000000006', '52000000-0000-4000-8000-000000000002', '53000000-0000-4000-8000-000000000006', '51000000-0000-4000-8000-000000000006', 'writer-b@example.test', 'active', now());

insert into public.profiles (user_id, display_name) values
  ('51000000-0000-4000-8000-000000000001', 'Director A'),
  ('51000000-0000-4000-8000-000000000002', 'Writer A'),
  ('51000000-0000-4000-8000-000000000003', 'Viewer A'),
  ('51000000-0000-4000-8000-000000000004', 'Executive A'),
  ('51000000-0000-4000-8000-000000000005', 'Executive Head A'),
  ('51000000-0000-4000-8000-000000000006', 'Writer B');

insert into public.organization_role_assignments (membership_id, role, reason) values
  ('54000000-0000-4000-8000-000000000001', 'publicity_director', 'synthetic_fixture'),
  ('54000000-0000-4000-8000-000000000002', 'junior_officer', 'synthetic_fixture'),
  ('54000000-0000-4000-8000-000000000003', 'junior_officer', 'synthetic_fixture'),
  ('54000000-0000-4000-8000-000000000004', 'executive', 'synthetic_fixture'),
  ('54000000-0000-4000-8000-000000000005', 'executive', 'synthetic_fixture'),
  ('54000000-0000-4000-8000-000000000006', 'junior_officer', 'synthetic_fixture');

insert into public.projects (id, organization_id, title, created_by_user_id) values
  ('55000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'Organization A project', '51000000-0000-4000-8000-000000000001'),
  ('55000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000002', 'Organization B project', '51000000-0000-4000-8000-000000000006');

insert into public.project_assignments (
  id, organization_id, project_id, membership_id, role, assigned_by_user_id
) values
  ('56000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002', 'writer', '51000000-0000-4000-8000-000000000001'),
  ('56000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000003', 'viewer', '51000000-0000-4000-8000-000000000001'),
  ('56000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000005', 'project_head', '51000000-0000-4000-8000-000000000001'),
  ('56000000-0000-4000-8000-000000000004', '52000000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000002', '54000000-0000-4000-8000-000000000006', 'writer', '51000000-0000-4000-8000-000000000006');

insert into public.content_items (
  id, organization_id, project_id, content_format_id, title, created_by_user_id
) values
  ('57000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 1, 'Writer item', '51000000-0000-4000-8000-000000000002'),
  ('57000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 1, 'Executive head item', '51000000-0000-4000-8000-000000000005');

insert into public.content_item_tags (content_item_id, content_format_id, content_tag_id) values
  ('57000000-0000-4000-8000-000000000001', 1, 3),
  ('57000000-0000-4000-8000-000000000002', 1, 3);

insert into public.content_item_assignments (
  id, project_id, content_item_id, project_assignment_id, responsibility,
  assigned_by_user_id
) values
  ('58000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', '57000000-0000-4000-8000-000000000001', '56000000-0000-4000-8000-000000000001', 'writer', '51000000-0000-4000-8000-000000000001'),
  ('58000000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000001', '57000000-0000-4000-8000-000000000002', '56000000-0000-4000-8000-000000000003', 'writer', '51000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated","email":"writer-a@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.projects $$,
  array[1::bigint],
  'a writer reads only their assigned project'
);

select results_eq(
  $$ select count(*)::bigint from public.projects where id = '55000000-0000-4000-8000-000000000002' $$,
  array[0::bigint],
  'cross-organization projects remain hidden'
);

select results_eq(
  $$ select count(*)::bigint from public.content_tags $$,
  array[11::bigint],
  'only the eleven controlled tag rows are seeded'
);

select throws_ok(
  $$ select public.assign_project_member('55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002', 'project_head') $$,
  '42501', 'access denied',
  'a writer cannot grant a project assignment'
);

select throws_ok(
  $$ insert into public.project_assignments (organization_id, project_id, membership_id, role, assigned_by_user_id) values ('52000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', '54000000-0000-4000-8000-000000000002', 'project_head', '51000000-0000-4000-8000-000000000002') $$,
  '42501', 'permission denied for table project_assignments',
  'a browser cannot change assignments directly'
);

select lives_ok(
  $$ select public.update_content_metadata('57000000-0000-4000-8000-000000000001', 1, 'Writer item updated', 'post', array['EVENT'], false, null) $$,
  'a writer with content responsibility can edit draft metadata'
);

select throws_ok(
  $$ select public.update_content_metadata('57000000-0000-4000-8000-000000000001', 2, 'Invalid pair', 'article', array['REEL'], false, null) $$,
  '22023', 'invalid content taxonomy',
  'an invalid content-kind and tag combination is rejected'
);

select throws_ok(
  $$ select public.create_content_item('55000000-0000-4000-8000-000000000001', 'Arbitrary tag', 'post', array['CUSTOM'], false, null) $$,
  '22023', 'invalid content taxonomy',
  'an arbitrary tag is rejected'
);

select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000003","role":"authenticated","email":"viewer-a@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.content_items $$,
  array[2::bigint],
  'a viewer can read content in the assigned project'
);

select throws_ok(
  $$ select public.update_content_metadata('57000000-0000-4000-8000-000000000001', 2, 'Viewer edit', 'post', array['EVENT'], false, null) $$,
  '42501', 'access denied',
  'a viewer cannot edit content through the trusted RPC'
);

select throws_ok(
  $$ update public.content_items set title = 'Direct browser edit' where id = '57000000-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table content_items',
  'a browser cannot update content tables directly'
);

select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000004","role":"authenticated","email":"executive-a@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.projects $$,
  array[0::bigint],
  'an executive without a project assignment cannot read projects'
);

select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000005","role":"authenticated","email":"executive-head-a@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.projects $$,
  array[1::bigint],
  'an executive with a head assignment can read that project'
);

select throws_ok(
  $$ select public.update_content_metadata('57000000-0000-4000-8000-000000000001', 2, 'Unassigned executive edit', 'post', array['EVENT'], false, null) $$,
  '42501', 'access denied',
  'a head assignment alone cannot edit another writer content item'
);

select lives_ok(
  $$ select public.update_content_metadata('57000000-0000-4000-8000-000000000002', 1, 'Executive head item updated', 'post', array['EVENT'], false, null) $$,
  'an executive head with explicit writer responsibility can edit'
);

select set_config('request.jwt.claims', '{"sub":"51000000-0000-4000-8000-000000000006","role":"authenticated","email":"writer-b@example.test"}', true);

select results_eq(
  $$ select count(*)::bigint from public.content_items where id = '57000000-0000-4000-8000-000000000001' $$,
  array[0::bigint],
  'a member in another organization cannot read a guessed content item'
);

reset role;

select ok(
  not has_table_privilege('authenticated', 'public.project_content_audit_events', 'select'),
  'browser clients cannot read Phase 03 audit events'
);

select throws_ok(
  $$ select 'org_admin'::public.project_assignment_role $$,
  '22P02', 'invalid input value for enum project_assignment_role: "org_admin"',
  'an organization role cannot be stored as a project assignment'
);

select * from finish();
rollback;
