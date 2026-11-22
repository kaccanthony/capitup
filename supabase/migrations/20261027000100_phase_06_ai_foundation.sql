-- Phase 06 foundation. This migration is additive and has not been applied to a
-- hosted project by this repository task.

create extension if not exists vector with schema extensions;

create table public.ai_style_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  scope text not null check (scope in ('organization', 'campaign', 'personal')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_style_profiles_scope_project_check check (
    (scope = 'campaign' and project_id is not null)
    or (scope in ('organization', 'personal') and project_id is null)
  )
);

create table public.ai_style_profile_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.ai_style_profiles(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  rules jsonb not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by_user_id uuid references auth.users(id) on delete restrict,
  unique (profile_id, version_number)
);

alter table public.ai_style_profiles
  add constraint ai_style_profiles_active_version_fk
  foreign key (active_version_id) references public.ai_style_profile_versions(id) on delete restrict;

create table public.ai_style_samples (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  profile_id uuid references public.ai_style_profiles(id) on delete set null,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  plain_text text not null check (char_length(trim(plain_text)) between 1 and 20000),
  source_caption_version_id uuid references public.caption_versions(id) on delete set null,
  visibility text not null default 'private' check (visibility in ('private', 'organization_shared')),
  curated_at timestamptz,
  curated_by_user_id uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_style_samples_curated_state check (
    (curated_at is null and curated_by_user_id is null)
    or (curated_at is not null and curated_by_user_id is not null)
  )
);

create table public.ai_caption_embeddings (
  id uuid primary key default extensions.gen_random_uuid(),
  sample_id uuid not null unique references public.ai_style_samples(id) on delete cascade,
  embedding_model text not null check (char_length(trim(embedding_model)) between 1 and 120),
  content_hash text not null check (char_length(content_hash) = 64),
  embedding extensions.vector not null,
  created_at timestamptz not null default now()
);

create table public.ai_generation_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  style_profile_version_id uuid references public.ai_style_profile_versions(id) on delete set null,
  policy_version text not null,
  model text not null,
  action text not null,
  retrieved_sample_ids uuid[] not null default '{}',
  brief_hash text not null check (char_length(brief_hash) = 64),
  output_hash text,
  status text not null check (status in ('requested', 'completed', 'failed', 'rejected')),
  failure_code text,
  output_saved_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '180 days'),
  constraint ai_generation_runs_output_state check (
    (output_saved_at is null and output_hash is null)
    or (output_saved_at is not null and output_hash is not null)
  )
);

create table public.ai_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  generation_run_id uuid not null references public.ai_generation_runs(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  disposition text not null check (disposition in ('inserted', 'saved', 'rejected')),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table public.ai_user_usage_windows (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  window_kind text not null check (window_kind in ('ten_minutes', 'utc_day')),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (organization_id, user_id, window_kind, window_started_at)
);

create table public.ai_organization_usage_windows (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (organization_id, window_started_at)
);

create index ai_style_profiles_active_idx
  on public.ai_style_profiles (organization_id, scope, status)
  where status = 'active';
create index ai_style_samples_retrieval_idx
  on public.ai_style_samples (organization_id, project_id, visibility)
  where revoked_at is null and curated_at is not null;
create index ai_generation_runs_retention_idx
  on public.ai_generation_runs (expires_at);

create trigger ai_style_profiles_set_updated_at
before update on public.ai_style_profiles
for each row execute function private.set_updated_at();

create trigger ai_style_samples_set_updated_at
before update on public.ai_style_samples
for each row execute function private.set_updated_at();

create or replace function private.can_manage_ai_style(
  p_organization_id uuid,
  p_project_id uuid,
  p_scope text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_organization_role(p_organization_id, 'publicity_director')
    or private.has_organization_role(p_organization_id, 'pro')
    or (
      p_scope = 'campaign'
      and p_project_id is not null
      and exists (
        select 1
        from public.project_assignments assignment
        where assignment.project_id = p_project_id
          and assignment.membership_id = private.current_membership_id(p_organization_id)
          and assignment.role = 'publicity_head'
          and private.is_current_project_assignment(assignment.id)
      )
    );
$$;

create or replace function private.can_activate_ai_style(
  p_organization_id uuid,
  p_project_id uuid,
  p_scope text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_ai_style(p_organization_id, p_project_id, p_scope)
    or private.has_organization_role(p_organization_id, 'executive');
$$;

create or replace function private.can_view_ai_style_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ai_style_profiles profile
    where profile.id = p_profile_id
      and private.has_active_membership(profile.organization_id)
      and (
        profile.owner_user_id = (select auth.uid())
        or (
          profile.status = 'active'
          and profile.scope <> 'personal'
          and (profile.project_id is null or private.can_view_project(profile.project_id))
        )
        or private.can_manage_ai_style(profile.organization_id, profile.project_id, profile.scope)
      )
  );
$$;

create or replace function private.can_retrieve_ai_sample(p_sample_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ai_style_samples sample
    where sample.id = p_sample_id
      and sample.revoked_at is null
      and sample.curated_at is not null
      and private.has_active_membership(sample.organization_id)
      and (sample.project_id is null or private.can_view_project(sample.project_id))
      and (
        sample.author_user_id = (select auth.uid())
        or sample.visibility = 'organization_shared'
      )
  );
$$;

create or replace function public.reserve_ai_generation_quota(p_content_item_id uuid)
returns table (
  user_requests_remaining integer,
  organization_requests_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_organization_id uuid;
  v_short_window timestamptz;
  v_day_window timestamptz := date_trunc('day', now());
  v_count integer;
begin
  if v_actor is null or not private.can_edit_content(p_content_item_id) then
    raise exception 'ai_generation_not_authorized';
  end if;

  select organization_id into v_organization_id
  from public.content_items
  where id = p_content_item_id;

  if v_organization_id is null then
    raise exception 'ai_generation_not_authorized';
  end if;

  v_short_window := date_trunc('hour', now())
    + floor(extract(minute from now()) / 10) * interval '10 minutes';

  insert into public.ai_user_usage_windows (
    organization_id, user_id, window_kind, window_started_at, request_count
  ) values (v_organization_id, v_actor, 'ten_minutes', v_short_window, 1)
  on conflict (organization_id, user_id, window_kind, window_started_at)
  do update set request_count = public.ai_user_usage_windows.request_count + 1
  where public.ai_user_usage_windows.request_count < 5
  returning request_count into v_count;

  if v_count is null then
    raise exception 'ai_rate_limit_exhausted';
  end if;

  insert into public.ai_user_usage_windows (
    organization_id, user_id, window_kind, window_started_at, request_count
  ) values (v_organization_id, v_actor, 'utc_day', v_day_window, 1)
  on conflict (organization_id, user_id, window_kind, window_started_at)
  do update set request_count = public.ai_user_usage_windows.request_count + 1
  where public.ai_user_usage_windows.request_count < 25
  returning request_count into v_count;

  if v_count is null then
    raise exception 'ai_user_quota_exhausted';
  end if;

  insert into public.ai_organization_usage_windows (
    organization_id, window_started_at, request_count
  ) values (v_organization_id, v_day_window, 1)
  on conflict (organization_id, window_started_at)
  do update set request_count = public.ai_organization_usage_windows.request_count + 1
  where public.ai_organization_usage_windows.request_count < 250
  returning request_count into v_count;

  if v_count is null then
    raise exception 'ai_organization_quota_exhausted';
  end if;

  return query select 25 - (
    select request_count from public.ai_user_usage_windows
    where organization_id = v_organization_id and user_id = v_actor
      and window_kind = 'utc_day' and window_started_at = v_day_window
  ), 250 - (
    select request_count from public.ai_organization_usage_windows
    where organization_id = v_organization_id and window_started_at = v_day_window
  );
end;
$$;

alter table public.ai_style_profiles enable row level security;
alter table public.ai_style_profile_versions enable row level security;
alter table public.ai_style_samples enable row level security;
alter table public.ai_caption_embeddings enable row level security;
alter table public.ai_generation_runs enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_user_usage_windows enable row level security;
alter table public.ai_organization_usage_windows enable row level security;

create policy ai_style_profiles_select_authorized on public.ai_style_profiles
for select to authenticated using (private.can_view_ai_style_profile(id));
create policy ai_style_profile_versions_select_authorized on public.ai_style_profile_versions
for select to authenticated using (private.can_view_ai_style_profile(profile_id));
create policy ai_style_samples_select_authorized on public.ai_style_samples
for select to authenticated using (
  author_user_id = (select auth.uid()) or private.can_retrieve_ai_sample(id)
);
create policy ai_caption_embeddings_select_authorized on public.ai_caption_embeddings
for select to authenticated using (private.can_retrieve_ai_sample(sample_id));
create policy ai_generation_runs_select_authorized on public.ai_generation_runs
for select to authenticated using (
  requested_by_user_id = (select auth.uid()) and private.can_view_content_item(content_item_id)
);
create policy ai_feedback_select_authorized on public.ai_feedback
for select to authenticated using (
  exists (
    select 1 from public.ai_generation_runs run
    where run.id = generation_run_id and private.can_view_content_item(run.content_item_id)
  )
);

revoke all on public.ai_style_profiles, public.ai_style_profile_versions,
  public.ai_style_samples, public.ai_caption_embeddings, public.ai_generation_runs,
  public.ai_feedback, public.ai_user_usage_windows,
  public.ai_organization_usage_windows from anon, authenticated;
grant select on public.ai_style_profiles, public.ai_style_profile_versions,
  public.ai_style_samples, public.ai_caption_embeddings, public.ai_generation_runs,
  public.ai_feedback to authenticated;

revoke all on function private.can_manage_ai_style(uuid, uuid, text),
  private.can_activate_ai_style(uuid, uuid, text),
  private.can_view_ai_style_profile(uuid), private.can_retrieve_ai_sample(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_ai_style(uuid, uuid, text),
  private.can_activate_ai_style(uuid, uuid, text),
  private.can_view_ai_style_profile(uuid), private.can_retrieve_ai_sample(uuid)
  to authenticated;
revoke all on function public.reserve_ai_generation_quota(uuid) from public, anon;
grant execute on function public.reserve_ai_generation_quota(uuid) to authenticated;

comment on table public.ai_generation_runs is
  '180-day AI provenance and usage records. Raw generated caption text is stored only after explicit user insertion or save.';
