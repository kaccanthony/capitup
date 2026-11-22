-- Phase 06 operational boundary. Apply after 20261027000100_phase_06_ai_foundation.sql.
-- This migration is forward-only and has not been applied by this repository task.

create table public.ai_audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  generation_run_id uuid references public.ai_generation_runs(id) on delete set null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'style_profile_created', 'style_profile_version_added', 'style_profile_activated',
    'sample_curated', 'sample_revoked', 'generation_requested',
    'generation_completed', 'generation_failed', 'generation_disposition_recorded'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- A completed run retains a hash, not its generated caption body. A later
-- insertion/save records output_saved_at; requiring both at completion would
-- accidentally claim that uninserted generated content had been retained.
alter table public.ai_generation_runs
  drop constraint ai_generation_runs_output_state;
alter table public.ai_generation_runs
  add constraint ai_generation_runs_output_state check (
    output_saved_at is null or output_hash is not null
  );

alter table public.ai_audit_events enable row level security;
create policy ai_audit_events_select_authorized on public.ai_audit_events
for select to authenticated using (
  (content_item_id is not null and private.can_view_content_item(content_item_id))
  or (
    content_item_id is null
    and private.has_active_membership(organization_id)
    and (
      actor_user_id = (select auth.uid())
      or private.has_organization_role(organization_id, 'publicity_director')
      or private.has_organization_role(organization_id, 'pro')
    )
  )
);
revoke all on public.ai_audit_events from anon, authenticated;
grant select on public.ai_audit_events to authenticated;

create or replace function private.can_create_ai_style(
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
  select case
    when p_scope = 'personal' then p_project_id is null
      and private.has_active_membership(p_organization_id)
    when p_scope in ('organization', 'campaign') then
      private.can_manage_ai_style(p_organization_id, p_project_id, p_scope)
    else false
  end;
$$;

create or replace function public.create_ai_style_profile(
  p_organization_id uuid,
  p_project_id uuid,
  p_scope text,
  p_name text,
  p_rules jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_profile_id uuid;
  v_version_id uuid;
begin
  if v_actor is null
    or p_scope not in ('organization', 'campaign', 'personal')
    or trim(coalesce(p_name, '')) = ''
    or jsonb_typeof(p_rules) <> 'object'
    or not private.can_create_ai_style(p_organization_id, p_project_id, p_scope) then
    raise exception 'ai_style_not_authorized';
  end if;

  if (p_scope = 'campaign' and p_project_id is null)
    or (p_scope <> 'campaign' and p_project_id is not null) then
    raise exception 'ai_style_invalid_scope';
  end if;

  insert into public.ai_style_profiles (
    organization_id, project_id, scope, owner_user_id, name
  ) values (
    p_organization_id, p_project_id, p_scope, v_actor, trim(p_name)
  ) returning id into v_profile_id;

  insert into public.ai_style_profile_versions (
    profile_id, version_number, rules, created_by_user_id
  ) values (v_profile_id, 1, p_rules, v_actor) returning id into v_version_id;

  insert into public.ai_audit_events (
    organization_id, project_id, actor_user_id, event_type, metadata
  ) values (
    p_organization_id, p_project_id, v_actor, 'style_profile_created',
    jsonb_build_object('profile_id', v_profile_id, 'version_id', v_version_id)
  );
  return v_profile_id;
end;
$$;

create or replace function public.append_ai_style_profile_version(
  p_profile_id uuid,
  p_rules jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_profile public.ai_style_profiles%rowtype;
  v_version_number integer;
  v_version_id uuid;
begin
  select * into v_profile from public.ai_style_profiles
  where id = p_profile_id for update;
  if v_profile.id is null or v_actor is null or jsonb_typeof(p_rules) <> 'object'
    or not (
      (v_profile.scope = 'personal' and v_profile.owner_user_id = v_actor)
      or private.can_manage_ai_style(v_profile.organization_id, v_profile.project_id, v_profile.scope)
    ) then
    raise exception 'ai_style_not_authorized';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.ai_style_profile_versions where profile_id = v_profile.id;
  insert into public.ai_style_profile_versions (
    profile_id, version_number, rules, created_by_user_id
  ) values (v_profile.id, v_version_number, p_rules, v_actor) returning id into v_version_id;
  insert into public.ai_audit_events (
    organization_id, project_id, actor_user_id, event_type, metadata
  ) values (
    v_profile.organization_id, v_profile.project_id, v_actor,
    'style_profile_version_added',
    jsonb_build_object('profile_id', v_profile.id, 'version_id', v_version_id)
  );
  return v_version_id;
end;
$$;

create or replace function public.activate_ai_style_profile_version(
  p_profile_id uuid,
  p_version_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_profile public.ai_style_profiles%rowtype;
begin
  select * into v_profile from public.ai_style_profiles where id = p_profile_id for update;
  if v_profile.id is null or v_actor is null
    or not private.can_activate_ai_style(v_profile.organization_id, v_profile.project_id, v_profile.scope)
    or not exists (
      select 1 from public.ai_style_profile_versions
      where id = p_version_id and profile_id = v_profile.id
    ) then
    raise exception 'ai_style_not_authorized';
  end if;
  update public.ai_style_profiles
  set active_version_id = p_version_id, status = 'active'
  where id = v_profile.id;
  update public.ai_style_profile_versions
  set activated_at = now(), activated_by_user_id = v_actor
  where id = p_version_id;
  insert into public.ai_audit_events (
    organization_id, project_id, actor_user_id, event_type, metadata
  ) values (
    v_profile.organization_id, v_profile.project_id, v_actor,
    'style_profile_activated',
    jsonb_build_object('profile_id', v_profile.id, 'version_id', p_version_id)
  );
  return true;
end;
$$;

create or replace function public.search_ai_caption_embeddings(
  p_content_item_id uuid,
  p_query_embedding extensions.vector,
  p_match_limit integer default 8
)
returns table (
  sample_id uuid,
  plain_text text,
  similarity double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items%rowtype;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or p_match_limit not between 1 and 8
    or not private.can_edit_content(p_content_item_id) then
    raise exception 'ai_retrieval_not_authorized';
  end if;
  select * into v_item from public.content_items where id = p_content_item_id;
  if v_item.id is null then
    raise exception 'ai_retrieval_not_authorized';
  end if;

  return query
  select sample.id, sample.plain_text,
    (1 - (embedding.embedding <=> p_query_embedding))::double precision
  from public.ai_caption_embeddings embedding
  join public.ai_style_samples sample on sample.id = embedding.sample_id
  where sample.organization_id = v_item.organization_id
    and (sample.project_id is null or sample.project_id = v_item.project_id)
    and sample.curated_at is not null
    and sample.revoked_at is null
    and (sample.author_user_id = v_actor or sample.visibility = 'organization_shared')
  order by embedding.embedding <=> p_query_embedding
  limit p_match_limit;
end;
$$;

create or replace function public.record_ai_generation_run(
  p_content_item_id uuid,
  p_style_profile_version_id uuid,
  p_policy_version text,
  p_model text,
  p_action text,
  p_retrieved_sample_ids uuid[],
  p_brief_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_run_id uuid;
begin
  if v_actor is null or not private.can_edit_content(p_content_item_id)
    or char_length(coalesce(p_brief_hash, '')) <> 64 then
    raise exception 'ai_generation_not_authorized';
  end if;
  select * into v_item from public.content_items where id = p_content_item_id;
  if v_item.id is null then raise exception 'ai_generation_not_authorized'; end if;
  if exists (
    select 1 from unnest(coalesce(p_retrieved_sample_ids, '{}')) sample_id
    where not private.can_retrieve_ai_sample(sample_id)
  ) then raise exception 'ai_retrieval_not_authorized'; end if;
  insert into public.ai_generation_runs (
    organization_id, project_id, content_item_id, requested_by_user_id,
    style_profile_version_id, policy_version, model, action,
    retrieved_sample_ids, brief_hash, status
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_actor,
    p_style_profile_version_id, p_policy_version, p_model, p_action,
    coalesce(p_retrieved_sample_ids, '{}'), p_brief_hash, 'requested'
  ) returning id into v_run_id;
  insert into public.ai_audit_events (
    organization_id, project_id, content_item_id, generation_run_id, actor_user_id, event_type,
    metadata
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_run_id, v_actor,
    'generation_requested', jsonb_build_object('sample_count', cardinality(coalesce(p_retrieved_sample_ids, '{}')))
  );
  return v_run_id;
end;
$$;

create or replace function public.complete_ai_generation_run(
  p_run_id uuid,
  p_output_hash text,
  p_failed boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.ai_generation_runs%rowtype;
begin
  select * into v_run from public.ai_generation_runs where id = p_run_id for update;
  if v_actor is null or v_run.id is null or v_run.requested_by_user_id <> v_actor
    or not private.can_edit_content(v_run.content_item_id)
    or v_run.status <> 'requested' then raise exception 'ai_generation_not_authorized'; end if;
  if not p_failed and char_length(coalesce(p_output_hash, '')) <> 64 then
    raise exception 'ai_generation_invalid_output';
  end if;
  update public.ai_generation_runs
  set status = case when p_failed then 'failed' else 'completed' end,
      failure_code = case when p_failed then 'provider_unavailable' else null end,
      output_hash = case when p_failed then null else p_output_hash end,
      completed_at = now()
  where id = v_run.id;
  insert into public.ai_audit_events (
    organization_id, project_id, content_item_id, generation_run_id, actor_user_id, event_type
  ) values (
    v_run.organization_id, v_run.project_id, v_run.content_item_id, v_run.id, v_actor,
    case when p_failed then 'generation_failed' else 'generation_completed' end
  );
  return true;
end;
$$;

create or replace function public.record_ai_generation_feedback(
  p_run_id uuid,
  p_disposition text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.ai_generation_runs%rowtype;
  v_feedback_id uuid;
begin
  select * into v_run from public.ai_generation_runs where id = p_run_id for update;
  if v_actor is null or v_run.id is null or v_run.requested_by_user_id <> v_actor
    or not private.can_edit_content(v_run.content_item_id)
    or p_disposition not in ('inserted', 'saved', 'rejected') then
    raise exception 'ai_generation_not_authorized';
  end if;
  insert into public.ai_feedback (generation_run_id, author_user_id, disposition, note)
  values (v_run.id, v_actor, p_disposition, nullif(trim(p_note), '')) returning id into v_feedback_id;
  update public.ai_generation_runs
  set status = case when p_disposition = 'rejected' then 'rejected' else status end,
      output_saved_at = case when p_disposition in ('inserted', 'saved') then now() else output_saved_at end
  where id = v_run.id;
  insert into public.ai_audit_events (
    organization_id, project_id, content_item_id, generation_run_id, actor_user_id, event_type, metadata
  ) values (
    v_run.organization_id, v_run.project_id, v_run.content_item_id, v_run.id, v_actor,
    'generation_disposition_recorded', jsonb_build_object('disposition', p_disposition)
  );
  return v_feedback_id;
end;
$$;

revoke all on function private.can_create_ai_style(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.create_ai_style_profile(uuid, uuid, text, text, jsonb) from public, anon;
revoke all on function public.append_ai_style_profile_version(uuid, jsonb) from public, anon;
revoke all on function public.activate_ai_style_profile_version(uuid, uuid) from public, anon;
revoke all on function public.search_ai_caption_embeddings(uuid, extensions.vector, integer) from public, anon;
revoke all on function public.record_ai_generation_run(uuid, uuid, text, text, text, uuid[], text) from public, anon;
revoke all on function public.complete_ai_generation_run(uuid, text, boolean) from public, anon;
revoke all on function public.record_ai_generation_feedback(uuid, text, text) from public, anon;
grant execute on function public.create_ai_style_profile(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.append_ai_style_profile_version(uuid, jsonb) to authenticated;
grant execute on function public.activate_ai_style_profile_version(uuid, uuid) to authenticated;
grant execute on function public.search_ai_caption_embeddings(uuid, extensions.vector, integer) to authenticated;
grant execute on function public.record_ai_generation_run(uuid, uuid, text, text, text, uuid[], text) to authenticated;
grant execute on function public.complete_ai_generation_run(uuid, text, boolean) to authenticated;
grant execute on function public.record_ai_generation_feedback(uuid, text, text) to authenticated;
