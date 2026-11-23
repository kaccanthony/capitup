-- Keep Notion-owned scheduling state and people references separate from
-- CapItUp editorial status and project-membership assignments.
alter table public.notion_object_links
  add column notion_post_status text,
  add column notion_assignee_user_ids text[] not null default '{}'::text[],
  add constraint notion_object_links_post_status_check check (
    notion_post_status is null or notion_post_status in (
      'NOT POSTED YET', 'SCHEDULED', 'POSTPONED', 'CANCELLED', 'NOT NEEDED', 'POSTED'
    )
  ),
  add constraint notion_object_links_assignee_refs_check check (
    cardinality(notion_assignee_user_ids) <= 100
    and array_position(notion_assignee_user_ids, null) is null
  );

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
      or (v_field = 'post_status' and (v_direction <> 'import' or v_property_type <> 'status'))
      or (v_field = 'assignee_refs' and (v_direction <> 'import' or v_property_type <> 'people'))
      or (v_field = 'deep_link' and (v_direction <> 'export' or v_property_type <> 'url'))
      or v_field not in ('project_title', 'event_start_at', 'deadline_at', 'post_status', 'assignee_refs', 'deep_link') then
      return false;
    end if;
  end loop;

  return v_required <@ v_seen;
end;
$$;

create or replace function public.apply_notion_posting_metadata_import(
  p_webhook_event_id uuid,
  p_external_page_id text,
  p_external_edited_at timestamptz,
  p_title text,
  p_event_starts_at timestamptz,
  p_deadline_at timestamptz,
  p_post_status text,
  p_post_status_mapped boolean,
  p_assignee_user_ids text[],
  p_assignee_refs_mapped boolean,
  p_payload_hash text
)
returns table (project_id uuid, applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_import record;
  v_connection_id uuid;
  v_updated integer;
begin
  if p_post_status is not null and p_post_status not in (
    'NOT POSTED YET', 'SCHEDULED', 'POSTPONED', 'CANCELLED', 'NOT NEEDED', 'POSTED'
  ) then
    raise exception 'notion_post_status_invalid';
  end if;
  if coalesce(cardinality(p_assignee_user_ids), 0) > 100
    or exists (
      select 1 from unnest(coalesce(p_assignee_user_ids, '{}'::text[])) as external_user_id
      where external_user_id is null
        or btrim(external_user_id) = ''
        or char_length(external_user_id) > 200
    ) then
    raise exception 'notion_assignee_refs_invalid';
  end if;

  select integration_connection_id into v_connection_id
  from public.webhook_events where id = p_webhook_event_id;
  if v_connection_id is null then
    raise exception 'notion_webhook_event_missing';
  end if;

  -- Reuse the existing idempotent importer and keep the metadata write in the
  -- same transaction, so a failure cannot mark the event successful alone.
  select * into v_import from public.apply_notion_project_import(
    p_webhook_event_id, p_external_page_id, p_external_edited_at,
    p_title, p_event_starts_at, p_deadline_at, p_payload_hash
  );

  if v_import.applied then
    update public.notion_object_links
    set notion_post_status = case
          when p_post_status_mapped then p_post_status
          else notion_post_status
        end,
        notion_assignee_user_ids = case
          when p_assignee_refs_mapped then coalesce(p_assignee_user_ids, '{}'::text[])
          else notion_assignee_user_ids
        end
    where integration_connection_id = v_connection_id
      and notion_page_id = btrim(p_external_page_id);
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'notion_posting_link_missing';
    end if;
  end if;

  return query select v_import.project_id, v_import.applied;
end;
$$;

revoke all on function public.apply_notion_posting_metadata_import(
  uuid, text, timestamptz, text, timestamptz, timestamptz, text, boolean,
  text[], boolean, text
) from public, anon, authenticated;
grant execute on function public.apply_notion_posting_metadata_import(
  uuid, text, timestamptz, text, timestamptz, timestamptz, text, boolean,
  text[], boolean, text
) to service_role;

comment on column public.notion_object_links.notion_post_status is
  'Notion-owned posting schedule status; never used as CapItUp editorial or approval status.';
comment on column public.notion_object_links.notion_assignee_user_ids is
  'Notion external user IDs only; never treated as CapItUp memberships or assignments.';
