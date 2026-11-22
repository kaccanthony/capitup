-- Phase 05: managed Liveblocks transport with Supabase-canonical durable
-- collaboration records. This migration is additive and remains unapplied.

create type public.collaboration_access_mode as enum ('read', 'write');
create type public.collaboration_suggestion_kind as enum ('insert', 'delete', 'replace');
create type public.collaboration_suggestion_state as enum ('open', 'accepted', 'rejected', 'stale');
create type public.caption_reaction_kind as enum ('looks_ready', 'needs_refinement');

create table public.collaboration_documents (
  content_item_id uuid primary key references public.content_items(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  room_id text not null unique check (char_length(room_id) between 1 and 256),
  field_name text not null default 'caption' check (field_name = 'caption'),
  document_revision bigint not null default 0 check (document_revision >= 0),
  latest_snapshot_version_id text,
  latest_snapshot_hash text check (
    latest_snapshot_hash is null or latest_snapshot_hash ~ '^[0-9a-f]{64}$'
  ),
  latest_snapshot_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_documents_item_organization_fk
    foreign key (content_item_id, organization_id)
    references public.content_items(id, organization_id) on delete cascade,
  constraint collaboration_documents_item_project_fk
    foreign key (content_item_id, project_id)
    references public.content_items(id, project_id) on delete cascade
);

create table public.collaboration_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_mode public.collaboration_access_mode not null,
  authorized_at timestamptz not null default now(),
  last_revalidated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours'),
  revoked_at timestamptz,
  revocation_reason text,
  constraint collaboration_sessions_expiry check (expires_at > authorized_at),
  constraint collaboration_sessions_revocation check (
    (revoked_at is null and revocation_reason is null)
    or (revoked_at is not null and nullif(btrim(revocation_reason), '') is not null)
  )
);

create index collaboration_sessions_active_user_content_idx
  on public.collaboration_sessions (user_id, content_item_id, expires_at desc)
  where revoked_at is null;
create index collaboration_sessions_active_project_idx
  on public.collaboration_sessions (project_id, user_id)
  where revoked_at is null;

create table public.collaboration_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  anchor jsonb not null check (jsonb_typeof(anchor) = 'object'),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  resolved_by_user_id uuid references auth.users(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_threads_resolution check (
    (resolved_at is null and resolved_by_user_id is null)
    or (resolved_at is not null and resolved_by_user_id is not null)
  )
);

create index collaboration_threads_content_time_idx
  on public.collaboration_threads (content_item_id, created_at desc);

create table public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.collaboration_threads(id) on delete cascade,
  parent_comment_id uuid references public.collaboration_comments(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (
    body = btrim(body) and char_length(body) between 1 and 5000
  ),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index collaboration_comments_thread_time_idx
  on public.collaboration_comments (thread_id, created_at);

create table public.collaboration_mentions (
  comment_id uuid not null references public.collaboration_comments(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create table public.collaboration_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  kind public.collaboration_suggestion_kind not null,
  anchor jsonb not null check (jsonb_typeof(anchor) = 'object'),
  source_text text not null check (char_length(source_text) <= 10000),
  replacement_text text not null check (char_length(replacement_text) <= 10000),
  state public.collaboration_suggestion_state not null default 'open',
  record_version integer not null default 1 check (record_version > 0),
  decided_by_user_id uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 2000),
  applied_by_user_id uuid references auth.users(id) on delete restrict,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collaboration_suggestions_content check (
    (kind = 'insert' and source_text = '' and replacement_text <> '')
    or (kind = 'delete' and source_text <> '' and replacement_text = '')
    or (kind = 'replace' and source_text <> '' and replacement_text <> '')
  ),
  constraint collaboration_suggestions_decision check (
    (state = 'open' and decided_by_user_id is null and decided_at is null)
    or (state <> 'open' and decided_by_user_id is not null and decided_at is not null)
  ),
  constraint collaboration_suggestions_application check (
    (applied_at is null and applied_by_user_id is null)
    or (
      state = 'accepted'
      and applied_at is not null
      and applied_by_user_id is not null
    )
  )
);

create index collaboration_suggestions_content_state_idx
  on public.collaboration_suggestions (content_item_id, state, created_at desc);

create table public.caption_reactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  caption_version_id uuid not null references public.caption_versions(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  kind public.caption_reaction_kind not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caption_version_id, actor_user_id),
  check (
    (kind = 'looks_ready' and comment is null)
    or (
      kind = 'needs_refinement'
      and comment is not null
      and char_length(btrim(comment)) between 1 and 1000
    )
  )
);

create index caption_reactions_version_kind_idx
  on public.caption_reactions (caption_version_id, kind, updated_at desc);

create table public.collaboration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  thread_id uuid references public.collaboration_threads(id) on delete restrict,
  comment_id uuid references public.collaboration_comments(id) on delete restrict,
  suggestion_id uuid references public.collaboration_suggestions(id) on delete restrict,
  reaction_id uuid references public.caption_reactions(id) on delete set null,
  event_type text not null check (event_type in (
    'session_authorized',
    'session_revalidated',
    'session_revoked',
    'comment_created',
    'reply_created',
    'thread_resolved',
    'thread_reopened',
    'suggestion_created',
    'suggestion_accepted',
    'suggestion_rejected',
    'suggestion_applied',
    'reaction_set',
    'reaction_removed',
    'snapshot_submitted'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index collaboration_audit_content_time_idx
  on public.collaboration_audit_events (content_item_id, created_at desc);

alter table public.caption_versions
  add column collaboration_room_id text,
  add column collaboration_snapshot_version_id text,
  add column collaboration_document_revision bigint,
  add column snapshot_hash text check (
    snapshot_hash is null or snapshot_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint caption_versions_collaboration_snapshot_check check (
    (
      collaboration_room_id is null
      and collaboration_snapshot_version_id is null
      and collaboration_document_revision is null
      and snapshot_hash is null
    )
    or (
      collaboration_room_id is not null
      and collaboration_snapshot_version_id is not null
      and collaboration_document_revision is not null
      and snapshot_hash is not null
    )
  );

create trigger collaboration_documents_set_updated_at
before update on public.collaboration_documents
for each row execute function private.set_updated_at();

create trigger collaboration_threads_set_updated_at
before update on public.collaboration_threads
for each row execute function private.set_updated_at();

create trigger collaboration_suggestions_set_updated_at
before update on public.collaboration_suggestions
for each row execute function private.set_updated_at();

create or replace function private.valid_collaboration_anchor(p_anchor jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    jsonb_typeof(p_anchor) = 'object'
    and jsonb_typeof(p_anchor -> 'from') = 'number'
    and jsonb_typeof(p_anchor -> 'to') = 'number'
    and jsonb_typeof(p_anchor -> 'quote') = 'string'
    and scale((p_anchor ->> 'from')::numeric) = 0
    and scale((p_anchor ->> 'to')::numeric) = 0
    and (p_anchor ->> 'from')::numeric between 0 and 2147483647
    and (p_anchor ->> 'to')::numeric between (p_anchor ->> 'from')::numeric and 2147483647
    and char_length(p_anchor ->> 'quote') <= 10000
    and (
      not (p_anchor ? 'fromRelative')
      or (
        jsonb_typeof(p_anchor -> 'fromRelative') = 'string'
        and char_length(p_anchor ->> 'fromRelative') <= 4096
      )
    )
    and (
      not (p_anchor ? 'toRelative')
      or (
        jsonb_typeof(p_anchor -> 'toRelative') = 'string'
        and char_length(p_anchor ->> 'toRelative') <= 4096
      )
    )
  ), false);
$$;

create or replace function private.can_review_content(p_content_item_id uuid)
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
      and private.has_active_membership(item.organization_id)
      and (
        private.has_organization_role(item.organization_id, 'publicity_director')
        or private.has_organization_role(item.organization_id, 'pro')
        or exists (
          select 1
          from public.content_item_assignments content_assignment
          join public.project_assignments project_assignment
            on project_assignment.id = content_assignment.project_assignment_id
          where content_assignment.content_item_id = item.id
            and content_assignment.responsibility = 'reviewer'
            and content_assignment.revoked_at is null
            and project_assignment.membership_id = private.current_membership_id(item.organization_id)
            and private.is_current_project_assignment(project_assignment.id)
        )
      )
  );
$$;

create or replace function private.collaboration_mode_for_content(p_content_item_id uuid)
returns public.collaboration_access_mode
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status public.content_status;
begin
  select status into v_status
  from public.content_items
  where id = p_content_item_id;

  if not private.can_view_content_item(p_content_item_id) then
    return null;
  end if;

  if v_status in ('draft', 'changes_requested')
    and private.can_edit_content(p_content_item_id) then
    return 'write';
  end if;

  return 'read';
end;
$$;

create or replace function public.authorize_collaboration_session(
  p_content_item_id uuid
)
returns table (
  session_id uuid,
  user_id uuid,
  organization_id uuid,
  room_id text,
  access_mode public.collaboration_access_mode,
  expires_at timestamptz,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_mode public.collaboration_access_mode;
  v_session_id uuid;
  v_room_id text;
  v_expires_at timestamptz := now() + interval '4 hours';
  v_display_name text;
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id;

  v_mode := private.collaboration_mode_for_content(p_content_item_id);
  if v_actor is null or v_item.id is null or v_mode is null then
    raise exception 'collaboration access denied' using errcode = '42501';
  end if;

  v_room_id := 'capitup:' || v_item.organization_id::text || ':content:' || v_item.id::text;

  insert into public.collaboration_documents (
    content_item_id,
    organization_id,
    project_id,
    room_id
  ) values (
    v_item.id,
    v_item.organization_id,
    v_item.project_id,
    v_room_id
  )
  on conflict (content_item_id) do nothing;

  update public.collaboration_sessions
  set revoked_at = now(),
      revocation_reason = 'superseded_by_reauthorization'
  where content_item_id = v_item.id
    and user_id = v_actor
    and revoked_at is null;

  insert into public.collaboration_sessions (
    organization_id,
    project_id,
    content_item_id,
    user_id,
    access_mode,
    expires_at
  ) values (
    v_item.organization_id,
    v_item.project_id,
    v_item.id,
    v_actor,
    v_mode,
    v_expires_at
  ) returning id into v_session_id;

  select coalesce(nullif(btrim(profile.display_name), ''), 'CapItUp member')
  into v_display_name
  from public.profiles profile
  where profile.user_id = v_actor;

  v_display_name := coalesce(v_display_name, 'CapItUp member');

  insert into public.collaboration_audit_events (
    organization_id,
    project_id,
    content_item_id,
    actor_user_id,
    event_type,
    metadata
  ) values (
    v_item.organization_id,
    v_item.project_id,
    v_item.id,
    v_actor,
    'session_authorized',
    jsonb_build_object('access_mode', v_mode, 'expires_at', v_expires_at)
  );

  return query select
    v_session_id,
    v_actor,
    v_item.organization_id,
    v_room_id,
    v_mode,
    v_expires_at,
    v_display_name;
end;
$$;

create or replace function public.revalidate_collaboration_session(
  p_content_item_id uuid
)
returns table (
  session_id uuid,
  access_mode public.collaboration_access_mode,
  expires_at timestamptz,
  revoked boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_session public.collaboration_sessions%rowtype;
  v_mode public.collaboration_access_mode;
  v_reason text;
begin
  select * into v_session
  from public.collaboration_sessions
  where content_item_id = p_content_item_id
    and user_id = v_actor
  order by authorized_at desc
  limit 1
  for update;

  if v_actor is null or v_session.id is null then
    raise exception 'collaboration access denied' using errcode = '42501';
  end if;

  if v_session.revoked_at is not null then
    return query select
      v_session.id,
      v_session.access_mode,
      v_session.expires_at,
      true,
      v_session.revocation_reason;
    return;
  end if;

  if v_session.expires_at <= now() then
    v_reason := 'authorization_lease_expired';
  else
    v_mode := private.collaboration_mode_for_content(p_content_item_id);
    if v_mode is null then
      v_reason := 'collaboration_access_revoked';
    end if;
  end if;

  if v_reason is not null then
    update public.collaboration_sessions
    set revoked_at = now(),
        revocation_reason = v_reason,
        last_revalidated_at = now()
    where id = v_session.id;

    insert into public.collaboration_audit_events (
      organization_id,
      project_id,
      content_item_id,
      actor_user_id,
      event_type,
      metadata
    ) values (
      v_session.organization_id,
      v_session.project_id,
      v_session.content_item_id,
      v_actor,
      'session_revoked',
      jsonb_build_object('reason', v_reason)
    );

    return query select
      v_session.id,
      v_session.access_mode,
      v_session.expires_at,
      true,
      v_reason;
    return;
  end if;

  update public.collaboration_sessions
  set access_mode = v_mode,
      last_revalidated_at = now()
  where id = v_session.id;

  if v_mode is distinct from v_session.access_mode then
    insert into public.collaboration_audit_events (
      organization_id,
      project_id,
      content_item_id,
      actor_user_id,
      event_type,
      metadata
    ) values (
      v_session.organization_id,
      v_session.project_id,
      v_session.content_item_id,
      v_actor,
      'session_revalidated',
      jsonb_build_object(
        'previous_access_mode', v_session.access_mode,
        'access_mode', v_mode
      )
    );
  end if;

  return query select
    v_session.id,
    v_mode,
    v_session.expires_at,
    false,
    null::text;
end;
$$;

create or replace function private.revoke_collaboration_sessions_from_content_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content_item_id uuid;
begin
  v_content_item_id := case when tg_op = 'DELETE' then old.content_item_id else new.content_item_id end;
  update public.collaboration_sessions
  set revoked_at = now(),
      revocation_reason = 'content_assignment_changed'
  where content_item_id = v_content_item_id
    and revoked_at is null;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.revoke_collaboration_sessions_from_project_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.project_assignments%rowtype;
  v_user_id uuid;
begin
  v_assignment := case when tg_op = 'DELETE' then old else new end;
  select user_id into v_user_id
  from public.organization_memberships
  where id = v_assignment.membership_id;

  update public.collaboration_sessions
  set revoked_at = now(),
      revocation_reason = 'project_assignment_changed'
  where project_id = v_assignment.project_id
    and user_id = v_user_id
    and revoked_at is null;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.revoke_collaboration_sessions_from_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    or old.valid_until is distinct from new.valid_until
    or old.user_id is distinct from new.user_id then
    update public.collaboration_sessions
    set revoked_at = now(),
        revocation_reason = 'membership_changed'
    where organization_id = new.organization_id
      and user_id in (old.user_id, new.user_id)
      and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger collaboration_sessions_revoke_for_content_assignment
after insert or update or delete on public.content_item_assignments
for each row execute function private.revoke_collaboration_sessions_from_content_assignment();

create trigger collaboration_sessions_revoke_for_project_assignment
after insert or update or delete on public.project_assignments
for each row execute function private.revoke_collaboration_sessions_from_project_assignment();

create trigger collaboration_sessions_revoke_for_membership
after update of status, valid_until, user_id on public.organization_memberships
for each row execute function private.revoke_collaboration_sessions_from_membership();

create or replace function private.insert_collaboration_mentions(
  p_comment_id uuid,
  p_organization_id uuid,
  p_mentioned_user_ids uuid[]
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.collaboration_mentions (comment_id, mentioned_user_id)
  select p_comment_id, mentioned_user_id
  from unnest(coalesce(p_mentioned_user_ids, '{}'::uuid[]))
    as mentioned(mentioned_user_id)
  where exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = p_organization_id
      and membership.user_id = mentioned_user_id
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
  )
  on conflict do nothing;
$$;

create or replace function public.create_collaboration_thread(
  p_content_item_id uuid,
  p_anchor jsonb,
  p_body text,
  p_mentioned_user_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_thread_id uuid;
  v_comment_id uuid;
begin
  select * into v_item from public.content_items where id = p_content_item_id;
  if v_actor is null
    or v_item.id is null
    or not private.can_view_content_item(v_item.id)
    or not private.valid_collaboration_anchor(p_anchor)
    or nullif(btrim(p_body), '') is null
    or coalesce(cardinality(p_mentioned_user_ids), 0) > 50 then
    raise exception 'collaboration operation denied' using errcode = '42501';
  end if;

  insert into public.collaboration_threads (
    organization_id, project_id, content_item_id, anchor, created_by_user_id
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, p_anchor, v_actor
  ) returning id into v_thread_id;

  insert into public.collaboration_comments (
    thread_id, author_user_id, body
  ) values (
    v_thread_id, v_actor, btrim(p_body)
  ) returning id into v_comment_id;

  perform private.insert_collaboration_mentions(
    v_comment_id, v_item.organization_id, p_mentioned_user_ids
  );

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    thread_id, comment_id, event_type
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_actor,
    v_thread_id, v_comment_id, 'comment_created'
  );

  return v_thread_id;
end;
$$;

create or replace function public.reply_to_collaboration_thread(
  p_thread_id uuid,
  p_body text,
  p_mentioned_user_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_thread public.collaboration_threads%rowtype;
  v_comment_id uuid;
begin
  select * into v_thread
  from public.collaboration_threads
  where id = p_thread_id;

  if v_actor is null
    or v_thread.id is null
    or not private.can_view_content_item(v_thread.content_item_id)
    or nullif(btrim(p_body), '') is null
    or coalesce(cardinality(p_mentioned_user_ids), 0) > 50 then
    raise exception 'collaboration operation denied' using errcode = '42501';
  end if;

  insert into public.collaboration_comments (
    thread_id, author_user_id, body
  ) values (
    v_thread.id, v_actor, btrim(p_body)
  ) returning id into v_comment_id;

  perform private.insert_collaboration_mentions(
    v_comment_id, v_thread.organization_id, p_mentioned_user_ids
  );

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    thread_id, comment_id, event_type
  ) values (
    v_thread.organization_id, v_thread.project_id, v_thread.content_item_id,
    v_actor, v_thread.id, v_comment_id, 'reply_created'
  );

  return v_comment_id;
end;
$$;

create or replace function public.resolve_collaboration_thread(
  p_thread_id uuid,
  p_resolved boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_thread public.collaboration_threads%rowtype;
begin
  select * into v_thread
  from public.collaboration_threads
  where id = p_thread_id
  for update;

  if v_actor is null
    or v_thread.id is null
    or not private.can_view_content_item(v_thread.content_item_id)
    or not (
      v_thread.created_by_user_id = v_actor
      or private.can_review_content(v_thread.content_item_id)
    ) then
    raise exception 'collaboration operation denied' using errcode = '42501';
  end if;

  update public.collaboration_threads
  set resolved_by_user_id = case when p_resolved then v_actor else null end,
      resolved_at = case when p_resolved then now() else null end
  where id = v_thread.id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    thread_id, event_type
  ) values (
    v_thread.organization_id, v_thread.project_id, v_thread.content_item_id,
    v_actor, v_thread.id,
    case when p_resolved then 'thread_resolved' else 'thread_reopened' end
  );

  return true;
end;
$$;

create or replace function public.create_collaboration_suggestion(
  p_content_item_id uuid,
  p_kind public.collaboration_suggestion_kind,
  p_anchor jsonb,
  p_source_text text,
  p_replacement_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_suggestion_id uuid;
begin
  select * into v_item from public.content_items where id = p_content_item_id;
  if v_actor is null
    or v_item.id is null
    or not (private.can_edit_content(v_item.id) or private.can_review_content(v_item.id))
    or not private.valid_collaboration_anchor(p_anchor) then
    raise exception 'collaboration operation denied' using errcode = '42501';
  end if;

  insert into public.collaboration_suggestions (
    organization_id, project_id, content_item_id, author_user_id,
    kind, anchor, source_text, replacement_text
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_actor,
    p_kind, p_anchor, p_source_text, p_replacement_text
  ) returning id into v_suggestion_id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    suggestion_id, event_type
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_actor,
    v_suggestion_id, 'suggestion_created'
  );

  return v_suggestion_id;
end;
$$;

create or replace function public.decide_collaboration_suggestion(
  p_suggestion_id uuid,
  p_expected_version integer,
  p_action text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_suggestion public.collaboration_suggestions%rowtype;
begin
  select * into v_suggestion
  from public.collaboration_suggestions
  where id = p_suggestion_id
  for update;

  if v_actor is null
    or v_suggestion.id is null
    or v_suggestion.state <> 'open'
    or v_suggestion.record_version <> p_expected_version
    or p_action not in ('accept', 'reject')
    or not private.can_review_content(v_suggestion.content_item_id) then
    raise exception 'stale or unauthorized suggestion decision' using errcode = '40001';
  end if;

  update public.collaboration_suggestions
  set state = case
        when p_action = 'accept' then 'accepted'::public.collaboration_suggestion_state
        else 'rejected'::public.collaboration_suggestion_state
      end,
      decided_by_user_id = v_actor,
      decided_at = now(),
      decision_reason = nullif(btrim(p_reason), ''),
      record_version = record_version + 1
  where id = v_suggestion.id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    suggestion_id, event_type, metadata
  ) values (
    v_suggestion.organization_id, v_suggestion.project_id,
    v_suggestion.content_item_id, v_actor, v_suggestion.id,
    case when p_action = 'accept' then 'suggestion_accepted' else 'suggestion_rejected' end,
    jsonb_build_object('reason', nullif(btrim(p_reason), ''))
  );

  return true;
end;
$$;

create or replace function public.mark_collaboration_suggestion_applied(
  p_suggestion_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_suggestion public.collaboration_suggestions%rowtype;
begin
  select * into v_suggestion
  from public.collaboration_suggestions
  where id = p_suggestion_id
  for update;

  if v_actor is null
    or v_suggestion.id is null
    or v_suggestion.state <> 'accepted'
    or v_suggestion.applied_at is not null
    or v_suggestion.record_version <> p_expected_version
    or not private.can_edit_content(v_suggestion.content_item_id) then
    raise exception 'stale or unauthorized suggestion application' using errcode = '40001';
  end if;

  update public.collaboration_suggestions
  set applied_by_user_id = v_actor,
      applied_at = now(),
      record_version = record_version + 1
  where id = v_suggestion.id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    suggestion_id, event_type
  ) values (
    v_suggestion.organization_id, v_suggestion.project_id,
    v_suggestion.content_item_id, v_actor, v_suggestion.id,
    'suggestion_applied'
  );

  return true;
end;
$$;

create or replace function public.set_caption_reaction(
  p_caption_version_id uuid,
  p_kind public.caption_reaction_kind,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_version public.caption_versions%rowtype;
  v_reaction_id uuid;
begin
  select * into v_version
  from public.caption_versions
  where id = p_caption_version_id;

  if v_actor is null
    or v_version.id is null
    or not (
      private.can_edit_content(v_version.content_item_id)
      or private.can_review_content(v_version.content_item_id)
    )
    or (
      p_kind = 'needs_refinement'
      and char_length(btrim(coalesce(p_comment, ''))) not between 1 and 1000
    ) then
    raise exception 'reaction operation denied' using errcode = '42501';
  end if;

  if p_kind is null then
    delete from public.caption_reactions
    where caption_version_id = v_version.id
      and actor_user_id = v_actor
    returning id into v_reaction_id;

    if v_reaction_id is not null then
      insert into public.collaboration_audit_events (
        organization_id, project_id, content_item_id, actor_user_id,
        event_type, metadata
      ) values (
        v_version.organization_id, v_version.project_id,
        v_version.content_item_id, v_actor, 'reaction_removed',
        jsonb_build_object('caption_version_id', v_version.id)
      );
    end if;

    return v_reaction_id;
  end if;

  insert into public.caption_reactions (
    organization_id, project_id, content_item_id, caption_version_id,
    actor_user_id, kind, comment
  ) values (
    v_version.organization_id, v_version.project_id,
    v_version.content_item_id, v_version.id,
    v_actor, p_kind,
    case when p_kind = 'needs_refinement' then btrim(p_comment) else null end
  )
  on conflict (caption_version_id, actor_user_id) do update
  set kind = excluded.kind,
      comment = excluded.comment,
      updated_at = now()
  returning id into v_reaction_id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    reaction_id, event_type, metadata
  ) values (
    v_version.organization_id, v_version.project_id,
    v_version.content_item_id, v_actor, v_reaction_id, 'reaction_set',
    jsonb_build_object(
      'caption_version_id', v_version.id,
      'kind', p_kind
    )
  );

  return v_reaction_id;
end;
$$;

create or replace function public.get_collaboration_capabilities(
  p_content_item_id uuid
)
returns table (
  access_mode public.collaboration_access_mode,
  can_comment boolean,
  can_suggest boolean,
  can_review boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.collaboration_mode_for_content(p_content_item_id),
    private.can_view_content_item(p_content_item_id),
    private.can_edit_content(p_content_item_id)
      or private.can_review_content(p_content_item_id),
    private.can_review_content(p_content_item_id)
  where private.can_view_content_item(p_content_item_id);
$$;

create or replace function public.list_collaboration_workflow_templates(
  p_content_item_id uuid
)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select template.id, template.name
  from public.workflow_templates template
  join public.content_items item
    on item.organization_id = template.organization_id
  where item.id = p_content_item_id
    and template.active
    and private.can_view_content_item(item.id)
  order by template.name;
$$;

create or replace function public.submit_collaboration_snapshot(
  p_content_item_id uuid,
  p_template_id uuid,
  p_room_id text,
  p_snapshot_version_id text,
  p_editor_json jsonb,
  p_plain_text text,
  p_normalized_text text,
  p_snapshot_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_item public.content_items%rowtype;
  v_document public.collaboration_documents%rowtype;
  v_version_id uuid;
  v_version_number integer;
begin
  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  select * into v_document
  from public.collaboration_documents
  where content_item_id = p_content_item_id
  for update;

  if v_actor is null
    or v_item.id is null
    or v_document.content_item_id is null
    or not private.can_edit_content(v_item.id)
    or v_item.status not in ('draft', 'changes_requested')
    or v_document.room_id <> p_room_id
    or nullif(btrim(p_snapshot_version_id), '') is null
    or p_snapshot_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'snapshot submission denied' using errcode = '42501';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.caption_versions
  where content_item_id = v_item.id;

  insert into public.caption_versions (
    organization_id, project_id, content_item_id, version_number,
    editor_json, plain_text, normalized_text, submitted_by_user_id,
    collaboration_room_id, collaboration_snapshot_version_id,
    collaboration_document_revision, snapshot_hash
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_version_number,
    p_editor_json, p_plain_text, p_normalized_text, v_actor,
    p_room_id, p_snapshot_version_id,
    v_document.document_revision + 1, p_snapshot_hash
  ) returning id into v_version_id;

  perform private.create_workflow_instance(
    v_version_id,
    p_template_id,
    v_actor,
    (
      select id
      from public.workflow_instances
      where content_item_id = v_item.id
      order by created_at desc
      limit 1
    )
  );

  update public.collaboration_documents
  set document_revision = document_revision + 1,
      latest_snapshot_version_id = p_snapshot_version_id,
      latest_snapshot_hash = p_snapshot_hash,
      latest_snapshot_at = now()
  where content_item_id = v_item.id;

  update public.collaboration_sessions
  set access_mode = 'read',
      last_revalidated_at = now()
  where content_item_id = v_item.id
    and revoked_at is null;

  update public.content_items
  set status = 'in_review',
      record_version = record_version + 1
  where id = v_item.id;

  insert into public.collaboration_audit_events (
    organization_id, project_id, content_item_id, actor_user_id,
    event_type, metadata
  ) values (
    v_item.organization_id, v_item.project_id, v_item.id, v_actor,
    'snapshot_submitted',
    jsonb_build_object(
      'caption_version_id', v_version_id,
      'snapshot_version_id', p_snapshot_version_id,
      'snapshot_hash', p_snapshot_hash
    )
  );

  return v_version_id;
end;
$$;

alter table public.collaboration_documents enable row level security;
alter table public.collaboration_sessions enable row level security;
alter table public.collaboration_threads enable row level security;
alter table public.collaboration_comments enable row level security;
alter table public.collaboration_mentions enable row level security;
alter table public.collaboration_suggestions enable row level security;
alter table public.caption_reactions enable row level security;
alter table public.collaboration_audit_events enable row level security;

create policy collaboration_documents_select_authorized
on public.collaboration_documents for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy collaboration_sessions_select_own
on public.collaboration_sessions for select to authenticated
using (user_id = (select auth.uid()));

create policy collaboration_threads_select_authorized
on public.collaboration_threads for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy collaboration_comments_select_authorized
on public.collaboration_comments for select to authenticated
using (
  exists (
    select 1 from public.collaboration_threads thread
    where thread.id = thread_id
      and private.can_view_content_item(thread.content_item_id)
  )
);

create policy collaboration_mentions_select_authorized
on public.collaboration_mentions for select to authenticated
using (
  exists (
    select 1
    from public.collaboration_comments comment
    join public.collaboration_threads thread on thread.id = comment.thread_id
    where comment.id = comment_id
      and private.can_view_content_item(thread.content_item_id)
  )
);

create policy collaboration_suggestions_select_authorized
on public.collaboration_suggestions for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy caption_reactions_select_authorized
on public.caption_reactions for select to authenticated
using (private.can_view_content_item(content_item_id));

create policy collaboration_audit_events_select_authorized
on public.collaboration_audit_events for select to authenticated
using (private.can_view_content_item(content_item_id));

revoke all on public.collaboration_documents,
  public.collaboration_sessions,
  public.collaboration_threads,
  public.collaboration_comments,
  public.collaboration_mentions,
  public.collaboration_suggestions,
  public.caption_reactions,
  public.collaboration_audit_events
  from anon, authenticated;

grant select on public.collaboration_documents,
  public.collaboration_sessions,
  public.collaboration_threads,
  public.collaboration_comments,
  public.collaboration_mentions,
  public.collaboration_suggestions,
  public.caption_reactions,
  public.collaboration_audit_events
  to authenticated;

revoke all on function private.valid_collaboration_anchor(jsonb),
  private.can_review_content(uuid),
  private.collaboration_mode_for_content(uuid),
  private.revoke_collaboration_sessions_from_content_assignment(),
  private.revoke_collaboration_sessions_from_project_assignment(),
  private.revoke_collaboration_sessions_from_membership(),
  private.insert_collaboration_mentions(uuid, uuid, uuid[])
  from public, anon, authenticated;

revoke all on function public.authorize_collaboration_session(uuid),
  public.revalidate_collaboration_session(uuid),
  public.create_collaboration_thread(uuid, jsonb, text, uuid[]),
  public.reply_to_collaboration_thread(uuid, text, uuid[]),
  public.resolve_collaboration_thread(uuid, boolean),
  public.create_collaboration_suggestion(
    uuid, public.collaboration_suggestion_kind, jsonb, text, text
  ),
  public.decide_collaboration_suggestion(uuid, integer, text, text),
  public.mark_collaboration_suggestion_applied(uuid, integer),
  public.set_caption_reaction(uuid, public.caption_reaction_kind, text),
  public.get_collaboration_capabilities(uuid),
  public.list_collaboration_workflow_templates(uuid),
  public.submit_collaboration_snapshot(
    uuid, uuid, text, text, jsonb, text, text, text
  )
  from public, anon, authenticated;

grant execute on function public.authorize_collaboration_session(uuid),
  public.revalidate_collaboration_session(uuid),
  public.create_collaboration_thread(uuid, jsonb, text, uuid[]),
  public.reply_to_collaboration_thread(uuid, text, uuid[]),
  public.resolve_collaboration_thread(uuid, boolean),
  public.create_collaboration_suggestion(
    uuid, public.collaboration_suggestion_kind, jsonb, text, text
  ),
  public.decide_collaboration_suggestion(uuid, integer, text, text),
  public.mark_collaboration_suggestion_applied(uuid, integer),
  public.set_caption_reaction(uuid, public.caption_reaction_kind, text),
  public.get_collaboration_capabilities(uuid),
  public.list_collaboration_workflow_templates(uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'collaboration_threads'
    ) then
      alter publication supabase_realtime add table public.collaboration_threads;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'collaboration_comments'
    ) then
      alter publication supabase_realtime add table public.collaboration_comments;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'collaboration_suggestions'
    ) then
      alter publication supabase_realtime add table public.collaboration_suggestions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'collaboration_sessions'
    ) then
      alter publication supabase_realtime add table public.collaboration_sessions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'caption_reactions'
    ) then
      alter publication supabase_realtime add table public.caption_reactions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'workflow_instances'
    ) then
      alter publication supabase_realtime add table public.workflow_instances;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'workflow_instance_steps'
    ) then
      alter publication supabase_realtime add table public.workflow_instance_steps;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'workflow_notifications'
    ) then
      alter publication supabase_realtime add table public.workflow_notifications;
    end if;
  end if;
end;
$$;

comment on table public.collaboration_documents is
  'Liveblocks room references and exact submitted snapshot evidence. Liveblocks owns live Yjs transport; Supabase owns durable workflow references.';
comment on table public.collaboration_threads is
  'Supabase-canonical anchored discussion threads for CapItUp content.';
comment on table public.collaboration_suggestions is
  'Supabase-canonical attributed suggestions and trusted decisions.';

