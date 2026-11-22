-- Phase 04 completion: distinct Director override and durable recipient-scoped notices.
alter table public.workflow_notifications drop constraint workflow_notifications_kind_check;
alter table public.workflow_notifications add constraint workflow_notifications_kind_check check (kind in ('assignment','approval_requested','changes_requested','approved','deadline','director_override'));
alter table public.workflow_notifications add column workflow_instance_id uuid references public.workflow_instances(id) on delete cascade;
alter table public.workflow_notifications add column caption_version_id uuid references public.caption_versions(id) on delete cascade;

create or replace function private.notify_workflow_recipients(p_instance_id uuid, p_kind text, p_exclude uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.workflow_notifications (recipient_user_id,organization_id,content_item_id,workflow_instance_id,caption_version_id,kind)
  select distinct membership.user_id, instance.organization_id, instance.content_item_id, instance.id, instance.caption_version_id, p_kind
  from public.workflow_instances instance
  join public.workflow_step_eligible_members eligible on eligible.instance_step_id = instance.current_step_id
  join public.organization_memberships membership on membership.id = eligible.membership_id
  where instance.id = p_instance_id and membership.user_id is not null and membership.user_id is distinct from p_exclude;
$$;

create or replace function public.director_override_workflow(p_instance_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_instance public.workflow_instances%rowtype; v_step public.workflow_instance_steps%rowtype; v_actor uuid := auth.uid();
begin
  select * into v_instance from public.workflow_instances where id = p_instance_id for update;
  if v_instance.id is null or v_actor is null or v_instance.status <> 'in_review' or nullif(btrim(p_reason),'') is null or not private.has_organization_role(v_instance.organization_id,'publicity_director') or not exists (select 1 from public.workflow_templates where id=v_instance.template_id and allow_director_override) then raise exception 'access denied' using errcode='42501'; end if;
  select * into v_step from public.workflow_instance_steps where id=v_instance.current_step_id for update;
  update public.workflow_instance_steps set status='approved', decided_by_user_id=v_actor, decided_at=now(), decision_reason=btrim(p_reason), is_override=true where instance_id=v_instance.id and status='pending';
  update public.workflow_instances set status='approved', current_step_id=null where id=v_instance.id;
  update public.content_items set status='approved', record_version=record_version+1 where id=v_instance.content_item_id;
  insert into public.workflow_decisions (instance_step_id,caption_version_id,actor_user_id,action,reason) values (v_step.id,v_instance.caption_version_id,v_actor,'director_override',btrim(p_reason));
  insert into public.workflow_audit_events (organization_id,project_id,content_item_id,caption_version_id,workflow_instance_id,actor_user_id,event_type,previous_status,new_status,reason) values (v_instance.organization_id,v_instance.project_id,v_instance.content_item_id,v_instance.caption_version_id,v_instance.id,v_actor,'director_override','in_review','approved',btrim(p_reason));
  insert into public.workflow_notifications (recipient_user_id,organization_id,content_item_id,workflow_instance_id,caption_version_id,kind)
  select distinct membership.user_id,v_instance.organization_id,v_instance.content_item_id,v_instance.id,v_instance.caption_version_id,'director_override'
  from public.organization_memberships membership where membership.organization_id=v_instance.organization_id and membership.user_id is not null and private.membership_has_role(membership.id,'pro') and membership.user_id <> v_actor;
  return true;
end; $$;

create or replace function public.create_workflow_template(p_organization_id uuid, p_name text, p_allow_director_override boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not (private.has_organization_role(p_organization_id,'org_admin') or private.has_organization_role(p_organization_id,'publicity_director')) then raise exception 'access denied' using errcode='42501'; end if;
  insert into public.workflow_templates (organization_id,name,allow_director_override) values (p_organization_id,btrim(p_name),p_allow_director_override) returning id into v_id; return v_id;
end; $$;

create or replace function public.add_workflow_template_step(p_template_id uuid, p_step_order smallint, p_kind public.workflow_step_kind, p_required boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_org uuid;
begin
  select organization_id into v_org from public.workflow_templates where id=p_template_id for update;
  if v_org is null or auth.uid() is null or not (private.has_organization_role(v_org,'org_admin') or private.has_organization_role(v_org,'publicity_director')) then raise exception 'access denied' using errcode='42501'; end if;
  insert into public.workflow_template_steps (template_id,step_order,kind,required) values (p_template_id,p_step_order,p_kind,p_required) returning id into v_id; return v_id;
end; $$;

revoke all on function public.director_override_workflow(uuid,text), public.create_workflow_template(uuid,text,boolean), public.add_workflow_template_step(uuid,smallint,public.workflow_step_kind,boolean) from public, anon;
grant execute on function public.director_override_workflow(uuid,text), public.create_workflow_template(uuid,text,boolean), public.add_workflow_template_step(uuid,smallint,public.workflow_step_kind,boolean) to authenticated;
