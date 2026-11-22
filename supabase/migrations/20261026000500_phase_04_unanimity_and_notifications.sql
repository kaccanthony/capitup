-- A unanimous Junior-Officer step records each member decision; one member cannot advance it alone.
create table public.workflow_step_member_decisions (
  instance_step_id uuid not null references public.workflow_instance_steps(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('approved','changes_requested')),
  reason text,
  decided_at timestamptz not null default now(),
  primary key (instance_step_id,membership_id)
);
alter table public.workflow_step_member_decisions enable row level security;
create policy workflow_step_member_decisions_read on public.workflow_step_member_decisions for select to authenticated using (exists (select 1 from public.workflow_instance_steps step join public.workflow_instances instance on instance.id=step.instance_id where step.id=instance_step_id and private.can_view_content_item(instance.content_item_id)));
revoke all on public.workflow_step_member_decisions from anon, authenticated;
grant select on public.workflow_step_member_decisions to authenticated;

create or replace function private.enqueue_current_workflow_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.current_step_id is distinct from old.current_step_id then perform private.notify_workflow_recipients(new.id,'approval_requested',null); end if;
  return new;
end; $$;
create trigger workflow_instance_enqueue_current_step after insert or update of current_step_id on public.workflow_instances for each row execute function private.enqueue_current_workflow_notifications();

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
    select not exists (select 1 from public.workflow_step_eligible_members eligible where eligible.instance_step_id=v_step.id and not exists (select 1 from public.workflow_step_member_decisions decision where decision.instance_step_id=v_step.id and decision.membership_id=eligible.membership_id and decision.action='approved')) into v_complete;
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

revoke all on function public.decide_workflow_step(uuid,uuid,text,text) from public,anon;
grant execute on function public.decide_workflow_step(uuid,uuid,text,text) to authenticated;
