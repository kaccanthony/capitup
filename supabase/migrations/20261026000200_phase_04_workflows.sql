-- Phase 04: frozen, version-bound workflow records. No external delivery.
create type public.workflow_step_kind as enum ('publicity_director', 'pro', 'president', 'junior_officer_unanimous');
create type public.workflow_step_status as enum ('pending', 'approved', 'changes_requested', 'skipped');
create type public.workflow_instance_status as enum ('in_review', 'changes_requested', 'approved');

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120), active boolean not null default true,
  created_at timestamptz not null default now(), unique (organization_id, name)
);
create table public.workflow_template_steps (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.workflow_templates(id) on delete cascade,
  step_order smallint not null check (step_order > 0), kind public.workflow_step_kind not null, required boolean not null default true,
  unique (template_id, step_order)
);
create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict, content_item_id uuid not null references public.content_items(id) on delete restrict,
  caption_version_id uuid not null references public.caption_versions(id) on delete restrict, status public.workflow_instance_status not null default 'in_review',
  created_at timestamptz not null default now(), unique (caption_version_id)
);
create table public.workflow_instance_steps (
  id uuid primary key default gen_random_uuid(), instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  step_order smallint not null, kind public.workflow_step_kind not null, status public.workflow_step_status not null default 'pending',
  decided_by_user_id uuid references auth.users(id) on delete restrict, decision_reason text, decided_at timestamptz,
  unique (instance_id, step_order), check ((status in ('approved','changes_requested') and decided_by_user_id is not null and decided_at is not null) or status in ('pending','skipped'))
);
create table public.workflow_notifications (
  id uuid primary key default gen_random_uuid(), recipient_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict, content_item_id uuid not null references public.content_items(id) on delete cascade,
  kind text not null check (kind in ('approval_requested','changes_requested','approved')), read_at timestamptz, created_at timestamptz not null default now()
);
create table public.website_owners (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.executive_designations (
  id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  designation text not null check (designation = 'president'), granted_by_user_id uuid not null references auth.users(id), granted_at timestamptz not null default now(),
  revoked_by_user_id uuid references auth.users(id), revoked_at timestamptz, revocation_reason text,
  unique (membership_id, designation, revoked_at)
);
create table public.junior_officer_unavailability (
  id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) > 0), marked_by_user_id uuid not null references auth.users(id), starts_at timestamptz not null default now(), ends_at timestamptz
);
create table public.workflow_decisions (
  id uuid primary key default gen_random_uuid(), instance_step_id uuid not null references public.workflow_instance_steps(id) on delete restrict,
  caption_version_id uuid not null references public.caption_versions(id) on delete restrict, actor_user_id uuid not null references auth.users(id),
  action text not null check (action in ('approved','changes_requested','director_override')), reason text, created_at timestamptz not null default now(),
  check ((action = 'director_override' and nullif(btrim(reason), '') is not null) or action <> 'director_override')
);
alter table public.website_owners enable row level security;
alter table public.executive_designations enable row level security;
alter table public.junior_officer_unavailability enable row level security;
alter table public.workflow_decisions enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_steps enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_instance_steps enable row level security;
alter table public.workflow_notifications enable row level security;
create policy workflow_instances_read on public.workflow_instances for select to authenticated using (private.can_view_content_item(content_item_id));
create policy workflow_steps_read on public.workflow_instance_steps for select to authenticated using (exists (select 1 from public.workflow_instances i where i.id = instance_id and private.can_view_content_item(i.content_item_id)));
create policy workflow_notifications_read on public.workflow_notifications for select to authenticated using (recipient_user_id = auth.uid());
create policy workflow_decisions_read on public.workflow_decisions for select to authenticated using (exists (select 1 from public.workflow_instance_steps s join public.workflow_instances i on i.id = s.instance_id where s.id = instance_step_id and private.can_view_content_item(i.content_item_id)));
revoke all on public.workflow_templates, public.workflow_template_steps, public.workflow_instances, public.workflow_instance_steps, public.workflow_notifications from anon, authenticated;
revoke all on public.website_owners, public.executive_designations, public.junior_officer_unavailability, public.workflow_decisions from anon, authenticated;
grant select on public.workflow_instances, public.workflow_instance_steps, public.workflow_notifications to authenticated;
grant select on public.workflow_decisions to authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.workflow_notifications set read_at = coalesce(read_at, now()) where id = p_notification_id and recipient_user_id = auth.uid();
  return found;
end; $$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

