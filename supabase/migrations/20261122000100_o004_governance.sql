-- O-004: designation and availability changes are server-authorized and append-only audited.
alter table public.executive_designations add column grant_reason text;
alter table public.executive_designations add constraint president_grant_reason_required check (nullif(btrim(grant_reason), '') is not null) not valid;
create unique index one_live_president_designation_per_membership on public.executive_designations (membership_id) where revoked_at is null;
alter table public.junior_officer_unavailability add column revoked_at timestamptz;
alter table public.junior_officer_unavailability add column revoked_by_user_id uuid references auth.users(id) on delete restrict;
alter table public.junior_officer_unavailability add column revocation_reason text;
alter table public.junior_officer_unavailability add constraint unavailability_end_after_start check (ends_at is null or ends_at > starts_at) not valid;
alter table public.junior_officer_unavailability add constraint unavailability_revocation_reason check (revoked_at is null or (revoked_by_user_id is not null and nullif(btrim(revocation_reason), '') is not null));

create table public.workflow_governance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('president_granted','president_revoked','unavailable_marked','unavailable_revoked')),
  reason text not null check (nullif(btrim(reason), '') is not null),
  created_at timestamptz not null default now()
);
alter table public.workflow_governance_events enable row level security;
revoke all on public.workflow_governance_events from public, anon, authenticated;
create policy workflow_governance_events_read on public.workflow_governance_events for select to authenticated using (
  private.has_organization_role(organization_id, 'publicity_director') or private.has_organization_role(organization_id, 'pro')
);
grant select on public.workflow_governance_events to authenticated;

create or replace function private.reject_governance_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'governance audit events are immutable' using errcode = '42501'; end; $$;
create trigger governance_events_immutable before update or delete on public.workflow_governance_events
for each row execute function private.reject_governance_event_mutation();

create or replace function public.change_president_designation(p_membership_id uuid, p_grant boolean, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_member public.organization_memberships%rowtype; v_actor uuid := auth.uid();
begin
  select * into v_member from public.organization_memberships where id = p_membership_id for update;
  if v_actor is null or v_member.id is null or p_grant is null or nullif(btrim(p_reason), '') is null then
    raise exception 'access denied' using errcode = '42501';
  end if;
  if p_grant then
    if not exists (select 1 from public.website_owners where user_id = v_actor)
       or v_member.status <> 'active' or v_member.valid_from > now()
       or (v_member.valid_until is not null and v_member.valid_until <= now())
       or not private.membership_has_role(v_member.id, 'executive') then
      raise exception 'access denied' using errcode = '42501';
    end if;
    insert into public.executive_designations (membership_id, designation, granted_by_user_id, grant_reason)
    values (v_member.id, 'president', v_actor, btrim(p_reason));
  else
    if not (exists (select 1 from public.website_owners where user_id = v_actor)
      or private.has_organization_role(v_member.organization_id, 'publicity_director')) then
      raise exception 'access denied' using errcode = '42501';
    end if;
    update public.executive_designations set revoked_at = now(), revoked_by_user_id = v_actor,
      revocation_reason = btrim(p_reason)
    where membership_id = v_member.id and designation = 'president' and revoked_at is null;
    if not found then raise exception 'active designation not found' using errcode = '22023'; end if;
  end if;
  insert into public.workflow_governance_events (organization_id, membership_id, actor_user_id, event_type, reason)
  values (v_member.organization_id, v_member.id, v_actor,
    case when p_grant then 'president_granted' else 'president_revoked' end, btrim(p_reason));
  return true;
end; $$;
revoke all on function public.change_president_designation(uuid,boolean,text) from public, anon;
grant execute on function public.change_president_designation(uuid,boolean,text) to authenticated;

create or replace function public.change_junior_officer_unavailability(p_membership_id uuid, p_unavailable boolean, p_reason text, p_ends_at timestamptz default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_member public.organization_memberships%rowtype; v_actor uuid := auth.uid();
begin
  select * into v_member from public.organization_memberships where id = p_membership_id for update;
  if v_actor is null or v_member.id is null or p_unavailable is null or nullif(btrim(p_reason), '') is null
     or not (private.has_organization_role(v_member.organization_id, 'publicity_director')
       or private.has_organization_role(v_member.organization_id, 'pro')) then
    raise exception 'access denied' using errcode = '42501';
  end if;
  if p_unavailable then
    if v_member.status <> 'active' or v_member.valid_from > now()
       or (v_member.valid_until is not null and v_member.valid_until <= now())
       or not private.membership_has_role(v_member.id, 'junior_officer')
       or (p_ends_at is not null and p_ends_at <= now())
       or exists (select 1 from public.junior_officer_unavailability u where u.membership_id = v_member.id
         and u.revoked_at is null and u.starts_at <= now() and (u.ends_at is null or u.ends_at > now())) then
      raise exception 'access denied' using errcode = '42501';
    end if;
    insert into public.junior_officer_unavailability (membership_id, reason, marked_by_user_id, ends_at)
    values (v_member.id, btrim(p_reason), v_actor, p_ends_at);
  else
    update public.junior_officer_unavailability set revoked_at = now(), revoked_by_user_id = v_actor,
      revocation_reason = btrim(p_reason)
    where membership_id = v_member.id and revoked_at is null and starts_at <= now()
      and (ends_at is null or ends_at > now());
    if not found then raise exception 'active unavailability not found' using errcode = '22023'; end if;
  end if;
  insert into public.workflow_governance_events (organization_id, membership_id, actor_user_id, event_type, reason)
  values (v_member.organization_id, v_member.id, v_actor,
    case when p_unavailable then 'unavailable_marked' else 'unavailable_revoked' end, btrim(p_reason));
  return true;
end; $$;
revoke all on function public.change_junior_officer_unavailability(uuid,boolean,text,timestamptz) from public, anon;
grant execute on function public.change_junior_officer_unavailability(uuid,boolean,text,timestamptz) to authenticated;

-- Preserve the frozen roster; recheck live authority and temporary absence at decision time.
create or replace function private.workflow_member_is_eligible(p_step_id uuid, p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workflow_step_eligible_members eligible
    join public.organization_memberships membership on membership.id = eligible.membership_id
    join public.workflow_instance_steps step on step.id = eligible.instance_step_id
    join public.workflow_instances instance on instance.id = step.instance_id
    where eligible.instance_step_id = p_step_id and membership.user_id = p_actor
      and membership.status = 'active' and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and (eligible.required_role is null or private.membership_has_role(membership.id, eligible.required_role))
      and (eligible.required_project_role is null or exists (
        select 1 from public.project_assignments assignment where assignment.project_id = instance.project_id
          and assignment.membership_id = membership.id and assignment.role = eligible.required_project_role
          and private.is_current_project_assignment(assignment.id)))
      and (step.kind <> 'president' or (private.membership_has_role(membership.id, 'executive')
        and exists (select 1 from public.executive_designations d where d.membership_id = membership.id
          and d.designation = 'president' and d.revoked_at is null)))
      and (step.kind <> 'junior_officer_unanimous' or not exists (
        select 1 from public.junior_officer_unavailability u where u.membership_id = membership.id
          and u.revoked_at is null and u.starts_at <= now() and (u.ends_at is null or u.ends_at > now())))
  );
$$;

create or replace function public.decide_workflow_step(p_instance_id uuid, p_expected_step_id uuid, p_action text, p_reason text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_instance public.workflow_instances%rowtype; v_step public.workflow_instance_steps%rowtype; v_actor uuid := auth.uid(); v_membership uuid; v_complete boolean; v_next uuid;
begin
  select * into v_instance from public.workflow_instances where id=p_instance_id for update;
  if v_instance.id is null or v_actor is null or v_instance.status <> 'in_review' or v_instance.current_step_id is distinct from p_expected_step_id or p_action not in ('approve','request_changes') then raise exception 'stale workflow decision' using errcode='40001'; end if;
  select * into v_step from public.workflow_instance_steps where id=p_expected_step_id for update;
  select membership.id into v_membership from public.workflow_step_eligible_members eligible join public.organization_memberships membership on membership.id=eligible.membership_id where eligible.instance_step_id=v_step.id and membership.user_id=v_actor limit 1;
  if v_step.status <> 'pending' or v_membership is null or not private.workflow_member_is_eligible(v_step.id,v_actor) or (p_action='request_changes' and nullif(btrim(p_reason),'') is null) then raise exception 'access denied' using errcode='42501'; end if;
  if v_step.kind='junior_officer_unanimous' then insert into public.workflow_step_member_decisions (instance_step_id,membership_id,actor_user_id,action,reason) values (v_step.id,v_membership,v_actor,case when p_action='approve' then 'approved' else 'changes_requested' end,nullif(btrim(p_reason),'')); end if;
  if p_action='request_changes' then
    update public.workflow_instance_steps set status='changes_requested',decided_by_user_id=v_actor,decided_at=now(),decision_reason=btrim(p_reason) where id=v_step.id;
    update public.workflow_instances set status='changes_requested',current_step_id=null where id=v_instance.id;
    update public.content_items set status='changes_requested' where id=v_instance.content_item_id;
  else
    select not exists (
      select 1 from public.workflow_step_eligible_members eligible
      join public.organization_memberships membership on membership.id = eligible.membership_id
      where eligible.instance_step_id = v_step.id
        and membership.status = 'active' and membership.valid_from <= now()
        and (membership.valid_until is null or membership.valid_until > now())
        and private.membership_has_role(membership.id, 'junior_officer')
        and not exists (select 1 from public.junior_officer_unavailability u where u.membership_id = membership.id
          and u.revoked_at is null and u.starts_at <= now() and (u.ends_at is null or u.ends_at > now()))
        and not exists (select 1 from public.workflow_step_member_decisions decision where decision.instance_step_id=v_step.id and decision.membership_id=eligible.membership_id and decision.action='approved')
    ) into v_complete;
    if v_step.kind <> 'junior_officer_unanimous' or v_complete then
      update public.workflow_instance_steps set status='approved',decided_by_user_id=v_actor,decided_at=now(),decision_reason=nullif(btrim(p_reason),'') where id=v_step.id;
      v_next := private.refresh_workflow_current_step(v_instance.id);
      update public.content_items set status=case when v_next is null then 'approved'::public.content_status when (select kind from public.workflow_instance_steps where id=v_next)='pro' then 'awaiting_final_approval'::public.content_status else 'in_review'::public.content_status end where id=v_instance.content_item_id;
    end if;
  end if;
  insert into public.workflow_decisions (instance_step_id,caption_version_id,actor_user_id,action,reason) values (v_step.id,v_instance.caption_version_id,v_actor,case when p_action='approve' then 'approved' else 'changes_requested' end,nullif(btrim(p_reason),''));
  insert into public.workflow_audit_events (organization_id,project_id,content_item_id,caption_version_id,workflow_instance_id,actor_user_id,event_type,previous_status,new_status,reason) values (v_instance.organization_id,v_instance.project_id,v_instance.content_item_id,v_instance.caption_version_id,v_instance.id,v_actor,case when p_action='approve' then 'approved' else 'changes_requested' end,'in_review',(select status from public.workflow_instances where id=v_instance.id),nullif(btrim(p_reason),''));
  return true;
end; $$;
