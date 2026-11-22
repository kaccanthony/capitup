-- Phase 03: organization-scoped projects, assignments, and content records.
-- Additive migration: it preserves Phase 02 data and adds no publication
-- channels while O-009 remains unresolved. Apply only to an authorized,
-- isolated development project after reviewing the pending Phase 02 migration.

create extension if not exists btree_gist with schema extensions;

create type public.project_assignment_role as enum (
  'publicity_head',
  'co_project_head',
  'project_head',
  'writer',
  'viewer'
);

create type public.content_responsibility as enum (
  'writer',
  'reviewer'
);

create type public.content_status as enum (
  'draft',
  'in_review',
  'changes_requested',
  'awaiting_final_approval',
  'approved',
  'scheduled',
  'published',
  'archived'
);

create type public.project_content_event_type as enum (
  'project_created',
  'project_updated',
  'project_assignment_granted',
  'project_assignment_revoked',
  'content_created',
  'content_updated',
  'content_special_case_changed',
  'content_responsibility_granted',
  'content_responsibility_revoked',
  'deliverable_created',
  'deliverable_updated',
  'deliverable_deleted'
);

alter table public.organization_memberships
  add constraint organization_memberships_id_organization_unique
  unique (id, organization_id);

create table public.content_formats (
  id smallint primary key,
  slug text not null unique,
  display_label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_formats_slug_allowed check (slug in ('post', 'video', 'article')),
  constraint content_formats_display_label_length check (
    char_length(btrim(display_label)) between 1 and 40
  )
);

create table public.content_tags (
  id smallint primary key,
  slug text not null unique,
  display_label text not null,
  emoji text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_tags_slug_format check (slug ~ '^[A-Z0-9_]+$'),
  constraint content_tags_display_label_length check (
    char_length(btrim(display_label)) between 1 and 40
  ),
  constraint content_tags_emoji_length check (
    char_length(btrim(emoji)) between 1 and 16
  )
);

create table public.content_format_tags (
  content_format_id smallint not null references public.content_formats(id) on delete restrict,
  content_tag_id smallint not null references public.content_tags(id) on delete restrict,
  primary key (content_format_id, content_tag_id)
);

insert into public.content_formats (id, slug, display_label) values
  (1, 'post', 'Post'),
  (2, 'video', 'Video'),
  (3, 'article', 'Article');

insert into public.content_tags (id, slug, display_label, emoji) values
  (1, 'GENERAL', 'General', '📄'),
  (2, 'ANNOUNCEMENT', 'Announcement', '📢'),
  (3, 'EVENT', 'Event', '📰'),
  (4, 'STORY', 'Story', '🖼️'),
  (5, 'VIDEO', 'Video', '📽️'),
  (6, 'AVP', 'AVP', '🎥'),
  (7, 'REEL', 'Reel', '🎥'),
  (8, 'BIRTHDAY', 'Birthday', '🎂'),
  (9, 'BRANDING', 'Branding', '🗞️'),
  (10, 'HN', 'HN', '‼️'),
  (11, 'HOLIDAY', 'Holiday', '🗓️');

insert into public.content_format_tags (content_format_id, content_tag_id) values
  (1, 1), (1, 8), (1, 2), (1, 3), (1, 9), (1, 4), (1, 10), (1, 11),
  (2, 5), (2, 6), (2, 7),
  (3, 1), (3, 2), (3, 3), (3, 4);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null,
  description text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  record_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_length check (
    title = btrim(title) and char_length(title) between 1 and 160
  ),
  constraint projects_description_length check (
    description is null
    or (description = btrim(description) and char_length(description) between 1 and 2000)
  ),
  constraint projects_record_version_positive check (record_version > 0),
  unique (id, organization_id)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  membership_id uuid not null,
  role public.project_assignment_role not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by_user_id uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  revocation_reason text,
  created_at timestamptz not null default now(),
  constraint project_assignments_project_organization_fk
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  constraint project_assignments_membership_organization_fk
    foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete restrict,
  constraint project_assignments_window check (
    ends_at is null or ends_at > starts_at
  ),
  constraint project_assignments_revocation_state check (
    (
      revoked_at is null
      and revoked_by_user_id is null
      and revocation_reason is null
    )
    or (
      revoked_at is not null
      and revoked_at >= starts_at
      and revoked_by_user_id is not null
      and char_length(btrim(revocation_reason)) between 1 and 500
    )
  ),
  constraint project_assignments_no_overlapping_role
    exclude using gist (
      project_id with =,
      membership_id with =,
      role with =,
      tstzrange(
        starts_at,
        coalesce(least(ends_at, revoked_at), 'infinity'::timestamptz),
        '[)'
      ) with &&
    ),
  unique (id, project_id)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  content_format_id smallint not null references public.content_formats(id) on delete restrict,
  title text not null,
  status public.content_status not null default 'draft',
  is_special_case boolean not null default false,
  special_case_reason text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  record_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_project_organization_fk
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  constraint content_items_title_length check (
    title = btrim(title) and char_length(title) between 1 and 200
  ),
  constraint content_items_special_case_state check (
    (not is_special_case and special_case_reason is null)
    or (
      is_special_case
      and char_length(btrim(special_case_reason)) between 1 and 500
    )
  ),
  constraint content_items_record_version_positive check (record_version > 0),
  unique (id, project_id),
  unique (id, organization_id),
  unique (id, content_format_id)
);

create table public.content_item_tags (
  content_item_id uuid not null,
  content_format_id smallint not null,
  content_tag_id smallint not null,
  primary key (content_item_id, content_tag_id),
  constraint content_item_tags_item_format_fk
    foreign key (content_item_id, content_format_id)
    references public.content_items(id, content_format_id) on delete cascade,
  constraint content_item_tags_allowed_pair_fk
    foreign key (content_format_id, content_tag_id)
    references public.content_format_tags(content_format_id, content_tag_id) on delete restrict
);

create table public.publication_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  slug text not null,
  display_label text not null,
  active boolean not null default true,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_channels_slug_format check (
    slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint publication_channels_display_label_length check (
    char_length(btrim(display_label)) between 1 and 80
  ),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create table public.content_publication_channels (
  content_item_id uuid not null,
  publication_channel_id uuid not null,
  organization_id uuid not null,
  primary key (content_item_id, publication_channel_id),
  constraint content_publication_channels_item_organization_fk
    foreign key (content_item_id, organization_id)
    references public.content_items(id, organization_id) on delete cascade,
  constraint content_publication_channels_channel_organization_fk
    foreign key (publication_channel_id, organization_id)
    references public.publication_channels(id, organization_id) on delete restrict
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  content_item_id uuid not null,
  label text not null,
  url text not null,
  source_committee text not null,
  deliverable_type text not null,
  status text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  record_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliverables_content_project_fk
    foreign key (content_item_id, project_id)
    references public.content_items(id, project_id) on delete cascade,
  constraint deliverables_content_organization_fk
    foreign key (content_item_id, organization_id)
    references public.content_items(id, organization_id) on delete cascade,
  constraint deliverables_label_length check (
    label = btrim(label) and char_length(label) between 1 and 120
  ),
  constraint deliverables_url_safe_http check (
    char_length(url) between 8 and 2048
    and url ~* '^https?://'
    and url !~* '^https?://[^/]*@'
  ),
  constraint deliverables_source_committee_length check (
    source_committee = btrim(source_committee)
    and char_length(source_committee) between 1 and 120
  ),
  constraint deliverables_type_length check (
    deliverable_type = btrim(deliverable_type)
    and char_length(deliverable_type) between 1 and 80
  ),
  constraint deliverables_status_length check (
    status is null or char_length(btrim(status)) between 1 and 80
  ),
  constraint deliverables_record_version_positive check (record_version > 0)
);

create table public.content_item_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  content_item_id uuid not null,
  project_assignment_id uuid not null,
  responsibility public.content_responsibility not null,
  assigned_by_user_id uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  revocation_reason text,
  constraint content_item_assignments_content_project_fk
    foreign key (content_item_id, project_id)
    references public.content_items(id, project_id) on delete cascade,
  constraint content_item_assignments_project_assignment_fk
    foreign key (project_assignment_id, project_id)
    references public.project_assignments(id, project_id) on delete restrict,
  constraint content_item_assignments_revocation_state check (
    (
      revoked_at is null
      and revoked_by_user_id is null
      and revocation_reason is null
    )
    or (
      revoked_at is not null
      and revoked_at >= assigned_at
      and revoked_by_user_id is not null
      and char_length(btrim(revocation_reason)) between 1 and 500
    )
  ),
  constraint content_item_assignments_no_overlapping_responsibility
    exclude using gist (
      content_item_id with =,
      project_assignment_id with =,
      responsibility with =,
      tstzrange(assigned_at, coalesce(revoked_at, 'infinity'::timestamptz), '[)') with &&
    )
);

create table public.project_content_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  project_assignment_id uuid references public.project_assignments(id) on delete set null,
  content_assignment_id uuid references public.content_item_assignments(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  event_type public.project_content_event_type not null,
  outcome public.access_security_event_outcome not null default 'succeeded',
  reason_code text not null,
  request_correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint project_content_audit_reason_code_format check (
    reason_code ~ '^[a-z0-9_.-]+$'
  ),
  constraint project_content_audit_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index projects_organization_updated_idx
  on public.projects (organization_id, updated_at desc);
create index project_assignments_membership_window_idx
  on public.project_assignments (membership_id, starts_at, ends_at, revoked_at);
create index project_assignments_project_window_idx
  on public.project_assignments (project_id, starts_at, ends_at, revoked_at);
create index content_items_project_updated_idx
  on public.content_items (project_id, updated_at desc);
create index content_items_organization_status_idx
  on public.content_items (organization_id, status, updated_at desc);
create index content_item_assignments_project_assignment_idx
  on public.content_item_assignments (project_assignment_id, assigned_at, revoked_at);
create index deliverables_content_item_idx
  on public.deliverables (content_item_id, updated_at desc);
create index project_content_audit_project_time_idx
  on public.project_content_audit_events (project_id, occurred_at desc);
create index project_content_audit_content_time_idx
  on public.project_content_audit_events (content_item_id, occurred_at desc);

create trigger content_formats_set_updated_at
before update on public.content_formats
for each row execute function private.set_updated_at();

create trigger content_tags_set_updated_at
before update on public.content_tags
for each row execute function private.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function private.set_updated_at();

create trigger publication_channels_set_updated_at
before update on public.publication_channels
for each row execute function private.set_updated_at();

create trigger deliverables_set_updated_at
before update on public.deliverables
for each row execute function private.set_updated_at();

create or replace function private.current_membership_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.id
  from public.organization_memberships membership
  where membership.organization_id = p_organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.valid_from <= now()
    and (membership.valid_until is null or membership.valid_until > now())
  limit 1;
$$;

create or replace function private.membership_has_role(
  p_membership_id uuid,
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
    where membership.id = p_membership_id
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and role_assignment.role = p_role
      and role_assignment.starts_at <= now()
      and (role_assignment.ends_at is null or role_assignment.ends_at > now())
      and role_assignment.revoked_at is null
  );
$$;

create or replace function private.is_current_project_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_assignments assignment
    join public.organization_memberships membership on membership.id = assignment.membership_id
    where assignment.id = p_assignment_id
      and assignment.starts_at <= now()
      and (assignment.ends_at is null or assignment.ends_at > now())
      and assignment.revoked_at is null
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
  );
$$;

create or replace function private.can_administer_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and (
        private.has_organization_role(project.organization_id, 'publicity_director')
        or private.has_organization_role(project.organization_id, 'org_admin')
      )
  );
$$;

create or replace function private.can_view_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and private.has_active_membership(project.organization_id)
      and (
        private.can_administer_project(project.id)
        or exists (
          select 1
          from public.project_assignments assignment
          where assignment.project_id = project.id
            and assignment.membership_id = private.current_membership_id(project.organization_id)
            and assignment.starts_at <= now()
            and (assignment.ends_at is null or assignment.ends_at > now())
            and assignment.revoked_at is null
        )
      )
  );
$$;

create or replace function private.can_create_content(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    join public.project_assignments assignment
      on assignment.project_id = project.id
     and assignment.membership_id = private.current_membership_id(project.organization_id)
    where project.id = p_project_id
      and assignment.role <> 'viewer'
      and assignment.starts_at <= now()
      and (assignment.ends_at is null or assignment.ends_at > now())
      and assignment.revoked_at is null
      and (
        private.has_organization_role(project.organization_id, 'junior_officer')
        or private.has_organization_role(project.organization_id, 'publicity_director')
        or private.has_organization_role(project.organization_id, 'pro')
        or (
          private.has_organization_role(project.organization_id, 'executive')
          and assignment.role in ('publicity_head', 'co_project_head', 'project_head')
        )
      )
  );
$$;

create or replace function private.can_edit_content(p_content_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_items item
    join public.content_item_assignments content_assignment
      on content_assignment.content_item_id = item.id
     and content_assignment.responsibility = 'writer'
     and content_assignment.revoked_at is null
    join public.project_assignments project_assignment
      on project_assignment.id = content_assignment.project_assignment_id
     and project_assignment.membership_id = private.current_membership_id(item.organization_id)
    where item.id = p_content_item_id
      and private.is_current_project_assignment(project_assignment.id)
      and (
        private.has_organization_role(item.organization_id, 'junior_officer')
        or private.has_organization_role(item.organization_id, 'publicity_director')
        or private.has_organization_role(item.organization_id, 'pro')
        or (
          private.has_organization_role(item.organization_id, 'executive')
          and project_assignment.role in ('publicity_head', 'co_project_head', 'project_head')
        )
      )
  );
$$;

create or replace function private.can_view_content_item(p_content_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.content_items item
    where item.id = p_content_item_id
      and private.can_view_project(item.project_id)
  );
$$;

create or replace function public.create_project(
  p_organization_id uuid,
  p_title text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_project_id uuid;
begin
  if v_actor is null or not (
    private.has_organization_role(p_organization_id, 'publicity_director')
    or private.has_organization_role(p_organization_id, 'org_admin')
  ) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  insert into public.projects (
    organization_id, title, description, created_by_user_id
  ) values (
    p_organization_id,
    btrim(p_title),
    nullif(btrim(p_description), ''),
    v_actor
  ) returning id into v_project_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, event_type, reason_code
  ) values (
    p_organization_id, v_actor, v_project_id, 'project_created', 'authorized_project_creation'
  );

  return v_project_id;
end;
$$;

create or replace function public.update_project(
  p_project_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id for update;

  if v_project.id is null or not private.can_administer_project(v_project.id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_project.record_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
  end if;

  update public.projects
  set title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      record_version = record_version + 1
  where id = p_project_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, event_type, reason_code,
    metadata
  ) values (
    v_project.organization_id, v_actor, v_project.id, 'project_updated',
    'authorized_project_update',
    jsonb_build_object('previous_record_version', v_project.record_version)
  );

  return true;
end;
$$;

create or replace function public.assign_project_member(
  p_project_id uuid,
  p_membership_id uuid,
  p_role public.project_assignment_role,
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_project public.projects%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_assignment_id uuid;
begin
  select * into v_project from public.projects where id = p_project_id;
  select * into v_membership from public.organization_memberships where id = p_membership_id;

  if v_project.id is null
    or not private.can_administer_project(v_project.id)
    or v_membership.id is null
    or v_membership.organization_id <> v_project.organization_id
    or v_membership.status <> 'active'
    or v_membership.valid_from > now()
    or (v_membership.valid_until is not null and v_membership.valid_until <= now()) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  insert into public.project_assignments (
    organization_id, project_id, membership_id, role, starts_at, ends_at,
    assigned_by_user_id
  ) values (
    v_project.organization_id, v_project.id, v_membership.id, p_role,
    p_starts_at, p_ends_at, v_actor
  ) returning id into v_assignment_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, project_assignment_id,
    event_type, reason_code, metadata
  ) values (
    v_project.organization_id, v_actor, v_project.id, v_assignment_id,
    'project_assignment_granted', 'authorized_project_assignment',
    jsonb_build_object('role', p_role)
  );

  return v_assignment_id;
end;
$$;

create or replace function public.revoke_project_assignment(
  p_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_assignment public.project_assignments%rowtype;
begin
  select * into v_assignment
  from public.project_assignments
  where id = p_assignment_id
  for update;

  if v_assignment.id is null
    or v_assignment.revoked_at is not null
    or not private.can_administer_project(v_assignment.project_id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'invalid reason' using errcode = '22023';
  end if;

  update public.project_assignments
  set revoked_at = now(),
      revoked_by_user_id = v_actor,
      revocation_reason = btrim(p_reason)
  where id = v_assignment.id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, project_assignment_id,
    event_type, reason_code
  ) values (
    v_assignment.organization_id, v_actor, v_assignment.project_id,
    v_assignment.id, 'project_assignment_revoked',
    'authorized_project_assignment_revocation'
  );

  return true;
end;
$$;

create or replace function public.create_content_item(
  p_project_id uuid,
  p_title text,
  p_format_slug text,
  p_tag_slugs text[],
  p_is_special_case boolean default false,
  p_special_case_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_project public.projects%rowtype;
  v_format public.content_formats%rowtype;
  v_assignment public.project_assignments%rowtype;
  v_content_item_id uuid;
  v_content_assignment_id uuid;
  v_tag_count integer;
begin
  select * into v_project from public.projects where id = p_project_id;
  select * into v_format
  from public.content_formats
  where slug = p_format_slug and active;

  if v_project.id is null or not private.can_create_content(v_project.id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_format.id is null
    or coalesce(cardinality(p_tag_slugs), 0) = 0
    or cardinality(p_tag_slugs) <> (
      select count(distinct tag_slug) from unnest(p_tag_slugs) as tag_slug
    ) then
    raise exception 'invalid content taxonomy' using errcode = '22023';
  end if;

  select count(*) into v_tag_count
  from public.content_format_tags format_tag
  join public.content_tags tag on tag.id = format_tag.content_tag_id
  where format_tag.content_format_id = v_format.id
    and tag.active
    and tag.slug = any(p_tag_slugs);

  if v_tag_count <> cardinality(p_tag_slugs) then
    raise exception 'invalid content taxonomy' using errcode = '22023';
  end if;

  select assignment.* into v_assignment
  from public.project_assignments assignment
  where assignment.project_id = v_project.id
    and assignment.membership_id = private.current_membership_id(v_project.organization_id)
    and assignment.role <> 'viewer'
    and assignment.starts_at <= now()
    and (assignment.ends_at is null or assignment.ends_at > now())
    and assignment.revoked_at is null
  order by case assignment.role when 'writer' then 0 else 1 end, assignment.created_at
  limit 1;

  insert into public.content_items (
    organization_id, project_id, content_format_id, title, is_special_case,
    special_case_reason, created_by_user_id
  ) values (
    v_project.organization_id, v_project.id, v_format.id, btrim(p_title),
    p_is_special_case,
    case when p_is_special_case then nullif(btrim(p_special_case_reason), '') else null end,
    v_actor
  ) returning id into v_content_item_id;

  insert into public.content_item_tags (
    content_item_id, content_format_id, content_tag_id
  )
  select v_content_item_id, v_format.id, tag.id
  from public.content_tags tag
  where tag.slug = any(p_tag_slugs);

  insert into public.content_item_assignments (
    project_id, content_item_id, project_assignment_id, responsibility,
    assigned_by_user_id
  ) values (
    v_project.id, v_content_item_id, v_assignment.id, 'writer', v_actor
  ) returning id into v_content_assignment_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, content_item_id,
    content_assignment_id, event_type, reason_code,
    metadata
  ) values (
    v_project.organization_id, v_actor, v_project.id, v_content_item_id,
    v_content_assignment_id, 'content_created', 'authorized_content_creation',
    jsonb_build_object('format', v_format.slug, 'tags', p_tag_slugs)
  );

  return v_content_item_id;
end;
$$;

create or replace function public.update_content_metadata(
  p_content_item_id uuid,
  p_expected_version integer,
  p_title text,
  p_format_slug text,
  p_tag_slugs text[],
  p_is_special_case boolean,
  p_special_case_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_format public.content_formats%rowtype;
  v_tag_count integer;
  v_special_case_reason text;
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;
  select * into v_format
  from public.content_formats
  where slug = p_format_slug and active;

  if v_item.id is null or not private.can_edit_content(v_item.id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_item.record_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
  end if;

  if v_item.status <> 'draft' then
    raise exception 'workflow-owned status' using errcode = '42501';
  end if;

  if v_format.id is null
    or coalesce(cardinality(p_tag_slugs), 0) = 0
    or cardinality(p_tag_slugs) <> (
      select count(distinct tag_slug) from unnest(p_tag_slugs) as tag_slug
    ) then
    raise exception 'invalid content taxonomy' using errcode = '22023';
  end if;

  select count(*) into v_tag_count
  from public.content_format_tags format_tag
  join public.content_tags tag on tag.id = format_tag.content_tag_id
  where format_tag.content_format_id = v_format.id
    and tag.active
    and tag.slug = any(p_tag_slugs);

  if v_tag_count <> cardinality(p_tag_slugs) then
    raise exception 'invalid content taxonomy' using errcode = '22023';
  end if;

  v_special_case_reason := case
    when p_is_special_case then nullif(btrim(p_special_case_reason), '')
    else null
  end;

  delete from public.content_item_tags where content_item_id = v_item.id;

  update public.content_items
  set title = btrim(p_title),
      content_format_id = v_format.id,
      is_special_case = p_is_special_case,
      special_case_reason = v_special_case_reason,
      record_version = record_version + 1
  where id = v_item.id;

  insert into public.content_item_tags (
    content_item_id, content_format_id, content_tag_id
  )
  select v_item.id, v_format.id, tag.id
  from public.content_tags tag
  where tag.slug = any(p_tag_slugs);

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, content_item_id,
    event_type, reason_code, metadata
  ) values (
    v_item.organization_id, v_actor, v_item.project_id, v_item.id,
    'content_updated', 'authorized_content_metadata_update',
    jsonb_build_object('previous_record_version', v_item.record_version)
  );

  if v_item.is_special_case is distinct from p_is_special_case
    or v_item.special_case_reason is distinct from v_special_case_reason then
    insert into public.project_content_audit_events (
      organization_id, actor_user_id, project_id, content_item_id,
      event_type, reason_code,
      metadata
    ) values (
      v_item.organization_id, v_actor, v_item.project_id, v_item.id,
      'content_special_case_changed', 'descriptive_special_case_change',
      jsonb_build_object('is_special_case', p_is_special_case)
    );
  end if;

  return true;
end;
$$;

create or replace function public.assign_content_responsibility(
  p_content_item_id uuid,
  p_project_assignment_id uuid,
  p_responsibility public.content_responsibility
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_project_assignment public.project_assignments%rowtype;
  v_content_assignment_id uuid;
begin
  select * into v_item from public.content_items where id = p_content_item_id;
  select * into v_project_assignment
  from public.project_assignments
  where id = p_project_assignment_id;

  if v_item.id is null
    or not private.can_administer_project(v_item.project_id)
    or v_project_assignment.id is null
    or v_project_assignment.project_id <> v_item.project_id
    or v_project_assignment.role = 'viewer'
    or not private.is_current_project_assignment(v_project_assignment.id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if private.membership_has_role(v_project_assignment.membership_id, 'executive')
    and not (
      private.membership_has_role(v_project_assignment.membership_id, 'junior_officer')
      or private.membership_has_role(v_project_assignment.membership_id, 'publicity_director')
      or private.membership_has_role(v_project_assignment.membership_id, 'pro')
      or v_project_assignment.role in ('publicity_head', 'co_project_head', 'project_head')
    ) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  insert into public.content_item_assignments (
    project_id, content_item_id, project_assignment_id, responsibility,
    assigned_by_user_id
  ) values (
    v_item.project_id, v_item.id, v_project_assignment.id, p_responsibility,
    v_actor
  ) returning id into v_content_assignment_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, content_item_id,
    content_assignment_id, event_type, reason_code,
    metadata
  ) values (
    v_item.organization_id, v_actor, v_item.project_id, v_item.id,
    v_content_assignment_id, 'content_responsibility_granted',
    'authorized_content_responsibility',
    jsonb_build_object('responsibility', p_responsibility)
  );

  return v_content_assignment_id;
end;
$$;

create or replace function public.revoke_content_responsibility(
  p_content_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_assignment public.content_item_assignments%rowtype;
  v_item public.content_items%rowtype;
begin
  select * into v_assignment
  from public.content_item_assignments
  where id = p_content_assignment_id
  for update;
  select * into v_item from public.content_items where id = v_assignment.content_item_id;

  if v_assignment.id is null
    or v_assignment.revoked_at is not null
    or not private.can_administer_project(v_item.project_id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'invalid reason' using errcode = '22023';
  end if;

  update public.content_item_assignments
  set revoked_at = now(),
      revoked_by_user_id = v_actor,
      revocation_reason = btrim(p_reason)
  where id = v_assignment.id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, content_item_id,
    content_assignment_id, event_type, reason_code
  ) values (
    v_item.organization_id, v_actor, v_item.project_id, v_item.id,
    v_assignment.id, 'content_responsibility_revoked',
    'authorized_content_responsibility_revocation'
  );

  return true;
end;
$$;

create or replace function public.add_deliverable(
  p_content_item_id uuid,
  p_label text,
  p_url text,
  p_source_committee text,
  p_deliverable_type text,
  p_status text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_deliverable_id uuid;
begin
  select * into v_item from public.content_items where id = p_content_item_id;

  if v_item.id is null or not private.can_edit_content(v_item.id) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  insert into public.deliverables (
    organization_id, project_id, content_item_id, label, url,
    source_committee, deliverable_type, status, created_by_user_id
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, btrim(p_label),
    btrim(p_url), btrim(p_source_committee), btrim(p_deliverable_type),
    nullif(btrim(p_status), ''), v_actor
  ) returning id into v_deliverable_id;

  insert into public.project_content_audit_events (
    organization_id, actor_user_id, project_id, content_item_id,
    deliverable_id, event_type, reason_code
  ) values (
    v_item.organization_id, v_actor, v_item.project_id, v_item.id,
    v_deliverable_id, 'deliverable_created', 'authorized_deliverable_creation'
  );

  return v_deliverable_id;
end;
$$;

alter table public.content_formats enable row level security;
alter table public.content_tags enable row level security;
alter table public.content_format_tags enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.content_items enable row level security;
alter table public.content_item_tags enable row level security;
alter table public.publication_channels enable row level security;
alter table public.content_publication_channels enable row level security;
alter table public.deliverables enable row level security;
alter table public.content_item_assignments enable row level security;
alter table public.project_content_audit_events enable row level security;

create policy content_formats_select_active_member
on public.content_formats for select to authenticated
using (private.has_any_active_membership());

create policy content_tags_select_active_member
on public.content_tags for select to authenticated
using (private.has_any_active_membership());

create policy content_format_tags_select_active_member
on public.content_format_tags for select to authenticated
using (private.has_any_active_membership());

create policy projects_select_authorized
on public.projects for select to authenticated
using (private.can_view_project(id));

create policy project_assignments_select_authorized
on public.project_assignments for select to authenticated
using (
  private.can_administer_project(project_id)
  or membership_id = private.current_membership_id(organization_id)
);

create policy content_items_select_authorized
on public.content_items for select to authenticated
using (private.can_view_project(project_id));

create policy content_item_tags_select_authorized
on public.content_item_tags for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy publication_channels_select_active_member
on public.publication_channels for select to authenticated
using (private.has_active_membership(organization_id));

create policy content_publication_channels_select_authorized
on public.content_publication_channels for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy deliverables_select_authorized
on public.deliverables for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy content_item_assignments_select_authorized
on public.content_item_assignments for select to authenticated
using (private.can_view_content_item(content_item_id));

revoke all on public.content_formats from anon, authenticated;
revoke all on public.content_tags from anon, authenticated;
revoke all on public.content_format_tags from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.project_assignments from anon, authenticated;
revoke all on public.content_items from anon, authenticated;
revoke all on public.content_item_tags from anon, authenticated;
revoke all on public.publication_channels from anon, authenticated;
revoke all on public.content_publication_channels from anon, authenticated;
revoke all on public.deliverables from anon, authenticated;
revoke all on public.content_item_assignments from anon, authenticated;
revoke all on public.project_content_audit_events from anon, authenticated;

grant select on public.content_formats to authenticated;
grant select on public.content_tags to authenticated;
grant select on public.content_format_tags to authenticated;
grant select on public.projects to authenticated;
grant select on public.project_assignments to authenticated;
grant select on public.content_items to authenticated;
grant select on public.content_item_tags to authenticated;
grant select on public.publication_channels to authenticated;
grant select on public.content_publication_channels to authenticated;
grant select on public.deliverables to authenticated;
grant select on public.content_item_assignments to authenticated;

revoke all on function private.current_membership_id(uuid) from public, anon, authenticated;
revoke all on function private.membership_has_role(uuid, public.organization_role) from public, anon, authenticated;
revoke all on function private.is_current_project_assignment(uuid) from public, anon, authenticated;
revoke all on function private.can_administer_project(uuid) from public, anon, authenticated;
revoke all on function private.can_view_project(uuid) from public, anon, authenticated;
revoke all on function private.can_create_content(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_content(uuid) from public, anon, authenticated;
revoke all on function private.can_view_content_item(uuid) from public, anon, authenticated;

grant execute on function private.current_membership_id(uuid) to authenticated;
grant execute on function private.membership_has_role(uuid, public.organization_role) to authenticated;
grant execute on function private.is_current_project_assignment(uuid) to authenticated;
grant execute on function private.can_administer_project(uuid) to authenticated;
grant execute on function private.can_view_project(uuid) to authenticated;
grant execute on function private.can_create_content(uuid) to authenticated;
grant execute on function private.can_edit_content(uuid) to authenticated;
grant execute on function private.can_view_content_item(uuid) to authenticated;

revoke all on function public.create_project(uuid, text, text) from public, anon;
revoke all on function public.update_project(uuid, integer, text, text) from public, anon;
revoke all on function public.assign_project_member(uuid, uuid, public.project_assignment_role, timestamptz, timestamptz) from public, anon;
revoke all on function public.revoke_project_assignment(uuid, text) from public, anon;
revoke all on function public.create_content_item(uuid, text, text, text[], boolean, text) from public, anon;
revoke all on function public.update_content_metadata(uuid, integer, text, text, text[], boolean, text) from public, anon;
revoke all on function public.assign_content_responsibility(uuid, uuid, public.content_responsibility) from public, anon;
revoke all on function public.revoke_content_responsibility(uuid, text) from public, anon;
revoke all on function public.add_deliverable(uuid, text, text, text, text, text) from public, anon;

grant execute on function public.create_project(uuid, text, text) to authenticated;
grant execute on function public.update_project(uuid, integer, text, text) to authenticated;
grant execute on function public.assign_project_member(uuid, uuid, public.project_assignment_role, timestamptz, timestamptz) to authenticated;
grant execute on function public.revoke_project_assignment(uuid, text) to authenticated;
grant execute on function public.create_content_item(uuid, text, text, text[], boolean, text) to authenticated;
grant execute on function public.update_content_metadata(uuid, integer, text, text, text[], boolean, text) to authenticated;
grant execute on function public.assign_content_responsibility(uuid, uuid, public.content_responsibility) to authenticated;
grant execute on function public.revoke_content_responsibility(uuid, text) to authenticated;
grant execute on function public.add_deliverable(uuid, text, text, text, text, text) to authenticated;

comment on table public.project_assignments is
  'Temporal project membership. Organization roles remain separate.';
comment on table public.content_item_assignments is
  'Writer/reviewer responsibilities; not organization roles or workflow approvals.';
comment on table public.publication_channels is
  'Organization-managed catalog. No Phase 03 seed is added while O-009 is open.';
comment on table public.project_content_audit_events is
  'Append-only Phase 03 administration evidence. Browser roles have no table access.';
