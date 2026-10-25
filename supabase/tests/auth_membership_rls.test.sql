-- Phase 02 hosted-development RLS integration tests.
-- Pending: do not run until the migration is applied to an explicitly
-- authorized, isolated development project. Never run against production.

begin;

select plan(10);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-a@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-a@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'disabled-a@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'active-b@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.organizations (id, slug, display_name) values
  ('20000000-0000-4000-8000-000000000001', 'organization-a', 'Organization A'),
  ('20000000-0000-4000-8000-000000000002', 'organization-b', 'Organization B');

insert into public.member_allowlist (
  id,
  organization_id,
  normalized_email,
  status,
  initial_role,
  claimed_by_user_id,
  claimed_at
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'active-a@example.test',
    'claimed',
    'junior_officer',
    '10000000-0000-4000-8000-000000000001',
    now()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'admin-a@example.test',
    'claimed',
    'org_admin',
    '10000000-0000-4000-8000-000000000002',
    now()
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'disabled-a@example.test',
    'claimed',
    'junior_officer',
    '10000000-0000-4000-8000-000000000003',
    now()
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    'active-b@example.test',
    'claimed',
    'junior_officer',
    '10000000-0000-4000-8000-000000000004',
    now()
  );

insert into public.organization_memberships (
  id,
  organization_id,
  allowlist_entry_id,
  user_id,
  normalized_email,
  status,
  activated_at,
  suspended_at,
  status_reason
) values
  (
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'active-a@example.test',
    'active',
    now(),
    null,
    null
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'admin-a@example.test',
    'active',
    now(),
    null,
    null
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'disabled-a@example.test',
    'suspended',
    now(),
    now(),
    'synthetic_test_suspension'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'active-b@example.test',
    'active',
    now(),
    null,
    null
  );

insert into public.profiles (user_id, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'Active A'),
  ('10000000-0000-4000-8000-000000000002', 'Admin A'),
  ('10000000-0000-4000-8000-000000000003', 'Disabled A'),
  ('10000000-0000-4000-8000-000000000004', 'Active B');

insert into public.organization_role_assignments (
  membership_id,
  role,
  reason
) values
  ('40000000-0000-4000-8000-000000000001', 'junior_officer', 'synthetic_fixture'),
  ('40000000-0000-4000-8000-000000000002', 'org_admin', 'synthetic_fixture'),
  ('40000000-0000-4000-8000-000000000003', 'junior_officer', 'synthetic_fixture'),
  ('40000000-0000-4000-8000-000000000004', 'junior_officer', 'synthetic_fixture');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"active-a@example.test"}',
  true
);

select results_eq(
  $$ select count(*)::bigint from public.organizations $$,
  array[1::bigint],
  'an active member reads only their organization'
);

select results_eq(
  $$ select count(*)::bigint from public.organizations where id = '20000000-0000-4000-8000-000000000002' $$,
  array[0::bigint],
  'an active member cannot read a different organization'
);

select results_eq(
  $$ select count(*)::bigint from public.organization_memberships $$,
  array[1::bigint],
  'an ordinary active member reads only their membership'
);

select throws_ok(
  $$ insert into public.organization_role_assignments (membership_id, role) values ('40000000-0000-4000-8000-000000000001', 'org_admin') $$,
  '42501',
  'permission denied for table organization_role_assignments',
  'a browser session cannot escalate its organization role'
);

select throws_ok(
  $$ select public.create_member_invitation('20000000-0000-4000-8000-000000000001', 'other@example.test') $$,
  '42501',
  'access denied',
  'a non-admin cannot create an invitation by calling the RPC directly'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","email":"disabled-a@example.test"}',
  true
);

select results_eq(
  $$ select count(*)::bigint from public.organizations $$,
  array[0::bigint],
  'a suspended member cannot read organization data'
);

select results_eq(
  $$ select count(*)::bigint from public.profiles $$,
  array[0::bigint],
  'a suspended member cannot read even their profile through the API'
);

reset role;

select ok(
  not has_function_privilege('anon', 'public.claim_current_membership()', 'execute'),
  'anonymous browser clients cannot call membership claim'
);

select ok(
  not has_function_privilege('authenticated', 'public.before_user_created(jsonb)', 'execute'),
  'authenticated browser clients cannot call the Auth hook'
);

select ok(
  not has_table_privilege('authenticated', 'public.access_security_events', 'select'),
  'browser clients cannot read authentication audit events'
);

select * from finish();
rollback;
