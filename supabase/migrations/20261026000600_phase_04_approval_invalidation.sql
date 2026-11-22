-- Phase 04: approval invalidation policy accepted in A-023.
-- Historical decisions remain immutable. Approval-sensitive changes move the
-- current workflow into changes_requested so that a new immutable caption
-- version and workflow instance are required. Scheduled publication time is
-- the only metadata change that preserves approval.

alter table public.content_items
  add column scheduled_publication_at timestamptz,
  add column approval_policy_fingerprint text
    check (
      approval_policy_fingerprint is null
      or approval_policy_fingerprint ~ '^[0-9a-f]{64}$'
    );

comment on column public.content_items.scheduled_publication_at is
  'Planning timestamp only. Changing it does not invalidate caption approval.';
comment on column public.content_items.approval_policy_fingerprint is
  'Hash of the evaluated policy inputs. A changed hash invalidates the current approval.';

create or replace function private.invalidate_content_approval(
  p_content_item_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_instance public.workflow_instances%rowtype;
begin
  select * into v_instance
  from public.workflow_instances
  where content_item_id = p_content_item_id
    and status in ('in_review', 'approved')
  order by created_at desc
  limit 1
  for update;

  if v_instance.id is null then
    return false;
  end if;

  if v_actor is null or nullif(btrim(p_reason), '') is null then
    raise exception 'access denied' using errcode = '42501';
  end if;

  update public.workflow_instances
  set status = 'changes_requested',
      current_step_id = null
  where id = v_instance.id;

  update public.content_items
  set status = 'changes_requested',
      record_version = record_version + 1
  where id = p_content_item_id;

  insert into public.workflow_audit_events (
    organization_id,
    project_id,
    content_item_id,
    caption_version_id,
    workflow_instance_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    reason
  ) values (
    v_instance.organization_id,
    v_instance.project_id,
    v_instance.content_item_id,
    v_instance.caption_version_id,
    v_instance.id,
    v_actor,
    'reopened',
    v_instance.status,
    'changes_requested',
    btrim(p_reason)
  );

  insert into public.workflow_notifications (
    recipient_user_id,
    organization_id,
    content_item_id,
    workflow_instance_id,
    caption_version_id,
    kind
  )
  select
    version.submitted_by_user_id,
    v_instance.organization_id,
    v_instance.content_item_id,
    v_instance.id,
    v_instance.caption_version_id,
    'changes_requested'
  from public.caption_versions version
  where version.id = v_instance.caption_version_id
    and version.submitted_by_user_id is distinct from v_actor;

  return true;
end;
$$;

create or replace function private.invalidate_approval_from_caption_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or old.editor_json is distinct from new.editor_json
    or old.plain_text is distinct from new.plain_text
    or old.normalized_text is distinct from new.normalized_text then
    perform private.invalidate_content_approval(
      new.content_item_id,
      'caption_content_changed'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists caption_drafts_invalidate_approval
  on public.caption_drafts;
create trigger caption_drafts_invalidate_approval
after insert or update of editor_json, plain_text, normalized_text
on public.caption_drafts
for each row execute function private.invalidate_approval_from_caption_draft();

create or replace function private.invalidate_approval_from_content_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.title is distinct from new.title
    or old.content_format_id is distinct from new.content_format_id
    or old.is_special_case is distinct from new.is_special_case
    or old.special_case_reason is distinct from new.special_case_reason
    or old.approval_policy_fingerprint is distinct from new.approval_policy_fingerprint then
    perform private.invalidate_content_approval(
      new.id,
      case
        when old.approval_policy_fingerprint is distinct from new.approval_policy_fingerprint
          then 'evaluated_policy_changed'
        else 'approval_sensitive_metadata_changed'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists content_items_invalidate_approval
  on public.content_items;
create trigger content_items_invalidate_approval
after update of title, content_format_id, is_special_case,
  special_case_reason, approval_policy_fingerprint
on public.content_items
for each row execute function private.invalidate_approval_from_content_metadata();

create or replace function private.invalidate_approval_from_related_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_item_id uuid;
  v_reason text;
begin
  v_content_item_id := case
    when tg_op = 'DELETE' then old.content_item_id
    else new.content_item_id
  end;

  v_reason := case tg_table_name
    when 'content_publication_channels' then 'destination_platforms_changed'
    when 'deliverables' then 'deliverable_links_changed'
    when 'content_item_assignments' then 'content_assignments_changed'
    else 'approval_sensitive_related_record_changed'
  end;

  perform private.invalidate_content_approval(v_content_item_id, v_reason);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists content_publication_channels_invalidate_approval
  on public.content_publication_channels;
create trigger content_publication_channels_invalidate_approval
after insert or update or delete on public.content_publication_channels
for each row execute function private.invalidate_approval_from_related_record();

drop trigger if exists deliverables_invalidate_approval
  on public.deliverables;
create trigger deliverables_invalidate_approval
after insert or update or delete on public.deliverables
for each row execute function private.invalidate_approval_from_related_record();

drop trigger if exists content_item_assignments_invalidate_approval
  on public.content_item_assignments;
create trigger content_item_assignments_invalidate_approval
after insert or update or delete on public.content_item_assignments
for each row execute function private.invalidate_approval_from_related_record();

-- Approved and in-review content may be revised, but the draft trigger above
-- atomically reopens review before the changed draft can be submitted again.
create or replace function public.save_caption_draft(
  p_content_item_id uuid,
  p_expected_version integer,
  p_editor_json jsonb,
  p_plain_text text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items%rowtype;
  v_draft public.caption_drafts%rowtype;
  v_actor uuid := auth.uid();
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  if v_item.id is null
    or v_actor is null
    or not private.can_edit_content(v_item.id)
    or v_item.status in ('published', 'archived') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  select * into v_draft
  from public.caption_drafts
  where content_item_id = v_item.id
  for update;

  if v_draft.content_item_id is null then
    if p_expected_version <> 0 then
      raise exception 'stale version' using errcode = '40001';
    end if;

    insert into public.caption_drafts (
      content_item_id,
      editor_json,
      plain_text,
      normalized_text,
      updated_by_user_id
    ) values (
      v_item.id,
      p_editor_json,
      p_plain_text,
      lower(btrim(p_plain_text)),
      v_actor
    );
  elsif v_draft.draft_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
  else
    update public.caption_drafts
    set editor_json = p_editor_json,
        plain_text = p_plain_text,
        normalized_text = lower(btrim(p_plain_text)),
        draft_version = draft_version + 1,
        updated_by_user_id = v_actor
    where content_item_id = v_item.id;
  end if;

  return true;
end;
$$;

-- Replace the earlier metadata operation so an approved record can be revised.
-- Tag changes are compared as sets before the delete/insert replacement.
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
  v_existing_tag_slugs text[];
  v_requested_tag_slugs text[];
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  select * into v_format
  from public.content_formats
  where slug = p_format_slug and active;

  if v_item.id is null
    or not private.can_edit_content(v_item.id)
    or v_item.status in ('published', 'archived') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_item.record_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
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

  select coalesce(array_agg(tag.slug order by tag.slug), array[]::text[])
  into v_existing_tag_slugs
  from public.content_item_tags item_tag
  join public.content_tags tag on tag.id = item_tag.content_tag_id
  where item_tag.content_item_id = v_item.id;

  select coalesce(array_agg(tag_slug order by tag_slug), array[]::text[])
  into v_requested_tag_slugs
  from unnest(p_tag_slugs) as tag_slug;

  if v_item.title is distinct from btrim(p_title)
    or v_item.content_format_id is distinct from v_format.id
    or v_item.is_special_case is distinct from p_is_special_case
    or v_item.special_case_reason is distinct from v_special_case_reason
    or v_existing_tag_slugs is distinct from v_requested_tag_slugs then
    perform private.invalidate_content_approval(
      v_item.id,
      'approval_sensitive_metadata_changed'
    );
  end if;

  delete from public.content_item_tags
  where content_item_id = v_item.id;

  update public.content_items
  set title = btrim(p_title),
      content_format_id = v_format.id,
      is_special_case = p_is_special_case,
      special_case_reason = v_special_case_reason,
      record_version = record_version + 1
  where id = v_item.id;

  insert into public.content_item_tags (
    content_item_id,
    content_format_id,
    content_tag_id
  )
  select v_item.id, v_format.id, tag.id
  from public.content_tags tag
  where tag.slug = any(p_tag_slugs);

  insert into public.project_content_audit_events (
    organization_id,
    actor_user_id,
    project_id,
    content_item_id,
    event_type,
    reason_code,
    metadata
  ) values (
    v_item.organization_id,
    v_actor,
    v_item.project_id,
    v_item.id,
    'content_updated',
    'authorized_content_metadata_update',
    jsonb_build_object('previous_record_version', v_item.record_version)
  );

  if v_item.is_special_case is distinct from p_is_special_case
    or v_item.special_case_reason is distinct from v_special_case_reason then
    insert into public.project_content_audit_events (
      organization_id,
      actor_user_id,
      project_id,
      content_item_id,
      event_type,
      reason_code,
      metadata
    ) values (
      v_item.organization_id,
      v_actor,
      v_item.project_id,
      v_item.id,
      'content_special_case_changed',
      'descriptive_special_case_change',
      jsonb_build_object('is_special_case', p_is_special_case)
    );
  end if;

  return true;
end;
$$;

create or replace function public.update_scheduled_publication_time(
  p_content_item_id uuid,
  p_expected_version integer,
  p_scheduled_publication_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  if v_item.id is null
    or v_actor is null
    or not private.can_edit_content(v_item.id)
    or v_item.status in ('published', 'archived') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_item.record_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
  end if;

  update public.content_items
  set scheduled_publication_at = p_scheduled_publication_at,
      record_version = record_version + 1
  where id = v_item.id;

  insert into public.project_content_audit_events (
    organization_id,
    actor_user_id,
    project_id,
    content_item_id,
    event_type,
    reason_code,
    metadata
  ) values (
    v_item.organization_id,
    v_actor,
    v_item.project_id,
    v_item.id,
    'content_updated',
    'scheduled_publication_time_changed',
    jsonb_build_object(
      'previous_scheduled_publication_at', v_item.scheduled_publication_at,
      'scheduled_publication_at', p_scheduled_publication_at
    )
  );

  return true;
end;
$$;

create or replace function public.record_content_policy_evaluation(
  p_content_item_id uuid,
  p_expected_version integer,
  p_policy_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items%rowtype;
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  if v_item.id is null
    or auth.uid() is null
    or not private.can_edit_content(v_item.id)
    or v_item.status in ('published', 'archived') then
    raise exception 'access denied' using errcode = '42501';
  end if;

  if v_item.record_version <> p_expected_version then
    raise exception 'stale version' using errcode = '40001';
  end if;

  if p_policy_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid policy fingerprint' using errcode = '22023';
  end if;

  update public.content_items
  set approval_policy_fingerprint = p_policy_fingerprint,
      record_version = record_version + 1
  where id = v_item.id;

  return true;
end;
$$;

revoke all on function private.invalidate_content_approval(uuid, text),
  private.invalidate_approval_from_caption_draft(),
  private.invalidate_approval_from_content_metadata(),
  private.invalidate_approval_from_related_record()
  from public, anon, authenticated;

revoke all on function public.update_scheduled_publication_time(
  uuid,
  integer,
  timestamptz
), public.record_content_policy_evaluation(uuid, integer, text)
  from public, anon;

grant execute on function public.update_scheduled_publication_time(
  uuid,
  integer,
  timestamptz
), public.record_content_policy_evaluation(uuid, integer, text)
  to authenticated;

