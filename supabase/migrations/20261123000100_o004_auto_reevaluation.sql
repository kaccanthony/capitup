-- O-004: Auto-reevaluation when last non-approving JO becomes unavailable.
-- When a junior_officer_unanimous step has only one remaining eligible member
-- and that member is marked temporarily unavailable, the step auto-advances.

create or replace function private.auto_advance_junior_officer_unanimous_step(p_instance_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instance public.workflow_instances%rowtype;
  v_step public.workflow_instance_steps%rowtype;
  v_remaining integer;
  v_next uuid;
begin
  -- Only call this from change_junior_officer_unavailability after marking unavailable
  select * into v_instance from public.workflow_instances where id = p_instance_id for update;
  if v_instance.id is null or v_instance.status <> 'in_review' or v_instance.current_step_id is null then
    return false;
  end if;

  select * into v_step from public.workflow_instance_steps where id = v_instance.current_step_id for update;
  if v_step.id is null or v_step.kind <> 'junior_officer_unanimous' or v_step.status <> 'pending' then
    return false;
  end if;

  -- Count eligible JO members who have NOT yet approved and are NOT unavailable
  select count(*) into v_remaining
  from public.workflow_step_eligible_members eligible
  join public.organization_memberships membership on membership.id = eligible.membership_id
  where eligible.instance_step_id = v_step.id
    and membership.status = 'active'
    and membership.valid_from <= now()
    and (membership.valid_until is null or membership.valid_until > now())
    and private.membership_has_role(membership.id, 'junior_officer')
    and not exists (
      select 1 from public.junior_officer_unavailability u
      where u.membership_id = membership.id
        and u.revoked_at is null
        and u.starts_at <= now()
        and (u.ends_at is null or u.ends_at > now())
    )
    and not exists (
      select 1 from public.workflow_step_member_decisions decision
      where decision.instance_step_id = v_step.id
        and decision.membership_id = eligible.membership_id
        and decision.action = 'approved'
    );

  -- If no remaining eligible members, auto-advance the step
  if v_remaining = 0 then
    update public.workflow_instance_steps
    set status = 'approved', decided_by_user_id = null, decided_at = now(), decision_reason = 'Auto-advanced: all eligible junior officers unavailable or approved'
    where id = v_step.id;

    v_next := private.refresh_workflow_current_step(v_instance.id);
    update public.content_items
    set status = case
      when v_next is null then 'approved'::public.content_status
      when (select kind from public.workflow_instance_steps where id = v_next) = 'pro' then 'awaiting_final_approval'::public.content_status
      else 'in_review'::public.content_status
    end
    where id = v_instance.content_item_id;

    insert into public.workflow_decisions (instance_step_id, caption_version_id, actor_user_id, action, reason)
    values (v_step.id, v_instance.caption_version_id, null, 'approved', 'Auto-advanced: all eligible junior officers unavailable or approved');

    insert into public.workflow_audit_events (
      organization_id, project_id, content_item_id, caption_version_id,
      workflow_instance_id, actor_user_id, event_type, previous_status, new_status, reason
    ) values (
      v_instance.organization_id, v_instance.project_id, v_instance.content_item_id,
      v_instance.caption_version_id, v_instance.id, null,
      'auto_advanced', 'in_review',
      (select status from public.workflow_instances where id = v_instance.id),
      'All eligible junior officers unavailable or approved'
    );

    return true;
  end if;

  return false;
end;
$$;

revoke all on function private.auto_advance_junior_officer_unanimous_step(uuid) from public, anon;
grant execute on function private.auto_advance_junior_officer_unanimous_step(uuid) to authenticated;