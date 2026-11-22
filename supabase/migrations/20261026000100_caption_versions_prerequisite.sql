-- Narrow prerequisite for Phase 04: mutable drafts and immutable submitted snapshots.
create table public.caption_drafts (
  content_item_id uuid primary key references public.content_items(id) on delete cascade,
  editor_json jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  plain_text text not null default '',
  normalized_text text not null default '',
  draft_version integer not null default 1 check (draft_version > 0),
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caption_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  editor_json jsonb not null,
  plain_text text not null,
  normalized_text text not null,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  unique (content_item_id, version_number)
);

create index caption_versions_content_time_idx on public.caption_versions (content_item_id, submitted_at desc);
create trigger caption_drafts_set_updated_at before update on public.caption_drafts for each row execute function private.set_updated_at();

create or replace function public.save_caption_draft(p_content_item_id uuid, p_expected_version integer, p_editor_json jsonb, p_plain_text text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_item public.content_items%rowtype; v_draft public.caption_drafts%rowtype; v_actor uuid := auth.uid();
begin
  select * into v_item from public.content_items where id = p_content_item_id for update;
  if v_item.id is null or v_actor is null or not private.can_edit_content(v_item.id) or v_item.status <> 'draft' then raise exception 'access denied' using errcode = '42501'; end if;
  select * into v_draft from public.caption_drafts where content_item_id = v_item.id for update;
  if v_draft.content_item_id is null then
    if p_expected_version <> 0 then raise exception 'stale version' using errcode = '40001'; end if;
    insert into public.caption_drafts (content_item_id, editor_json, plain_text, normalized_text, updated_by_user_id) values (v_item.id, p_editor_json, p_plain_text, lower(btrim(p_plain_text)), v_actor);
  elsif v_draft.draft_version <> p_expected_version then raise exception 'stale version' using errcode = '40001';
  else update public.caption_drafts set editor_json = p_editor_json, plain_text = p_plain_text, normalized_text = lower(btrim(p_plain_text)), draft_version = draft_version + 1, updated_by_user_id = v_actor where content_item_id = v_item.id; end if;
  return true;
end; $$;

create or replace function public.submit_caption_version(p_content_item_id uuid, p_expected_draft_version integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_item public.content_items%rowtype; v_draft public.caption_drafts%rowtype; v_actor uuid := auth.uid(); v_version_id uuid; v_number integer;
begin
  select * into v_item from public.content_items where id = p_content_item_id for update;
  if v_item.id is null or v_actor is null or not private.can_edit_content(v_item.id) or v_item.status <> 'draft' then raise exception 'access denied' using errcode = '42501'; end if;
  select * into v_draft from public.caption_drafts where content_item_id = v_item.id for update;
  if v_draft.content_item_id is null or v_draft.draft_version <> p_expected_draft_version then raise exception 'stale version' using errcode = '40001'; end if;
  select coalesce(max(version_number), 0) + 1 into v_number from public.caption_versions where content_item_id = v_item.id;
  insert into public.caption_versions (organization_id, project_id, content_item_id, version_number, editor_json, plain_text, normalized_text, submitted_by_user_id) values (v_item.organization_id, v_item.project_id, v_item.id, v_number, v_draft.editor_json, v_draft.plain_text, v_draft.normalized_text, v_actor) returning id into v_version_id;
  update public.content_items set status = 'in_review', record_version = record_version + 1 where id = v_item.id;
  return v_version_id;
end; $$;

alter table public.caption_drafts enable row level security;
alter table public.caption_versions enable row level security;
create policy caption_drafts_select_authorized on public.caption_drafts for select to authenticated using (private.can_view_content_item(content_item_id));
create policy caption_versions_select_authorized on public.caption_versions for select to authenticated using (private.can_view_content_item(content_item_id));
revoke all on public.caption_drafts, public.caption_versions from anon, authenticated;
grant select on public.caption_drafts, public.caption_versions to authenticated;
revoke all on function public.save_caption_draft(uuid, integer, jsonb, text), public.submit_caption_version(uuid, integer) from public, anon;
grant execute on function public.save_caption_draft(uuid, integer, jsonb, text), public.submit_caption_version(uuid, integer) to authenticated;
