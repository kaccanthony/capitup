-- Phase 05 hardening (ordered before Phase 06): server-only snapshot finalization, immutable policy
-- evidence, and recipient-scoped realtime notification support.
-- This migration is additive except for removing the obsolete browser-callable
-- snapshot RPC. It remains unapplied until an authorized local/hosted run.

begin;

revoke all on function public.submit_collaboration_snapshot(
  uuid, uuid, text, text, jsonb, text, text, text
) from public, anon, authenticated;

drop function public.submit_collaboration_snapshot(
  uuid, uuid, text, text, jsonb, text, text, text
);

create type public.caption_policy_warning_state as enum (
  'within_recommendation',
  'approaching_recommendation',
  'over_recommendation',
  'over_hard_maximum',
  'over_platform_maximum',
  'unconfigured'
);

create table public.caption_word_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  content_tag_id smallint not null references public.content_tags(id) on delete restrict,
  policy_version text not null check (policy_version ~ '^v[1-9][0-9]*$'),
  recommended_word_limit integer not null check (recommended_word_limit > 0),
  approaching_offset_words integer not null check (approaching_offset_words >= 0),
  global_hard_maximum_words integer not null check (
    global_hard_maximum_words >= recommended_word_limit
  ),
  enabled boolean not null default true,
  effective_at timestamptz not null,
  policy_timezone text not null default 'Asia/Manila'
    check (policy_timezone = 'Asia/Manila'),
  source_reference text not null check (nullif(btrim(source_reference), '') is not null),
  owner_reference text not null check (nullif(btrim(owner_reference), '') is not null),
  supplied_or_approved_by_user_id uuid references auth.users(id) on delete restrict,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, content_tag_id, policy_version),
  check (superseded_at is null or superseded_at > effective_at)
);

create unique index caption_word_policies_one_current_idx
  on public.caption_word_policies (organization_id, content_tag_id)
  where superseded_at is null;

alter table public.caption_versions
  add column word_count integer check (word_count is null or word_count >= 0),
  add column grapheme_count integer check (grapheme_count is null or grapheme_count >= 0),
  add column word_policy_configured boolean;

create unique index caption_versions_collaboration_snapshot_unique_idx
  on public.caption_versions (collaboration_room_id, collaboration_snapshot_version_id)
  where collaboration_room_id is not null
    and collaboration_snapshot_version_id is not null;

create table public.caption_version_word_policy_evidence (
  caption_version_id uuid not null references public.caption_versions(id) on delete restrict,
  policy_id uuid not null references public.caption_word_policies(id) on delete restrict,
  policy_version text not null,
  content_tag_id smallint not null references public.content_tags(id) on delete restrict,
  evaluated_word_count integer not null check (evaluated_word_count >= 0),
  recommended_word_limit integer not null check (recommended_word_limit > 0),
  approaching_offset_words integer not null check (approaching_offset_words >= 0),
  global_hard_maximum_words integer not null check (
    global_hard_maximum_words >= recommended_word_limit
  ),
  warning_state public.caption_policy_warning_state not null,
  recommendation_exempt boolean not null,
  exemption_reason text,
  policy_effective_at timestamptz not null,
  policy_timezone text not null,
  source_reference text not null,
  owner_reference text not null,
  evaluated_at timestamptz not null default now(),
  primary key (caption_version_id, policy_id),
  check (warning_state <> 'unconfigured'),
  check (
    (not recommendation_exempt and exemption_reason is null)
    or (recommendation_exempt and nullif(btrim(exemption_reason), '') is not null)
  )
);

create table public.caption_version_destination_policy_evidence (
  caption_version_id uuid not null references public.caption_versions(id) on delete restrict,
  publication_channel_id uuid not null references public.publication_channels(id) on delete restrict,
  policy_id uuid references public.publication_channel_policies(id) on delete restrict,
  policy_version text,
  destination_slug text not null,
  destination_label text not null,
  evaluated_grapheme_count integer not null check (evaluated_grapheme_count >= 0),
  character_limit integer check (character_limit is null or character_limit > 0),
  limit_classification public.destination_limit_classification,
  warning_state public.caption_policy_warning_state not null,
  policy_effective_at timestamptz,
  policy_timezone text,
  source_reference text,
  owner_reference text,
  evaluated_at timestamptz not null default now(),
  primary key (caption_version_id, publication_channel_id),
  check (
    (
      warning_state = 'unconfigured'
      and policy_id is null
      and policy_version is null
      and character_limit is null
      and limit_classification is null
      and policy_effective_at is null
      and policy_timezone is null
      and source_reference is null
      and owner_reference is null
    )
    or (
      warning_state in ('within_recommendation', 'over_platform_maximum')
      and policy_id is not null
      and policy_version is not null
      and character_limit is not null
      and limit_classification is not null
      and policy_effective_at is not null
      and policy_timezone is not null
      and source_reference is not null
      and owner_reference is not null
    )
  )
);

alter table public.caption_word_policies enable row level security;
alter table public.caption_version_word_policy_evidence enable row level security;
alter table public.caption_version_destination_policy_evidence enable row level security;

create policy caption_word_policies_select_active_member
on public.caption_word_policies for select to authenticated
using (private.has_active_membership(organization_id));

create policy caption_version_word_policy_evidence_select_authorized
on public.caption_version_word_policy_evidence for select to authenticated
using (
  exists (
    select 1
    from public.caption_versions version
    where version.id = caption_version_id
      and private.can_view_content_item(version.content_item_id)
  )
);

create policy caption_version_destination_policy_evidence_select_authorized
on public.caption_version_destination_policy_evidence for select to authenticated
using (
  exists (
    select 1
    from public.caption_versions version
    where version.id = caption_version_id
      and private.can_view_content_item(version.content_item_id)
  )
);

revoke all on public.caption_word_policies,
  public.caption_version_word_policy_evidence,
  public.caption_version_destination_policy_evidence
  from anon, authenticated;

grant select on public.caption_word_policies,
  public.caption_version_word_policy_evidence,
  public.caption_version_destination_policy_evidence
  to authenticated;

create or replace function public.finalize_collaboration_snapshot(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_project_assignment_id uuid,
  p_content_item_id uuid,
  p_template_id uuid,
  p_room_id text,
  p_expected_item_record_version integer,
  p_expected_document_revision bigint,
  p_snapshot_version_id text,
  p_editor_json jsonb,
  p_plain_text text,
  p_normalized_text text,
  p_snapshot_hash text,
  p_word_count integer,
  p_grapheme_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items%rowtype;
  v_document public.collaboration_documents%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_assignment public.project_assignments%rowtype;
  v_previous_workflow public.workflow_instances%rowtype;
  v_version_id uuid;
  v_version_number integer;
  v_word_policy_configured boolean;
begin
  if p_actor_user_id is null
    or p_organization_id is null
    or p_project_id is null
    or p_project_assignment_id is null
    or p_content_item_id is null
    or p_template_id is null
    or p_expected_item_record_version is null
    or p_expected_item_record_version < 1
    or p_expected_document_revision is null
    or p_expected_document_revision < 0
    or p_word_count is null
    or p_word_count < 0
    or p_grapheme_count is null
    or p_grapheme_count < 0
    or nullif(btrim(p_room_id), '') is null
    or nullif(btrim(p_snapshot_version_id), '') is null
    or p_snapshot_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_editor_json) <> 'object' then
    raise exception 'invalid snapshot finalization input' using errcode = '22023';
  end if;

  select * into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  select * into v_document
  from public.collaboration_documents
  where content_item_id = p_content_item_id
  for update;

  select * into v_membership
  from public.organization_memberships membership
  where membership.user_id = p_actor_user_id
    and membership.organization_id = p_organization_id
    and membership.status = 'active'
    and membership.valid_from <= now()
    and (membership.valid_until is null or membership.valid_until > now())
  limit 1;

  select * into v_assignment
  from public.project_assignments assignment
  where assignment.id = p_project_assignment_id
    and assignment.organization_id = p_organization_id
    and assignment.project_id = p_project_id
    and assignment.membership_id = v_membership.id
    and assignment.starts_at <= now()
    and (assignment.ends_at is null or assignment.ends_at > now())
    and assignment.revoked_at is null;

  select * into v_previous_workflow
  from public.workflow_instances instance
  where instance.content_item_id = p_content_item_id
  order by instance.created_at desc
  limit 1;

  if v_item.id is null
    or v_document.content_item_id is null
    or v_membership.id is null
    or v_assignment.id is null
    or v_item.organization_id <> p_organization_id
    or v_item.project_id <> p_project_id
    or v_document.organization_id <> p_organization_id
    or v_document.project_id <> p_project_id
    or v_document.room_id <> p_room_id
    or v_item.record_version <> p_expected_item_record_version
    or v_document.document_revision <> p_expected_document_revision
    or v_item.status not in ('draft', 'changes_requested')
    or not exists (
      select 1
      from public.content_item_assignments content_assignment
      where content_assignment.content_item_id = v_item.id
        and content_assignment.project_id = p_project_id
        and content_assignment.project_assignment_id = v_assignment.id
        and content_assignment.responsibility = 'writer'
        and content_assignment.revoked_at is null
    )
    or not exists (
      select 1
      from public.organization_role_assignments role_assignment
      where role_assignment.membership_id = v_membership.id
        and role_assignment.starts_at <= now()
        and (role_assignment.ends_at is null or role_assignment.ends_at > now())
        and role_assignment.revoked_at is null
        and (
          role_assignment.role in ('junior_officer', 'publicity_director', 'pro')
          or (
            role_assignment.role = 'executive'
            and v_assignment.role in ('publicity_head', 'co_project_head', 'project_head')
          )
        )
    )
    or not exists (
      select 1
      from public.workflow_templates template
      where template.id = p_template_id
        and template.organization_id = p_organization_id
        and template.active
    )
    or (
      v_item.status = 'draft'
      and v_previous_workflow.id is not null
      and v_previous_workflow.status = 'in_review'
    )
    or (
      v_item.status = 'changes_requested'
      and (
        v_previous_workflow.id is null
        or v_previous_workflow.status <> 'changes_requested'
      )
    ) then
    raise exception 'snapshot finalization denied or stale' using errcode = '40001';
  end if;

  if exists (
    select 1
    from public.caption_versions version
    where version.collaboration_room_id = p_room_id
      and version.collaboration_snapshot_version_id = p_snapshot_version_id
  ) then
    raise exception 'snapshot already finalized' using errcode = '23505';
  end if;

  select
    exists (
      select 1
      from public.content_item_tags item_tag
      where item_tag.content_item_id = v_item.id
    )
    and not exists (
      select 1
      from public.content_item_tags item_tag
      where item_tag.content_item_id = v_item.id
        and not exists (
          select 1
          from public.caption_word_policies policy
          where policy.organization_id = p_organization_id
            and policy.content_tag_id = item_tag.content_tag_id
            and policy.enabled
            and policy.effective_at <= now()
            and policy.superseded_at is null
        )
    )
  into v_word_policy_configured;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.caption_versions
  where content_item_id = v_item.id;

  insert into public.caption_versions (
    organization_id, project_id, content_item_id, version_number,
    editor_json, plain_text, normalized_text, submitted_by_user_id,
    collaboration_room_id, collaboration_snapshot_version_id,
    collaboration_document_revision, snapshot_hash,
    word_count, grapheme_count, word_policy_configured
  ) values (
    p_organization_id, p_project_id, v_item.id, v_version_number,
    p_editor_json, p_plain_text, p_normalized_text, p_actor_user_id,
    p_room_id, p_snapshot_version_id,
    v_document.document_revision + 1, p_snapshot_hash,
    p_word_count, p_grapheme_count, v_word_policy_configured
  ) returning id into v_version_id;

  insert into public.caption_version_word_policy_evidence (
    caption_version_id, policy_id, policy_version, content_tag_id,
    evaluated_word_count, recommended_word_limit, approaching_offset_words,
    global_hard_maximum_words, warning_state, recommendation_exempt,
    exemption_reason, policy_effective_at, policy_timezone,
    source_reference, owner_reference
  )
  select
    v_version_id,
    policy.id,
    policy.policy_version,
    item_tag.content_tag_id,
    p_word_count,
    policy.recommended_word_limit,
    policy.approaching_offset_words,
    policy.global_hard_maximum_words,
    case
      when p_word_count > policy.global_hard_maximum_words
        then 'over_hard_maximum'::public.caption_policy_warning_state
      when p_word_count > policy.recommended_word_limit
        then 'over_recommendation'::public.caption_policy_warning_state
      when p_word_count >= greatest(
        policy.recommended_word_limit - policy.approaching_offset_words,
        0
      ) then 'approaching_recommendation'::public.caption_policy_warning_state
      else 'within_recommendation'::public.caption_policy_warning_state
    end,
    v_item.is_special_case,
    case when v_item.is_special_case then v_item.special_case_reason else null end,
    policy.effective_at,
    policy.policy_timezone,
    policy.source_reference,
    policy.owner_reference
  from public.content_item_tags item_tag
  join public.caption_word_policies policy
    on policy.organization_id = p_organization_id
   and policy.content_tag_id = item_tag.content_tag_id
   and policy.enabled
   and policy.effective_at <= now()
   and policy.superseded_at is null
  where item_tag.content_item_id = v_item.id;

  insert into public.caption_version_destination_policy_evidence (
    caption_version_id, publication_channel_id, policy_id, policy_version,
    destination_slug, destination_label, evaluated_grapheme_count,
    character_limit, limit_classification, warning_state,
    policy_effective_at, policy_timezone, source_reference, owner_reference
  )
  select
    v_version_id,
    selected.publication_channel_id,
    policy.id,
    policy.policy_version,
    channel.slug,
    channel.display_label,
    p_grapheme_count,
    policy.character_limit,
    policy.limit_classification,
    case
      when policy.id is null
        then 'unconfigured'::public.caption_policy_warning_state
      when p_grapheme_count > policy.character_limit
        then 'over_platform_maximum'::public.caption_policy_warning_state
      else 'within_recommendation'::public.caption_policy_warning_state
    end,
    policy.effective_at,
    policy.policy_timezone,
    policy.source_reference,
    policy.owner_reference
  from public.content_publication_channels selected
  join public.publication_channels channel
    on channel.id = selected.publication_channel_id
   and channel.organization_id = p_organization_id
  left join lateral (
    select candidate.*
    from public.publication_channel_policies candidate
    join public.publication_channel_policy_content_kinds policy_kind
      on policy_kind.publication_channel_policy_id = candidate.id
     and policy_kind.content_format_id = v_item.content_format_id
    where candidate.organization_id = p_organization_id
      and candidate.publication_channel_id = selected.publication_channel_id
      and candidate.enabled
      and candidate.effective_at <= now()
      and candidate.superseded_at is null
    order by candidate.effective_at desc
    limit 1
  ) policy on true
  where selected.content_item_id = v_item.id
    and selected.organization_id = p_organization_id;

  perform private.create_workflow_instance(
    v_version_id,
    p_template_id,
    p_actor_user_id,
    v_previous_workflow.id
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
    p_organization_id, p_project_id, v_item.id, p_actor_user_id,
    'snapshot_submitted',
    jsonb_build_object(
      'caption_version_id', v_version_id,
      'snapshot_version_id', p_snapshot_version_id,
      'snapshot_hash', p_snapshot_hash,
      'word_count', p_word_count,
      'grapheme_count', p_grapheme_count,
      'word_policy_configured', v_word_policy_configured
    )
  );

  return v_version_id;
end;
$$;

revoke all on function public.finalize_collaboration_snapshot(
  uuid, uuid, uuid, uuid, uuid, uuid, text, integer, bigint,
  text, jsonb, text, text, text, integer, integer
) from public, anon, authenticated;

grant execute on function public.finalize_collaboration_snapshot(
  uuid, uuid, uuid, uuid, uuid, uuid, text, integer, bigint,
  text, jsonb, text, text, text, integer, integer
) to service_role;

comment on table public.caption_word_policies is
  'Versioned organization word-warning policy. Values are configured data; no application fallback limit is implied.';
comment on table public.caption_version_word_policy_evidence is
  'Immutable word-policy inputs, evaluated counts, and warning results captured at submission.';
comment on table public.caption_version_destination_policy_evidence is
  'Immutable destination-policy inputs, grapheme counts, and warning results captured at submission.';
comment on function public.finalize_collaboration_snapshot(
  uuid, uuid, uuid, uuid, uuid, uuid, text, integer, bigint,
  text, jsonb, text, text, text, integer, integer
) is 'Service-role-only atomic snapshot finalization. Every supplied identity, scope, assignment, room, workflow, and optimistic version is revalidated.';

commit;
