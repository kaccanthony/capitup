-- Bind one Notion posting row to one CapItUp content item before publishing
-- its link. Existing project-level links remain unbound until an editor opens
-- the intended content item and explicitly retries link sync.

alter table public.notion_object_links
  drop constraint if exists notion_object_links_integration_connection_id_project_id_key,
  add column content_item_id uuid;

alter table public.notion_object_links
  add constraint notion_object_links_content_item_project_fk
    foreign key (content_item_id, project_id)
    references public.content_items(id, project_id)
    on delete restrict;

create unique index notion_object_links_content_item_unique_idx
  on public.notion_object_links (integration_connection_id, content_item_id)
  where content_item_id is not null;

create or replace function public.claim_notion_content_item_link(
  p_project_id uuid,
  p_content_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_item_project_id uuid;
  v_item_organization_id uuid;
  v_link_id uuid;
  v_link_count integer;
  v_updated integer;
begin
  if v_actor_id is null then
    return false;
  end if;

  select item.project_id, item.organization_id
    into v_item_project_id, v_item_organization_id
  from public.content_items item
  where item.id = p_content_item_id;

  if v_item_project_id is distinct from p_project_id then
    return false;
  end if;
  if not (
    private.can_edit_content(p_content_item_id)
    or private.can_manage_notion_integration(v_item_organization_id)
  ) then
    return false;
  end if;

  select count(*), (array_agg(link.id order by link.created_at))[1]
    into v_link_count, v_link_id
  from public.notion_object_links link
  join public.integration_connections connection
    on connection.id = link.integration_connection_id
  where link.project_id = p_project_id
    and connection.provider = 'notion'
    and connection.status = 'active';

  -- A project with several Notion rows needs an explicit page-to-item choice.
  if v_link_count <> 1 then
    return false;
  end if;

  update public.notion_object_links
  set content_item_id = p_content_item_id
  where id = v_link_id
    and (content_item_id is null or content_item_id = p_content_item_id);

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.claim_notion_content_item_link(uuid, uuid)
  from public, anon;
grant execute on function public.claim_notion_content_item_link(uuid, uuid)
  to authenticated;

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
    or jsonb_array_length(p_mappings) > 4 then
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
      or (v_field = 'deep_link' and (v_direction <> 'export' or v_property_type <> 'url'))
      or v_field not in ('project_title', 'event_start_at', 'deadline_at', 'deep_link') then
      return false;
    end if;
  end loop;

  return v_required <@ v_seen;
end;
$$;

revoke all on function private.valid_notion_field_mappings(jsonb)
  from public, anon, authenticated;
