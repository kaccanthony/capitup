-- Phase 02: invitation-only authentication, organization membership, and RLS.
-- This migration is designed for a hosted development project but is not applied
-- automatically. Review it before any remote database command is authorized.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;

create type public.organization_role as enum (
  'junior_officer',
  'publicity_director',
  'pro',
  'executive',
  'org_admin'
);

create type public.organization_membership_status as enum (
  'invited',
  'active',
  'suspended',
  'expired'
);

create type public.allowlist_entry_status as enum (
  'pending',
  'claimed',
  'revoked',
  'expired'
);

create type public.access_security_event_type as enum (
  'invitation_created',
  'invitation_revoked',
  'user_creation_allowed',
  'user_creation_denied',
  'membership_claimed',
  'membership_claim_denied',
  'membership_suspended',
  'membership_restored',
  'membership_expired',
  'role_granted',
  'role_revoked',
  'authentication_succeeded',
  'authentication_denied',
  'sign_out',
  'protected_access_denied',
  'security_block_cleared'
);

create type public.access_security_event_outcome as enum (
  'succeeded',
  'denied',
  'failed'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint organizations_display_name_length check (
    char_length(btrim(display_name)) between 1 and 120
  )
);

create table public.organization_identity_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  claim_name text not null default 'email',
  approved_email_domain text,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_requirements_provider_format check (
    provider ~ '^[a-z0-9_-]+$'
  ),
  constraint identity_requirements_claim_format check (
    claim_name ~ '^[a-z0-9_.-]+$'
  ),
  constraint identity_requirements_domain_normalized check (
    approved_email_domain is null
    or (
      approved_email_domain = lower(btrim(approved_email_domain))
      and approved_email_domain !~ '@'
      and approved_email_domain ~ '^[a-z0-9.-]+$'
    )
  ),
  unique (organization_id, provider, claim_name, approved_email_domain)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default 'Member',
  institutional_identifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    char_length(btrim(display_name)) between 1 and 120
  ),
  constraint profiles_institutional_identifier_length check (
    institutional_identifier is null
    or char_length(btrim(institutional_identifier)) between 1 and 120
  )
);

create table public.member_allowlist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  normalized_email text,
  identity_provider text,
  provider_subject text,
  status public.allowlist_entry_status not null default 'pending',
  initial_role public.organization_role not null default 'junior_officer',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_allowlist_identity_present check (
    normalized_email is not null
    or (identity_provider is not null and provider_subject is not null)
  ),
  constraint member_allowlist_email_normalized check (
    normalized_email is null
    or (
      normalized_email = lower(btrim(normalized_email))
      and normalized_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
    )
  ),
  constraint member_allowlist_subject_pair check (
    (identity_provider is null) = (provider_subject is null)
  ),
  constraint member_allowlist_valid_window check (
    valid_until is null or valid_until > valid_from
  ),
  constraint member_allowlist_claim_state check (
    (
      status = 'claimed'
      and claimed_by_user_id is not null
      and claimed_at is not null
    )
    or (
      status <> 'claimed'
      and claimed_by_user_id is null
      and claimed_at is null
    )
  ),
  constraint member_allowlist_revocation_state check (
    (
      status = 'revoked'
      and revoked_at is not null
      and char_length(btrim(revocation_reason)) between 1 and 500
    )
    or status <> 'revoked'
  )
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  allowlist_entry_id uuid not null unique references public.member_allowlist(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  normalized_email text,
  status public.organization_membership_status not null default 'invited',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  restored_by uuid references auth.users(id) on delete set null,
  restored_at timestamptz,
  expired_by uuid references auth.users(id) on delete set null,
  expired_at timestamptz,
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_valid_window check (
    valid_until is null or valid_until > valid_from
  ),
  constraint organization_memberships_identity_state check (
    (status = 'invited' and user_id is null)
    or (status <> 'invited' and user_id is not null)
  ),
  constraint organization_memberships_email_normalized check (
    normalized_email is null
    or normalized_email = lower(btrim(normalized_email))
  ),
  constraint organization_memberships_reason_length check (
    status_reason is null
    or char_length(btrim(status_reason)) between 1 and 500
  )
);

create table public.organization_role_assignments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role public.organization_role not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  constraint organization_role_assignments_valid_window check (
    ends_at is null or ends_at > starts_at
  ),
  constraint organization_role_assignments_revocation_state check (
    revoked_at is null or revoked_at >= starts_at
  ),
  constraint organization_role_assignments_reason_length check (
    reason is null or char_length(btrim(reason)) between 1 and 500
  )
);

create table public.access_security_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  membership_id uuid references public.organization_memberships(id) on delete set null,
  allowlist_entry_id uuid references public.member_allowlist(id) on delete set null,
  role_assignment_id uuid references public.organization_role_assignments(id) on delete set null,
  event_type public.access_security_event_type not null,
  outcome public.access_security_event_outcome not null,
  reason_code text not null,
  request_correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint access_security_events_reason_code_format check (
    reason_code ~ '^[a-z0-9_.-]+$'
  ),
  constraint access_security_events_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

create unique index member_allowlist_current_email_unique
  on public.member_allowlist (organization_id, normalized_email)
  where normalized_email is not null and status in ('pending', 'claimed');

create unique index member_allowlist_current_subject_unique
  on public.member_allowlist (organization_id, identity_provider, provider_subject)
  where provider_subject is not null and status in ('pending', 'claimed');

create unique index organization_memberships_user_organization_unique
  on public.organization_memberships (organization_id, user_id)
  where user_id is not null;

create unique index organization_role_assignments_current_unique
  on public.organization_role_assignments (membership_id, role)
  where revoked_at is null;

create index organization_memberships_user_status_idx
  on public.organization_memberships (user_id, status, valid_from, valid_until);

create index organization_memberships_organization_status_idx
  on public.organization_memberships (organization_id, status);

create index organization_role_assignments_membership_idx
  on public.organization_role_assignments (membership_id, starts_at, ends_at, revoked_at);

create index access_security_events_organization_time_idx
  on public.access_security_events (organization_id, occurred_at desc);

create index access_security_events_subject_time_idx
  on public.access_security_events (subject_user_id, occurred_at desc);

create or replace function private.normalize_email(p_email text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(btrim(p_email));
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger identity_requirements_set_updated_at
before update on public.organization_identity_requirements
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger member_allowlist_set_updated_at
before update on public.member_allowlist
for each row execute function private.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function private.set_updated_at();

create or replace function private.has_active_membership(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
  );
$$;

create or replace function private.has_any_active_membership()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
  );
$$;

create or replace function private.has_organization_role(
  p_organization_id uuid,
  p_role public.organization_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.organization_role_assignments role_assignment
      on role_assignment.membership_id = membership.id
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and role_assignment.role = p_role
      and role_assignment.starts_at <= now()
      and (role_assignment.ends_at is null or role_assignment.ends_at > now())
      and role_assignment.revoked_at is null
  );
$$;

create or replace function private.can_view_profile(p_profile_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    p_profile_user_id = (select auth.uid())
    and private.has_any_active_membership()
  ) or exists (
    select 1
    from public.organization_memberships target_membership
    where target_membership.user_id = p_profile_user_id
      and private.has_organization_role(
        target_membership.organization_id,
        'org_admin'
      )
  );
$$;

create or replace function private.can_view_membership(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.id = p_membership_id
      and (
        (
          membership.user_id = (select auth.uid())
          and private.has_active_membership(membership.organization_id)
        )
        or private.has_organization_role(
          membership.organization_id,
          'org_admin'
        )
      )
  );
$$;

create or replace function public.before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_allowlist public.member_allowlist%rowtype;
begin
  v_email := private.normalize_email(event -> 'user' ->> 'email');

  select entry.*
  into v_allowlist
  from public.member_allowlist entry
  where entry.normalized_email = v_email
    and entry.status = 'pending'
    and entry.valid_from <= now()
    and (entry.valid_until is null or entry.valid_until > now())
  order by entry.created_at
  limit 1;

  if v_allowlist.id is null then
    insert into public.access_security_events (
      event_type,
      outcome,
      reason_code,
      request_correlation_id
    ) values (
      'user_creation_denied',
      'denied',
      'identity_not_invited',
      coalesce(
        nullif(event -> 'metadata' ->> 'uuid', '')::uuid,
        gen_random_uuid()
      )
    );

    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Unable to create this account.'
      )
    );
  end if;

  insert into public.access_security_events (
    organization_id,
    allowlist_entry_id,
    event_type,
    outcome,
    reason_code,
    request_correlation_id
  ) values (
    v_allowlist.organization_id,
    v_allowlist.id,
    'user_creation_allowed',
    'succeeded',
    'active_allowlist_match',
    coalesce(
      nullif(event -> 'metadata' ->> 'uuid', '')::uuid,
      gen_random_uuid()
    )
  );

  return '{}'::jsonb;
exception
  when others then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Unable to create this account.'
      )
    );
end;
$$;

create or replace function public.claim_current_membership()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := private.normalize_email(auth.jwt() ->> 'email');
  v_allowlist public.member_allowlist%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_claim record;
  v_role_assignment_id uuid;
begin
  if v_user_id is null or v_email is null then
    return false;
  end if;

  select entry as allowlist, membership
  into v_claim
  from public.member_allowlist entry
  join public.organization_memberships membership
    on membership.allowlist_entry_id = entry.id
  where entry.normalized_email = v_email
    and entry.status = 'pending'
    and membership.status = 'invited'
    and entry.valid_from <= now()
    and (entry.valid_until is null or entry.valid_until > now())
  order by entry.created_at
  for update of entry, membership
  limit 1;

  v_allowlist := v_claim.allowlist;
  v_membership := v_claim.membership;

  if v_allowlist.id is null then
    insert into public.access_security_events (
      actor_user_id,
      subject_user_id,
      event_type,
      outcome,
      reason_code
    ) values (
      v_user_id,
      v_user_id,
      'membership_claim_denied',
      'denied',
      'no_current_invitation'
    );
    return false;
  end if;

  update public.member_allowlist
  set status = 'claimed',
      claimed_by_user_id = v_user_id,
      claimed_at = now()
  where id = v_allowlist.id;

  update public.organization_memberships
  set user_id = v_user_id,
      normalized_email = v_allowlist.normalized_email,
      status = 'active',
      activated_at = now(),
      status_reason = null
  where id = v_membership.id;

  insert into public.profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  insert into public.organization_role_assignments (
    membership_id,
    role,
    granted_by,
    reason
  ) values (
    v_membership.id,
    v_allowlist.initial_role,
    v_allowlist.created_by,
    'initial_invitation_role'
  )
  returning id into v_role_assignment_id;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    allowlist_entry_id,
    role_assignment_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_allowlist.organization_id,
    v_user_id,
    v_user_id,
    v_membership.id,
    v_allowlist.id,
    v_role_assignment_id,
    'membership_claimed',
    'succeeded',
    'invitation_claimed'
  );

  return true;
exception
  when unique_violation then
    insert into public.access_security_events (
      organization_id,
      actor_user_id,
      subject_user_id,
      event_type,
      outcome,
      reason_code
    ) values (
      v_allowlist.organization_id,
      v_user_id,
      v_user_id,
      'membership_claim_denied',
      'denied',
      'membership_already_bound'
    );
    return false;
end;
$$;

create or replace function public.get_current_membership_access()
returns table (
  membership_id uuid,
  organization_id uuid,
  membership_status public.organization_membership_status,
  valid_from timestamptz,
  valid_until timestamptz,
  roles public.organization_role[],
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.id,
    membership.organization_id,
    membership.status,
    membership.valid_from,
    membership.valid_until,
    coalesce(
      array_agg(role_assignment.role order by role_assignment.role)
        filter (
          where role_assignment.id is not null
            and role_assignment.starts_at <= now()
            and (role_assignment.ends_at is null or role_assignment.ends_at > now())
            and role_assignment.revoked_at is null
        ),
      '{}'::public.organization_role[]
    ),
    (
      membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
    )
  from public.organization_memberships membership
  left join public.organization_role_assignments role_assignment
    on role_assignment.membership_id = membership.id
  where membership.user_id = (select auth.uid())
  group by membership.id
  order by (
    membership.status = 'active'
    and membership.valid_from <= now()
    and (membership.valid_until is null or membership.valid_until > now())
  ) desc, membership.created_at;
$$;

create or replace function public.record_current_access_denied()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.organization_memberships%rowtype;
  v_reason_code text;
begin
  if v_user_id is null then
    return false;
  end if;

  select * into v_membership
  from public.organization_memberships
  where user_id = v_user_id
  order by created_at
  limit 1;

  v_reason_code := case
    when v_membership.id is null then 'no_organization_membership'
    when v_membership.status <> 'active' then 'membership_not_active'
    when v_membership.valid_from > now() then 'membership_not_yet_valid'
    when v_membership.valid_until is not null and v_membership.valid_until <= now()
      then 'membership_validity_expired'
    else 'access_not_granted'
  end;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_membership.organization_id,
    v_user_id,
    v_user_id,
    v_membership.id,
    'protected_access_denied',
    'denied',
    v_reason_code
  );

  return true;
end;
$$;

create or replace function public.record_current_sign_out()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.organization_memberships%rowtype;
begin
  if v_user_id is null then
    return false;
  end if;

  select * into v_membership
  from public.organization_memberships
  where user_id = v_user_id
  order by created_at
  limit 1;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_membership.organization_id,
    v_user_id,
    v_user_id,
    v_membership.id,
    'sign_out',
    'succeeded',
    'user_requested_sign_out'
  );

  return true;
end;
$$;

create or replace function public.create_member_invitation(
  p_organization_id uuid,
  p_email text,
  p_initial_role public.organization_role default 'junior_officer',
  p_valid_until timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_allowlist_id uuid;
  v_email text := private.normalize_email(p_email);
begin
  if not private.has_organization_role(p_organization_id, 'org_admin') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'invalid identity' using errcode = '22023';
  end if;

  if p_valid_until is not null and p_valid_until <= now() then
    raise exception 'invalid validity window' using errcode = '22023';
  end if;

  insert into public.member_allowlist (
    organization_id,
    normalized_email,
    initial_role,
    valid_until,
    created_by
  ) values (
    p_organization_id,
    v_email,
    p_initial_role,
    p_valid_until,
    v_actor
  )
  returning id into v_allowlist_id;

  insert into public.organization_memberships (
    organization_id,
    allowlist_entry_id,
    normalized_email,
    status,
    valid_until,
    invited_by
  ) values (
    p_organization_id,
    v_allowlist_id,
    v_email,
    'invited',
    p_valid_until,
    v_actor
  );

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    allowlist_entry_id,
    event_type,
    outcome,
    reason_code
  ) values (
    p_organization_id,
    v_actor,
    v_allowlist_id,
    'invitation_created',
    'succeeded',
    'organization_admin_invitation'
  );

  return v_allowlist_id;
end;
$$;

create or replace function public.set_membership_status(
  p_membership_id uuid,
  p_status public.organization_membership_status,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_membership public.organization_memberships%rowtype;
  v_event public.access_security_event_type;
begin
  select * into v_membership
  from public.organization_memberships
  where id = p_membership_id
  for update;

  if v_membership.id is null
    or not private.has_organization_role(v_membership.organization_id, 'org_admin') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if p_status not in ('active', 'suspended', 'expired')
    or p_reason is null
    or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'invalid status change' using errcode = '22023';
  end if;

  if v_membership.user_id is null then
    raise exception 'invited membership must be claimed first' using errcode = '22023';
  end if;

  update public.organization_memberships
  set status = p_status,
      status_reason = btrim(p_reason),
      suspended_by = case when p_status = 'suspended' then v_actor else suspended_by end,
      suspended_at = case when p_status = 'suspended' then now() else suspended_at end,
      restored_by = case when p_status = 'active' then v_actor else restored_by end,
      restored_at = case when p_status = 'active' then now() else restored_at end,
      expired_by = case when p_status = 'expired' then v_actor else expired_by end,
      expired_at = case when p_status = 'expired' then now() else expired_at end
  where id = p_membership_id;

  v_event := case p_status
    when 'active' then 'membership_restored'
    when 'suspended' then 'membership_suspended'
    else 'membership_expired'
  end;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_membership.organization_id,
    v_actor,
    v_membership.user_id,
    v_membership.id,
    v_event,
    'succeeded',
    'organization_admin_status_change'
  );

  return true;
end;
$$;

create or replace function public.grant_organization_role(
  p_membership_id uuid,
  p_role public.organization_role,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_membership public.organization_memberships%rowtype;
  v_role_assignment_id uuid;
begin
  select * into v_membership
  from public.organization_memberships
  where id = p_membership_id;

  if v_membership.id is null
    or not private.has_organization_role(v_membership.organization_id, 'org_admin') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if p_reason is null
    or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'invalid reason' using errcode = '22023';
  end if;

  insert into public.organization_role_assignments (
    membership_id,
    role,
    granted_by,
    reason
  ) values (
    p_membership_id,
    p_role,
    v_actor,
    btrim(p_reason)
  )
  returning id into v_role_assignment_id;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    role_assignment_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_membership.organization_id,
    v_actor,
    v_membership.user_id,
    v_membership.id,
    v_role_assignment_id,
    'role_granted',
    'succeeded',
    'organization_admin_role_grant'
  );

  return v_role_assignment_id;
end;
$$;

create or replace function public.revoke_organization_role(
  p_role_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.organization_role_assignments%rowtype;
  v_membership public.organization_memberships%rowtype;
begin
  select * into v_role
  from public.organization_role_assignments
  where id = p_role_assignment_id
  for update;

  select * into v_membership
  from public.organization_memberships
  where id = v_role.membership_id;

  if v_role.id is null
    or v_role.revoked_at is not null
    or not private.has_organization_role(v_membership.organization_id, 'org_admin') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if p_reason is null
    or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'invalid reason' using errcode = '22023';
  end if;

  update public.organization_role_assignments
  set revoked_by = v_actor,
      revoked_at = now(),
      reason = btrim(p_reason)
  where id = p_role_assignment_id;

  insert into public.access_security_events (
    organization_id,
    actor_user_id,
    subject_user_id,
    membership_id,
    role_assignment_id,
    event_type,
    outcome,
    reason_code
  ) values (
    v_membership.organization_id,
    v_actor,
    v_membership.user_id,
    v_membership.id,
    v_role.id,
    'role_revoked',
    'succeeded',
    'organization_admin_role_revocation'
  );

  return true;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_identity_requirements enable row level security;
alter table public.profiles enable row level security;
alter table public.member_allowlist enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_role_assignments enable row level security;
alter table public.access_security_events enable row level security;

create policy organizations_select_active_membership
on public.organizations
for select
to authenticated
using (private.has_active_membership(id));

create policy identity_requirements_select_org_admin
on public.organization_identity_requirements
for select
to authenticated
using (private.has_organization_role(organization_id, 'org_admin'));

create policy profiles_select_authorized
on public.profiles
for select
to authenticated
using (private.can_view_profile(user_id));

create policy member_allowlist_select_org_admin
on public.member_allowlist
for select
to authenticated
using (private.has_organization_role(organization_id, 'org_admin'));

create policy organization_memberships_select_authorized
on public.organization_memberships
for select
to authenticated
using (private.can_view_membership(id));

create policy organization_role_assignments_select_authorized
on public.organization_role_assignments
for select
to authenticated
using (private.can_view_membership(membership_id));

revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_identity_requirements from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.member_allowlist from anon, authenticated;
revoke all on public.organization_memberships from anon, authenticated;
revoke all on public.organization_role_assignments from anon, authenticated;
revoke all on public.access_security_events from anon, authenticated;

grant select on public.organizations to authenticated;
grant select on public.organization_identity_requirements to authenticated;
grant select on public.profiles to authenticated;
grant select on public.member_allowlist to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.organization_role_assignments to authenticated;

grant usage on schema private to authenticated;
revoke all on function private.normalize_email(text) from public, anon, authenticated;
revoke all on function private.has_active_membership(uuid) from public, anon, authenticated;
revoke all on function private.has_any_active_membership() from public, anon, authenticated;
revoke all on function private.has_organization_role(uuid, public.organization_role) from public, anon, authenticated;
revoke all on function private.can_view_profile(uuid) from public, anon, authenticated;
revoke all on function private.can_view_membership(uuid) from public, anon, authenticated;

grant execute on function private.has_active_membership(uuid) to authenticated;
grant execute on function private.has_any_active_membership() to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.can_view_membership(uuid) to authenticated;

revoke all on function public.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;

revoke all on function public.claim_current_membership() from public, anon;
revoke all on function public.get_current_membership_access() from public, anon;
revoke all on function public.record_current_access_denied() from public, anon;
revoke all on function public.record_current_sign_out() from public, anon;
revoke all on function public.create_member_invitation(uuid, text, public.organization_role, timestamptz) from public, anon;
revoke all on function public.set_membership_status(uuid, public.organization_membership_status, text) from public, anon;
revoke all on function public.grant_organization_role(uuid, public.organization_role, text) from public, anon;
revoke all on function public.revoke_organization_role(uuid, text) from public, anon;

grant execute on function public.claim_current_membership() to authenticated;
grant execute on function public.get_current_membership_access() to authenticated;
grant execute on function public.record_current_access_denied() to authenticated;
grant execute on function public.record_current_sign_out() to authenticated;
grant execute on function public.create_member_invitation(uuid, text, public.organization_role, timestamptz) to authenticated;
grant execute on function public.set_membership_status(uuid, public.organization_membership_status, text) to authenticated;
grant execute on function public.grant_organization_role(uuid, public.organization_role, text) to authenticated;
grant execute on function public.revoke_organization_role(uuid, text) to authenticated;

comment on function public.before_user_created(jsonb) is
  'Hosted Supabase Before User Created hook. Allows only exact active allowlist identities.';

comment on table public.access_security_events is
  'Append-only authentication and membership security evidence. No browser role has table access.';
