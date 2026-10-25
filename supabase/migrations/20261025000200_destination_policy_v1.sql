begin;

alter table public.publication_channels
  drop constraint publication_channels_slug_format;

alter table public.publication_channels
  add constraint publication_channels_slug_format check (
    slug = lower(slug) and slug ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'
  );

create type public.destination_limit_classification as enum (
  'platform_based',
  'organization_defined_destination',
  'organization_defined_platform_aligned',
  'platform_hard_limit',
  'temporary_organization_defined'
);

create table private.launch_publication_destination_templates (
  slug text primary key,
  display_label text not null,
  character_limit integer not null check (character_limit > 0),
  limit_classification public.destination_limit_classification not null,
  enabled boolean not null default true,
  policy_version text not null default 'v1' check (policy_version ~ '^v[1-9][0-9]*$'),
  policy_timezone text not null default 'Asia/Manila'
    check (policy_timezone = 'Asia/Manila'),
  source_reference text not null,
  owner_reference text not null,
  created_at timestamptz not null default now()
);

create table private.launch_publication_destination_template_kinds (
  channel_slug text not null references private.launch_publication_destination_templates(slug)
    on delete cascade,
  content_kind_slug text not null check (content_kind_slug in ('post', 'video', 'article')),
  primary key (channel_slug, content_kind_slug)
);

create table public.publication_channel_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  publication_channel_id uuid not null,
  policy_version text not null check (policy_version ~ '^v[1-9][0-9]*$'),
  character_limit integer not null check (character_limit > 0),
  limit_classification public.destination_limit_classification not null,
  enabled boolean not null default true,
  effective_at timestamptz not null,
  policy_timezone text not null default 'Asia/Manila'
    check (policy_timezone = 'Asia/Manila'),
  source_reference text not null,
  owner_reference text not null,
  supplied_or_approved_by_user_id uuid references auth.users(id) on delete restrict,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint publication_channel_policies_channel_organization_fk
    foreign key (publication_channel_id, organization_id)
    references public.publication_channels(id, organization_id) on delete restrict,
  constraint publication_channel_policies_version_unique
    unique (publication_channel_id, policy_version)
);

create unique index publication_channel_policies_one_current_idx
  on public.publication_channel_policies (publication_channel_id)
  where superseded_at is null;

create index publication_channel_policies_organization_current_idx
  on public.publication_channel_policies (organization_id, effective_at desc)
  where superseded_at is null and enabled;

create table public.publication_channel_policy_content_kinds (
  publication_channel_policy_id uuid not null
    references public.publication_channel_policies(id) on delete cascade,
  content_format_id smallint not null references public.content_formats(id) on delete restrict,
  primary key (publication_channel_policy_id, content_format_id)
);

create index publication_channel_policy_kinds_format_idx
  on public.publication_channel_policy_content_kinds (content_format_id);

insert into private.launch_publication_destination_templates (
  slug, display_label, character_limit, limit_classification, source_reference, owner_reference
) values
  ('facebook', 'Facebook', 63206, 'platform_based', 'Owner-supplied launch policy v1; platform-based limit.', 'Owner-supplied and approved launch policy v1'),
  ('facebook_story', 'FB Story', 2000, 'organization_defined_destination', 'Owner-supplied organization-managed destination limit.', 'Owner-supplied and approved launch policy v1'),
  ('facebook_community', 'Facebook Community', 63206, 'organization_defined_platform_aligned', 'Owner-supplied organization-defined, platform-aligned limit.', 'Owner-supplied and approved launch policy v1'),
  ('instagram', 'Instagram', 2200, 'platform_based', 'Owner-supplied launch policy v1; platform-based limit.', 'Owner-supplied and approved launch policy v1'),
  ('instagram_story', 'Instagram Story', 2000, 'organization_defined_destination', 'Owner-supplied organization-managed destination limit.', 'Owner-supplied and approved launch policy v1'),
  ('group_chat', 'Group Chats', 2000, 'organization_defined_destination', 'Owner-supplied organization-managed destination limit.', 'Owner-supplied and approved launch policy v1'),
  ('x', 'X (Twitter)', 280, 'platform_hard_limit', 'Owner-supplied launch policy v1; standard X post limit only.', 'Owner-supplied and approved launch policy v1'),
  ('tiktok', 'TikTok', 4000, 'platform_based', 'Owner-supplied launch policy v1; platform-based limit.', 'Owner-supplied and approved launch policy v1'),
  ('youtube', 'YouTube', 5000, 'platform_hard_limit', 'Owner-supplied launch policy v1; standard video-description limit.', 'Owner-supplied and approved launch policy v1'),
  ('discord', 'Discord', 2000, 'platform_hard_limit', 'Owner-supplied launch policy v1; standard message limit without Nitro.', 'Owner-supplied and approved launch policy v1'),
  ('linkedin', 'LinkedIn', 3000, 'platform_hard_limit', 'Owner-supplied launch policy v1; standard post limit.', 'Owner-supplied and approved launch policy v1'),
  ('acm_website', 'ACM Website', 4000, 'temporary_organization_defined', 'Owner-supplied temporary organization-defined limit.', 'Owner-supplied and approved launch policy v1');

insert into private.launch_publication_destination_template_kinds (channel_slug, content_kind_slug) values
  ('facebook', 'post'), ('facebook', 'video'),
  ('facebook_story', 'post'), ('facebook_story', 'video'),
  ('facebook_community', 'post'),
  ('instagram', 'post'), ('instagram', 'video'),
  ('instagram_story', 'post'), ('instagram_story', 'video'),
  ('group_chat', 'post'),
  ('x', 'post'),
  ('tiktok', 'video'), ('tiktok', 'post'),
  ('youtube', 'video'),
  ('discord', 'post'),
  ('linkedin', 'post'),
  ('acm_website', 'post'), ('acm_website', 'article');

create or replace function public.initialize_launch_publication_destinations(
  p_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_seeded_count integer := 0;
begin
  if v_actor_id is null
    or not private.has_active_membership(p_organization_id)
    or not (
      private.has_organization_role(p_organization_id, 'publicity_director')
      or private.has_organization_role(p_organization_id, 'pro')
      or private.has_organization_role(p_organization_id, 'executive')
    ) then
    raise exception 'publication destination initialization is not permitted';
  end if;

  insert into public.publication_channels (
    organization_id, slug, display_label, active, created_by_user_id
  )
  select p_organization_id, template.slug, template.display_label, template.enabled, v_actor_id
  from private.launch_publication_destination_templates template
  on conflict (organization_id, slug) do nothing;

  insert into public.publication_channel_policies (
    organization_id, publication_channel_id, policy_version, character_limit,
    limit_classification, enabled, effective_at, policy_timezone,
    source_reference, owner_reference, supplied_or_approved_by_user_id
  )
  select
    p_organization_id,
    channel.id,
    template.policy_version,
    template.character_limit,
    template.limit_classification,
    template.enabled,
    now(),
    template.policy_timezone,
    template.source_reference,
    template.owner_reference,
    v_actor_id
  from private.launch_publication_destination_templates template
  join public.publication_channels channel
    on channel.organization_id = p_organization_id and channel.slug = template.slug
  on conflict (publication_channel_id, policy_version) do nothing;

  get diagnostics v_seeded_count = row_count;

  insert into public.publication_channel_policy_content_kinds (
    publication_channel_policy_id, content_format_id
  )
  select policy.id, format.id
  from public.publication_channel_policies policy
  join public.publication_channels channel on channel.id = policy.publication_channel_id
  join private.launch_publication_destination_template_kinds template_kind
    on template_kind.channel_slug = channel.slug
  join public.content_formats format on format.slug = template_kind.content_kind_slug
  where policy.organization_id = p_organization_id
    and policy.policy_version = 'v1'
  on conflict do nothing;

  return v_seeded_count;
end;
$$;

alter table public.publication_channel_policies enable row level security;
alter table public.publication_channel_policy_content_kinds enable row level security;

create policy publication_channel_policies_select_active_member
on public.publication_channel_policies for select to authenticated
using (private.has_active_membership(organization_id));

create policy publication_channel_policy_content_kinds_select_active_member
on public.publication_channel_policy_content_kinds for select to authenticated
using (
  exists (
    select 1
    from public.publication_channel_policies policy
    where policy.id = publication_channel_policy_id
      and private.has_active_membership(policy.organization_id)
  )
);

revoke all on table public.publication_channel_policies from anon, authenticated;
revoke all on table public.publication_channel_policy_content_kinds from anon, authenticated;
grant select on table public.publication_channel_policies to authenticated;
grant select on table public.publication_channel_policy_content_kinds to authenticated;

revoke all on function public.initialize_launch_publication_destinations(uuid) from public, anon;
grant execute on function public.initialize_launch_publication_destinations(uuid) to authenticated;

comment on table private.launch_publication_destination_templates is
  'Owner-supplied launch destination policy templates. Organization policy rows are initialized explicitly and remain versioned.';
comment on table public.publication_channels is
  'Organization-managed destination catalog. The approved v1 launch catalog is initialized through versioned destination-policy templates.';
comment on table public.publication_channel_policies is
  'Versioned, effective-dated organization destination character-limit policies. Superseded policies are retained.';

commit;
