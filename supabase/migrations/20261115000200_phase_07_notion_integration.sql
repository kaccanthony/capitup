-- Phase 07 Notion integration. Apply after the existing Phase 02-06 migrations.
-- This forward-only migration stores references and sync evidence only. Notion
-- credentials remain deployment secrets and are never persisted in these tables.

alter table public.projects
  add column notion_event_starts_at timestamptz,
  add column notion_deadline_at timestamptz;

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  provider text not null check (provider = 'notion'),
  label text not null check (label = btrim(label) and char_length(label) between 1 and 120),
  status text not null default 'configured' check (status in ('configured', 'active', 'degraded', 'disabled')),
  notion_workspace_id text not null check (char_length(btrim(notion_workspace_id)) between 1 and 200),
  notion_subscription_id text not null check (char_length(btrim(notion_subscription_id)) between 1 and 200),
  notion_data_source_id text not null check (char_length(btrim(notion_data_source_id)) between 1 and 200),
  field_mappings jsonb not null,
  mapping_version integer not null default 1 check (mapping_version > 0),
  configured_by_user_id uuid not null references auth.users(id) on delete restrict,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (provider, notion_workspace_id, notion_subscription_id)
);

create table public.notion_object_links (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  notion_page_id text not null check (char_length(btrim(notion_page_id)) between 1 and 200),
  last_external_edited_at timestamptz,
  last_import_hash text check (last_import_hash is null or char_length(last_import_hash) = 64),
  last_export_hash text check (last_export_hash is null or char_length(last_export_hash) = 64),
  last_imported_at timestamptz,
  last_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_connection_id, notion_page_id),
  unique (integration_connection_id, project_id)
);

create table public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  cursor_key text not null check (cursor_key in ('notion_data_source')),
  cursor_value text,
  observed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (integration_connection_id, cursor_key)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  provider_event_id text not null check (char_length(btrim(provider_event_id)) between 1 and 200),
  provider_event_type text not null check (char_length(btrim(provider_event_type)) between 1 and 160),
  provider_timestamp timestamptz not null,
  external_object_id text not null check (char_length(btrim(external_object_id)) between 1 and 200),
  payload_sha256 text not null check (char_length(payload_sha256) = 64),
  state text not null default 'received' check (state in ('received', 'processing', 'processed', 'ignored_out_of_order', 'retry_scheduled', 'dead_lettered', 'conflict')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (integration_connection_id, provider_event_id)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  webhook_event_id uuid references public.webhook_events(id) on delete set null,
  object_link_id uuid references public.notion_object_links(id) on delete set null,
  direction text not null check (direction in ('import', 'export', 'reconcile')),
  state text not null default 'queued' check (state in ('queued', 'running', 'succeeded', 'no_change', 'retry_scheduled', 'conflict', 'dead_lettered', 'failed')),
  attempt_number integer not null default 0 check (attempt_number >= 0),
  next_attempt_at timestamptz,
  error_code text,
  input_hash text check (input_hash is null or char_length(input_hash) = 64),
  output_hash text check (output_hash is null or char_length(output_hash) = 64),
  initiated_by_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  object_link_id uuid references public.notion_object_links(id) on delete set null,
  sync_run_id uuid references public.sync_runs(id) on delete set null,
  kind text not null check (kind in ('out_of_order', 'mapping_invalid', 'property_changed', 'external_object_missing')),
  state text not null default 'open' check (state in ('open', 'resolved')),
  detail_code text not null check (char_length(btrim(detail_code)) between 1 and 120),
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((state = 'open' and resolved_by_user_id is null and resolved_at is null) or (state = 'resolved' and resolved_by_user_id is not null and resolved_at is not null))
);

create table public.dead_letter_events (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  webhook_event_id uuid references public.webhook_events(id) on delete set null,
  sync_run_id uuid references public.sync_runs(id) on delete set null,
  reason_code text not null check (char_length(btrim(reason_code)) between 1 and 120),
  replay_count integer not null default 0 check (replay_count >= 0),
  replayed_by_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('connection_configured', 'connection_activated', 'webhook_accepted', 'import_applied', 'export_applied', 'sync_failed', 'dead_letter_replayed', 'conflict_resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notion_object_links_project_idx on public.notion_object_links(project_id);
create index webhook_events_state_idx on public.webhook_events(integration_connection_id, state, received_at);
create index sync_runs_retry_idx on public.sync_runs(integration_connection_id, state, next_attempt_at);
create index sync_conflicts_open_idx on public.sync_conflicts(integration_connection_id, created_at desc) where state = 'open';
create index dead_letter_events_open_idx on public.dead_letter_events(integration_connection_id, resolved_at, created_at desc);

create trigger integration_connections_set_updated_at
before update on public.integration_connections
for each row execute function private.set_updated_at();

create trigger notion_object_links_set_updated_at
before update on public.notion_object_links
for each row execute function private.set_updated_at();

create or replace function private.can_manage_notion_integration(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_organization_role(p_organization_id, 'org_admin');
$$;

create or replace function private.valid_notion_field_mappings(p_mappings jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_mapping jsonb;
  v_field text;
  v_direction text;
  v_property_type text;
  v_seen text[] := '{}';
  v_required text[] := array['project_title', 'event_start_at', 'deadline_at'];
begin
  if jsonb_typeof(p_mappings) <> 'array'
    or jsonb_array_length(p_mappings) < 3
    or jsonb_array_length(p_mappings) > 6 then
    return false;
  end if;

  for v_mapping in select value from jsonb_array_elements(p_mappings) loop
    if jsonb_typeof(v_mapping) <> 'object' then return false; end if;
    v_field := v_mapping ->> 'field';
    v_direction := v_mapping ->> 'direction';
    v_property_type := v_mapping ->> 'propertyType';
    if v_field is null or v_direction is null or v_property_type is null
      or nullif(btrim(v_mapping ->> 'propertyId'), '') is null
      or char_length(v_mapping ->> 'propertyId') > 200
      or v_field = any(v_seen) then
      return false;
    end if;
    v_seen := array_append(v_seen, v_field);
    if (v_field = 'project_title' and (v_direction <> 'import' or v_property_type <> 'title'))
      or (v_field in ('event_start_at', 'deadline_at') and (v_direction <> 'import' or v_property_type <> 'date'))
      or (v_field = 'writer_summary' and (v_direction <> 'export' or v_property_type <> 'rich_text'))
      or (v_field = 'workflow_status' and (v_direction <> 'export' or v_property_type not in ('select', 'status')))
      or (v_field = 'deep_link' and (v_direction <> 'export' or v_property_type <> 'url'))
      or v_field not in ('project_title', 'event_start_at', 'deadline_at', 'writer_summary', 'workflow_status', 'deep_link') then
      return false;
    end if;
  end loop;

  return v_required <@ v_seen;
end;
$$;

create or replace function private.enforce_notion_project_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.title is distinct from new.title
      or old.notion_event_starts_at is distinct from new.notion_event_starts_at
      or old.notion_deadline_at is distinct from new.notion_deadline_at)
    and exists (select 1 from public.notion_object_links link where link.project_id = old.id)
    and auth.role() <> 'service_role' then
    raise exception 'notion_owned_project_fields';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_notion_owned_fields
before update on public.projects
for each row execute function private.enforce_notion_project_ownership();

create or replace function public.configure_notion_integration(
  p_organization_id uuid,
  p_label text,
  p_workspace_id text,
  p_subscription_id text,
  p_data_source_id text,
  p_field_mappings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_connection_id uuid;
begin
  if v_actor is null
    or not private.can_manage_notion_integration(p_organization_id)
    or char_length(btrim(coalesce(p_label, ''))) not between 1 and 120
    or char_length(btrim(coalesce(p_workspace_id, ''))) not between 1 and 200
    or char_length(btrim(coalesce(p_subscription_id, ''))) not between 1 and 200
    or char_length(btrim(coalesce(p_data_source_id, ''))) not between 1 and 200
    or not private.valid_notion_field_mappings(p_field_mappings) then
    raise exception 'notion_integration_not_authorized';
  end if;

  insert into public.integration_connections (
    organization_id, provider, label, notion_workspace_id, notion_subscription_id,
    notion_data_source_id, field_mappings, configured_by_user_id
  ) values (
    p_organization_id, 'notion', btrim(p_label), btrim(p_workspace_id), btrim(p_subscription_id),
    btrim(p_data_source_id), p_field_mappings, v_actor
  ) on conflict (organization_id, provider) do update set
    label = excluded.label,
    status = 'configured',
    notion_workspace_id = excluded.notion_workspace_id,
    notion_subscription_id = excluded.notion_subscription_id,
    notion_data_source_id = excluded.notion_data_source_id,
    field_mappings = excluded.field_mappings,
    mapping_version = public.integration_connections.mapping_version + 1,
    configured_by_user_id = v_actor,
    last_error_code = null
  returning id into v_connection_id;

  insert into public.integration_audit_events (
    integration_connection_id, organization_id, actor_user_id, event_type, metadata
  ) values (
    v_connection_id, p_organization_id, v_actor, 'connection_configured',
    jsonb_build_object('mapping_version', (select mapping_version from public.integration_connections where id = v_connection_id))
  );
  return v_connection_id;
end;
$$;

create or replace function public.activate_notion_integration(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_connection public.integration_connections%rowtype;
begin
  select * into v_connection from public.integration_connections where id = p_connection_id for update;
  if v_actor is null or v_connection.id is null
    or not private.can_manage_notion_integration(v_connection.organization_id)
    or v_connection.status not in ('configured', 'degraded') then
    raise exception 'notion_integration_not_authorized';
  end if;
  update public.integration_connections set status = 'active', last_error_code = null where id = v_connection.id;
  insert into public.integration_audit_events (integration_connection_id, organization_id, actor_user_id, event_type)
  values (v_connection.id, v_connection.organization_id, v_actor, 'connection_activated');
  return true;
end;
$$;

create or replace function public.accept_notion_webhook_event(
  p_workspace_id text,
  p_subscription_id text,
  p_provider_event_id text,
  p_provider_event_type text,
  p_provider_timestamp timestamptz,
  p_external_object_id text,
  p_payload_sha256 text
)
returns table (webhook_event_id uuid, is_duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.integration_connections%rowtype;
  v_event_id uuid;
begin
  select * into v_connection from public.integration_connections
  where provider = 'notion' and status = 'active'
    and notion_workspace_id = btrim(p_workspace_id)
    and notion_subscription_id = btrim(p_subscription_id)
  for update;
  if v_connection.id is null
    or p_provider_timestamp < now() - interval '5 minutes'
    or p_provider_timestamp > now() + interval '1 minute'
    or char_length(coalesce(p_payload_sha256, '')) <> 64 then
    raise exception 'notion_webhook_rejected';
  end if;

  insert into public.webhook_events (
    integration_connection_id, provider_event_id, provider_event_type,
    provider_timestamp, external_object_id, payload_sha256
  ) values (
    v_connection.id, btrim(p_provider_event_id), btrim(p_provider_event_type),
    p_provider_timestamp, btrim(p_external_object_id), p_payload_sha256
  ) on conflict (integration_connection_id, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id from public.webhook_events
    where integration_connection_id = v_connection.id and provider_event_id = btrim(p_provider_event_id);
    return query select v_event_id, true;
    return;
  end if;

  insert into public.sync_runs (integration_connection_id, webhook_event_id, direction, state)
  values (v_connection.id, v_event_id, 'import', 'queued');
  insert into public.integration_audit_events (integration_connection_id, organization_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, 'webhook_accepted', jsonb_build_object('provider_event_id', btrim(p_provider_event_id)));
  return query select v_event_id, false;
end;
$$;

create or replace function public.apply_notion_project_import(
  p_webhook_event_id uuid,
  p_external_page_id text,
  p_external_edited_at timestamptz,
  p_title text,
  p_event_starts_at timestamptz,
  p_deadline_at timestamptz,
  p_payload_hash text
)
returns table (project_id uuid, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.webhook_events%rowtype;
  v_connection public.integration_connections%rowtype;
  v_link public.notion_object_links%rowtype;
  v_project_id uuid;
  v_run_id uuid;
begin
  select * into v_event from public.webhook_events where id = p_webhook_event_id for update;
  if v_event.id is null or char_length(btrim(coalesce(p_title, ''))) not between 1 and 160
    or char_length(coalesce(p_payload_hash, '')) <> 64 then
    raise exception 'notion_import_invalid';
  end if;
  select * into v_connection from public.integration_connections where id = v_event.integration_connection_id for update;
  -- A degraded connection must still be able to make a trusted recovery
  -- attempt. Disabled and merely configured connections remain unavailable.
  if v_connection.status not in ('active', 'degraded') then
    raise exception 'notion_import_unavailable';
  end if;
  select * into v_link from public.notion_object_links
  where integration_connection_id = v_connection.id and notion_page_id = btrim(p_external_page_id)
  for update;
  select id into v_run_id from public.sync_runs
  where webhook_event_id = v_event.id and state in ('queued', 'running') order by created_at limit 1 for update;

  if v_link.id is not null and v_link.last_external_edited_at is not null
    and p_external_edited_at < v_link.last_external_edited_at then
    update public.webhook_events set state = 'ignored_out_of_order', processed_at = now() where id = v_event.id;
    update public.sync_runs set state = 'no_change', completed_at = now(), error_code = 'out_of_order' where id = v_run_id;
    insert into public.sync_conflicts (integration_connection_id, object_link_id, sync_run_id, kind, detail_code)
    values (v_connection.id, v_link.id, v_run_id, 'out_of_order', 'external_timestamp_precedes_last_import');
    return query select v_link.project_id, false;
    return;
  end if;

  if v_link.id is not null and v_link.last_external_edited_at = p_external_edited_at
    and v_link.last_import_hash = p_payload_hash then
    update public.webhook_events set state = 'processed', processed_at = now() where id = v_event.id;
    update public.sync_runs set state = 'no_change', completed_at = now() where id = v_run_id;
    return query select v_link.project_id, false;
    return;
  end if;

  if v_link.id is null then
    insert into public.projects (
      organization_id, title, created_by_user_id, notion_event_starts_at, notion_deadline_at
    ) values (
      v_connection.organization_id, btrim(p_title), v_connection.configured_by_user_id,
      p_event_starts_at, p_deadline_at
    ) returning id into v_project_id;
    insert into public.notion_object_links (
      integration_connection_id, organization_id, project_id, notion_page_id,
      last_external_edited_at, last_import_hash, last_imported_at
    ) values (
      v_connection.id, v_connection.organization_id, v_project_id, btrim(p_external_page_id),
      p_external_edited_at, p_payload_hash, now()
    ) returning * into v_link;
  else
    update public.projects set
      title = btrim(p_title),
      notion_event_starts_at = p_event_starts_at,
      notion_deadline_at = p_deadline_at,
      record_version = record_version + 1
    where id = v_link.project_id;
    update public.notion_object_links set
      last_external_edited_at = p_external_edited_at,
      last_import_hash = p_payload_hash,
      last_imported_at = now()
    where id = v_link.id;
    v_project_id := v_link.project_id;
  end if;

  update public.webhook_events set state = 'processed', processed_at = now() where id = v_event.id;
  update public.sync_runs set state = 'succeeded', completed_at = now(), output_hash = p_payload_hash where id = v_run_id;
  update public.integration_connections
  set status = 'active', last_success_at = now(), last_error_code = null
  where id = v_connection.id;
  -- A dead-letter replay is initiated by an organization administrator. Once
  -- that reconciliation succeeds, retain its audit record but remove it from
  -- the outstanding recovery queue.
  if v_run_id is not null then
    update public.dead_letter_events
    set resolved_by_user_id = (select initiated_by_user_id from public.sync_runs where id = v_run_id),
        resolved_at = now()
    where webhook_event_id = v_event.id
      and resolved_at is null
      and (select initiated_by_user_id from public.sync_runs where id = v_run_id) is not null;
  end if;
  insert into public.integration_audit_events (integration_connection_id, organization_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, 'import_applied', jsonb_build_object('project_id', v_project_id, 'page_id', btrim(p_external_page_id)));
  return query select v_project_id, true;
end;
$$;

create or replace function public.record_notion_sync_failure(
  p_sync_run_id uuid,
  p_state text,
  p_error_code text,
  p_next_attempt_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.sync_runs%rowtype;
  v_connection public.integration_connections%rowtype;
begin
  select * into v_run from public.sync_runs where id = p_sync_run_id for update;
  if v_run.id is null or p_state not in ('retry_scheduled', 'conflict', 'dead_lettered', 'failed')
    or char_length(btrim(coalesce(p_error_code, ''))) not between 1 and 120 then
    raise exception 'notion_sync_failure_invalid';
  end if;
  select * into v_connection from public.integration_connections where id = v_run.integration_connection_id for update;
  update public.sync_runs set state = p_state, error_code = btrim(p_error_code),
    next_attempt_at = case when p_state = 'retry_scheduled' then p_next_attempt_at else null end,
    completed_at = case when p_state in ('dead_lettered', 'failed', 'conflict') then now() else null end,
    attempt_number = attempt_number + 1 where id = v_run.id;
  if v_run.webhook_event_id is not null then
    update public.webhook_events
    set state = case
      when p_state = 'retry_scheduled' then 'retry_scheduled'
      when p_state = 'conflict' then 'conflict'
      when p_state = 'dead_lettered' then 'dead_lettered'
      else state
    end
    where id = v_run.webhook_event_id;
  end if;
  if p_state = 'conflict' then
    insert into public.sync_conflicts (
      integration_connection_id, sync_run_id, kind, detail_code
    ) values (
      v_connection.id, v_run.id,
      case
        when p_error_code = 'notion_mapping_invalid' then 'mapping_invalid'
        when p_error_code = 'notion_external_object_missing' then 'external_object_missing'
        else 'property_changed'
      end,
      btrim(p_error_code)
    );
  end if;
  if p_state = 'dead_lettered' then
    insert into public.dead_letter_events (integration_connection_id, webhook_event_id, sync_run_id, reason_code)
    values (v_connection.id, v_run.webhook_event_id, v_run.id, btrim(p_error_code));
  end if;
  update public.integration_connections set status = 'degraded', last_failure_at = now(), last_error_code = btrim(p_error_code)
  where id = v_connection.id;
  insert into public.integration_audit_events (integration_connection_id, organization_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, 'sync_failed', jsonb_build_object('sync_run_id', v_run.id, 'state', p_state, 'error_code', btrim(p_error_code)));
  return true;
end;
$$;

create or replace function public.replay_notion_dead_letter(p_dead_letter_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_dead_letter public.dead_letter_events%rowtype;
  v_connection public.integration_connections%rowtype;
  v_sync_run_id uuid;
  v_attempt_number integer := 0;
begin
  select * into v_dead_letter from public.dead_letter_events where id = p_dead_letter_id for update;
  select * into v_connection from public.integration_connections where id = v_dead_letter.integration_connection_id for update;
  if v_actor is null or v_dead_letter.id is null or v_dead_letter.resolved_at is not null
    or not private.can_manage_notion_integration(v_connection.organization_id) then
    raise exception 'notion_replay_not_authorized';
  end if;
  select attempt_number into v_attempt_number from public.sync_runs where id = v_dead_letter.sync_run_id;
  insert into public.sync_runs (integration_connection_id, webhook_event_id, direction, state, attempt_number, initiated_by_user_id)
  values (v_connection.id, v_dead_letter.webhook_event_id, 'reconcile', 'queued', coalesce(v_attempt_number, 0), v_actor)
  returning id into v_sync_run_id;
  update public.webhook_events set state = 'processing' where id = v_dead_letter.webhook_event_id;
  update public.dead_letter_events set replay_count = replay_count + 1, replayed_by_user_id = v_actor
  where id = v_dead_letter.id;
  insert into public.integration_audit_events (integration_connection_id, organization_id, actor_user_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, v_actor, 'dead_letter_replayed', jsonb_build_object('dead_letter_id', v_dead_letter.id, 'sync_run_id', v_sync_run_id));
  return v_sync_run_id;
end;
$$;

create or replace function public.resume_notion_sync_run(p_sync_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_run public.sync_runs%rowtype;
  v_connection public.integration_connections%rowtype;
begin
  select * into v_run from public.sync_runs where id = p_sync_run_id for update;
  select * into v_connection from public.integration_connections where id = v_run.integration_connection_id for update;
  if v_actor is null or v_run.id is null or v_run.state <> 'retry_scheduled'
    or not private.can_manage_notion_integration(v_connection.organization_id) then
    raise exception 'notion_retry_not_authorized';
  end if;
  update public.sync_runs
  set state = 'queued', next_attempt_at = null, error_code = null, completed_at = null,
      initiated_by_user_id = v_actor
  where id = v_run.id;
  if v_run.webhook_event_id is not null then
    update public.webhook_events set state = 'processing' where id = v_run.webhook_event_id;
  end if;
  insert into public.integration_audit_events (integration_connection_id, organization_id, actor_user_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, v_actor, 'sync_retry_resumed', jsonb_build_object('sync_run_id', v_run.id));
  return v_run.id;
end;
$$;

create or replace function public.resolve_notion_sync_conflict(p_conflict_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_conflict public.sync_conflicts%rowtype;
  v_connection public.integration_connections%rowtype;
begin
  select * into v_conflict from public.sync_conflicts where id = p_conflict_id for update;
  select * into v_connection from public.integration_connections where id = v_conflict.integration_connection_id for update;
  if v_actor is null or v_conflict.id is null or v_conflict.state <> 'open'
    or not private.can_manage_notion_integration(v_connection.organization_id) then
    raise exception 'notion_conflict_not_authorized';
  end if;
  update public.sync_conflicts
  set state = 'resolved', resolved_by_user_id = v_actor, resolved_at = now()
  where id = v_conflict.id;
  insert into public.integration_audit_events (integration_connection_id, organization_id, actor_user_id, event_type, metadata)
  values (v_connection.id, v_connection.organization_id, v_actor, 'sync_conflict_resolved', jsonb_build_object('conflict_id', v_conflict.id));
  return true;
end;
$$;

alter table public.integration_connections enable row level security;
alter table public.notion_object_links enable row level security;
alter table public.sync_cursors enable row level security;
alter table public.webhook_events enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_conflicts enable row level security;
alter table public.dead_letter_events enable row level security;
alter table public.integration_audit_events enable row level security;

create policy integration_connections_admin_select on public.integration_connections
for select to authenticated using (private.can_manage_notion_integration(organization_id));
create policy notion_object_links_project_select on public.notion_object_links
for select to authenticated using (private.can_view_project(project_id));
create policy sync_cursors_admin_select on public.sync_cursors
for select to authenticated using (exists (select 1 from public.integration_connections connection where connection.id = integration_connection_id and private.can_manage_notion_integration(connection.organization_id)));
create policy webhook_events_admin_select on public.webhook_events
for select to authenticated using (exists (select 1 from public.integration_connections connection where connection.id = integration_connection_id and private.can_manage_notion_integration(connection.organization_id)));
create policy sync_runs_admin_select on public.sync_runs
for select to authenticated using (exists (select 1 from public.integration_connections connection where connection.id = integration_connection_id and private.can_manage_notion_integration(connection.organization_id)));
create policy sync_conflicts_admin_select on public.sync_conflicts
for select to authenticated using (exists (select 1 from public.integration_connections connection where connection.id = integration_connection_id and private.can_manage_notion_integration(connection.organization_id)));
create policy dead_letter_events_admin_select on public.dead_letter_events
for select to authenticated using (exists (select 1 from public.integration_connections connection where connection.id = integration_connection_id and private.can_manage_notion_integration(connection.organization_id)));
create policy integration_audit_events_admin_select on public.integration_audit_events
for select to authenticated using (private.can_manage_notion_integration(organization_id));

revoke all on public.integration_connections, public.notion_object_links,
  public.sync_cursors, public.webhook_events, public.sync_runs, public.sync_conflicts,
  public.dead_letter_events, public.integration_audit_events from anon, authenticated;
grant select on public.integration_connections, public.notion_object_links,
  public.sync_cursors, public.webhook_events, public.sync_runs, public.sync_conflicts,
  public.dead_letter_events, public.integration_audit_events to authenticated;

revoke all on function private.can_manage_notion_integration(uuid),
  private.valid_notion_field_mappings(jsonb), private.enforce_notion_project_ownership()
  from public, anon, authenticated;
revoke all on function public.configure_notion_integration(uuid, text, text, text, text, jsonb) from public, anon;
revoke all on function public.activate_notion_integration(uuid) from public, anon;
revoke all on function public.replay_notion_dead_letter(uuid) from public, anon;
revoke all on function public.resume_notion_sync_run(uuid) from public, anon;
revoke all on function public.resolve_notion_sync_conflict(uuid) from public, anon;
revoke all on function public.accept_notion_webhook_event(text, text, text, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.apply_notion_project_import(uuid, text, timestamptz, text, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.record_notion_sync_failure(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.configure_notion_integration(uuid, text, text, text, text, jsonb),
  public.activate_notion_integration(uuid), public.replay_notion_dead_letter(uuid),
  public.resume_notion_sync_run(uuid), public.resolve_notion_sync_conflict(uuid) to authenticated;
grant execute on function public.accept_notion_webhook_event(text, text, text, text, timestamptz, text, text),
  public.apply_notion_project_import(uuid, text, timestamptz, text, timestamptz, timestamptz, text),
  public.record_notion_sync_failure(uuid, text, text, timestamptz) to service_role;

comment on table public.integration_connections is
  'Reference-only metadata for the single organization-managed Notion internal integration. Tokens remain server deployment secrets.';
