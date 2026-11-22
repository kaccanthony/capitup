-- Phase 04 completion: all workflow authority lives in trusted PostgreSQL functions.
alter type public.workflow_step_kind add value if not exists 'publicity_head';
alter type public.workflow_step_kind add value if not exists 'co_project_head';
alter type public.workflow_step_kind add value if not exists 'project_head';

alter table public.workflow_templates add column allow_director_override boolean not null default false;
alter table public.workflow_instances add column template_id uuid references public.workflow_templates(id) on delete restrict;
alter table public.workflow_instances add column current_step_id uuid references public.workflow_instance_steps(id) on delete restrict;
alter table public.workflow_instances add column reopened_from_instance_id uuid references public.workflow_instances(id) on delete restrict;
alter table public.workflow_instance_steps add column template_step_id uuid references public.workflow_template_steps(id) on delete restrict;
alter table public.workflow_instance_steps add column required boolean not null default true;
alter table public.workflow_instance_steps add column is_override boolean not null default false;

create table public.workflow_step_eligible_members (
  instance_step_id uuid not null references public.workflow_instance_steps(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  required_role public.organization_role,
  required_project_role public.project_assignment_role,
  primary key (instance_step_id, membership_id),
  check (required_role is not null or required_project_role is not null)
);

create table public.workflow_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  caption_version_id uuid not null references public.caption_versions(id) on delete restrict,
  workflow_instance_id uuid references public.workflow_instances(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','approved','changes_requested','director_override','reopened')),
  previous_status public.workflow_instance_status,
  new_status public.workflow_instance_status,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.workflow_step_eligible_members enable row level security;
alter table public.workflow_audit_events enable row level security;
create policy workflow_step_eligible_members_read on public.workflow_step_eligible_members for select to authenticated using (
  exists (select 1 from public.workflow_instance_steps step join public.workflow_instances instance on instance.id = step.instance_id where step.id = instance_step_id and private.can_view_content_item(instance.content_item_id))
);
create policy workflow_audit_events_read on public.workflow_audit_events for select to authenticated using (private.can_view_content_item(content_item_id));
revoke all on public.workflow_step_eligible_members, public.workflow_audit_events from anon, authenticated;
grant select on public.workflow_step_eligible_members, public.workflow_audit_events to authenticated;

create or replace function private.workflow_member_is_eligible(p_step_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workflow_step_eligible_members eligible
    join public.organization_memberships membership on membership.id = eligible.membership_id
    join public.workflow_instance_steps step on step.id = eligible.instance_step_id
    join public.workflow_instances instance on instance.id = step.instance_id
    where eligible.instance_step_id = p_step_id
      and membership.user_id = p_actor
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and (eligible.required_role is null or private.membership_has_role(membership.id, eligible.required_role))
      and (eligible.required_project_role is null or exists (
        select 1 from public.project_assignments assignment where assignment.project_id = instance.project_id and assignment.membership_id = membership.id and assignment.role = eligible.required_project_role and private.is_current_project_assignment(assignment.id)
      ))
  );
$$;

create or replace function private.refresh_workflow_current_step(p_instance_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_step_id uuid; v_instance public.workflow_instances%rowtype;
begin
  select * into v_instance from public.workflow_instances where id = p_instance_id for update;
  select id into v_step_id from public.workflow_instance_steps where instance_id = p_instance_id and status = 'pending' order by step_order limit 1;
  update public.workflow_instances set current_step_id = v_step_id, status = case when v_step_id is null then 'approved' else 'in_review' end where id = p_instance_id;
  return v_step_id;
end; $$;

create or replace function private.create_workflow_instance(p_caption_version_id uuid, p_template_id uuid, p_actor uuid, p_reopened_from uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_version public.caption_versions%rowtype; v_instance_id uuid; v_step record; v_instance_step_id uuid; v_membership record;
begin
  select * into v_version from public.caption_versions where id = p_caption_version_id for update;
  if v_version.id is null or not exists (select 1 from public.workflow_templates template where template.id = p_template_id and template.organization_id = v_version.organization_id and template.active) then raise exception 'invalid workflow template' using errcode = '22023'; end if;
  insert into public.workflow_instances (organization_id, project_id, content_item_id, caption_version_id, template_id, reopened_from_instance_id)
  values (v_version.organization_id, v_version.project_id, v_version.content_item_id, v_version.id, p_template_id, p_reopened_from) returning id into v_instance_id;
  for v_step in select * from public.workflow_template_steps where template_id = p_template_id order by step_order loop
    insert into public.workflow_instance_steps (instance_id, step_order, kind, template_step_id, required, status)
    values (v_instance_id, v_step.step_order, v_step.kind, v_step.id, v_step.required, case when v_step.required then 'pending' else 'skipped' end) returning id into v_instance_step_id;
    if v_step.required then
      for v_membership in select membership.id from public.organization_memberships membership where membership.organization_id = v_version.organization_id and membership.status = 'active' and membership.valid_from <= now() and (membership.valid_until is null or membership.valid_until > now()) loop
        if (v_step.kind = 'publicity_director' and private.membership_has_role(v_membership.id, 'publicity_director')) or
           (v_step.kind = 'pro' and private.membership_has_role(v_membership.id, 'pro')) or
           (v_step.kind = 'junior_officer_unanimous' and private.membership_has_role(v_membership.id, 'junior_officer')) or
           (v_step.kind in ('publicity_head','co_project_head','project_head') and exists (select 1 from public.project_assignments assignment where assignment.project_id = v_version.project_id and assignment.membership_id = v_membership.id and assignment.role::text = v_step.kind::text and private.is_current_project_assignment(assignment.id))) or
           (v_step.kind = 'president' and exists (select 1 from public.executive_designations designation where designation.membership_id = v_membership.id and designation.designation = 'president' and designation.revoked_at is null) and private.membership_has_role(v_membership.id, 'executive')) then
          insert into public.workflow_step_eligible_members (instance_step_id, membership_id, required_role, required_project_role) values (v_instance_step_id, v_membership.id, case when v_step.kind in ('publicity_director','pro','junior_officer_unanimous') then v_step.kind::text::public.organization_role else null end, case when v_step.kind in ('publicity_head','co_project_head','project_head') then v_step.kind::text::public.project_assignment_role else null end);
        end if;
      end loop;
      if not exists (select 1 from public.workflow_step_eligible_members where instance_step_id = v_instance_step_id) then raise exception 'required workflow step has no eligible member' using errcode = '22023'; end if;
    end if;
  end loop;
  perform private.refresh_workflow_current_step(v_instance_id);
  insert into public.workflow_audit_events (organization_id,project_id,content_item_id,caption_version_id,workflow_instance_id,actor_user_id,event_type,new_status) values (v_version.organization_id,v_version.project_id,v_version.content_item_id,v_version.id,v_instance_id,p_actor,'submitted','in_review');
  return v_instance_id;
end; $$;

create or replace function public.submit_caption_version(p_content_item_id uuid, p_expected_draft_version integer, p_template_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_item public.content_items%rowtype; v_draft public.caption_drafts%rowtype; v_actor uuid := auth.uid(); v_version_id uuid; v_number integer;
begin
  select * into v_item from public.content_items where id = p_content_item_id for update;
  if v_item.id is null or v_actor is null or not private.can_edit_content(v_item.id) or v_item.status not in ('draft','changes_requested') then raise exception 'access denied' using errcode = '42501'; end if;
  select * into v_draft from public.caption_drafts where content_item_id = v_item.id for update;
  if v_draft.content_item_id is null or v_draft.draft_version <> p_expected_draft_version then raise exception 'stale version' using errcode = '40001'; end if;
  select coalesce(max(version_number), 0) + 1 into v_number from public.caption_versions where content_item_id = v_item.id;
  insert into public.caption_versions (organization_id,project_id,content_item_id,version_number,editor_json,plain_text,normalized_text,submitted_by_user_id) values (v_item.organization_id,v_item.project_id,v_item.id,v_number,v_draft.editor_json,v_draft.plain_text,v_draft.normalized_text,v_actor) returning id into v_version_id;
  perform private.create_workflow_instance(v_version_id, p_template_id, v_actor, (select id from public.workflow_instances where content_item_id = v_item.id order by created_at desc limit 1));
  update public.content_items set status = 'in_review', record_version = record_version + 1 where id = v_item.id;
  return v_version_id;
end; $$;

create or replace function public.decide_workflow_step(p_instance_id uuid, p_expected_step_id uuid, p_action text, p_reason text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_instance public.workflow_instances%rowtype; v_step public.workflow_instance_steps%rowtype; v_actor uuid := auth.uid(); v_next uuid;
begin
  select * into v_instance from public.workflow_instances where id = p_instance_id for update;
  if v_instance.id is null or v_actor is null or v_instance.status <> 'in_review' or v_instance.current_step_id is distinct from p_expected_step_id then raise exception 'stale workflow decision' using errcode = '40001'; end if;
  select * into v_step from public.workflow_instance_steps where id = p_expected_step_id for update;
  if v_step.status <> 'pending' or p_action not in ('approve','request_changes') or not private.workflow_member_is_eligible(v_step.id,v_actor) or (p_action = 'request_changes' and nullif(btrim(p_reason),'') is null) then raise exception 'access denied' using errcode = '42501'; end if;
  update public.workflow_instance_steps set status = case when p_action = 'approve' then 'approved'::public.workflow_step_status else 'changes_requested'::public.workflow_step_status end, decided_by_user_id = v_actor, decision_reason = nullif(btrim(p_reason),''), decided_at = now() where id = v_step.id;
  if p_action = 'request_changes' then update public.workflow_instances set status = 'changes_requested', current_step_id = null where id = v_instance.id; update public.content_items set status = 'changes_requested' where id = v_instance.content_item_id; else v_next := private.refresh_workflow_current_step(v_instance.id); update public.content_items set status = case when v_next is null then 'approved'::public.content_status when (select kind from public.workflow_instance_steps where id=v_next) = 'pro' then 'awaiting_final_approval'::public.content_status else 'in_review'::public.content_status end where id = v_instance.content_item_id; end if;
  insert into public.workflow_decisions (instance_step_id,caption_version_id,actor_user_id,action,reason) values (v_step.id,v_instance.caption_version_id,v_actor,case when p_action='approve' then 'approved' else 'changes_requested' end,nullif(btrim(p_reason),''));
  insert into public.workflow_audit_events (organization_id,project_id,content_item_id,caption_version_id,workflow_instance_id,actor_user_id,event_type,previous_status,new_status,reason) values (v_instance.organization_id,v_instance.project_id,v_instance.content_item_id,v_instance.caption_version_id,v_instance.id,v_actor,case when p_action='approve' then 'approved' else 'changes_requested' end,'in_review',(select status from public.workflow_instances where id=v_instance.id),nullif(btrim(p_reason),''));
  return true;
end; $$;

revoke all on function public.submit_caption_version(uuid,integer,uuid), public.decide_workflow_step(uuid,uuid,text,text) from public, anon;
grant execute on function public.submit_caption_version(uuid,integer,uuid), public.decide_workflow_step(uuid,uuid,text,text) to authenticated;
