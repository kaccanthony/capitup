-- Continue accepting authenticated provider events while an integration is
-- degraded so fresh retries can recover it. Configured/disabled connections
-- remain ineligible; timestamp, hash, and idempotency checks are unchanged.
create or replace function public.accept_notion_webhook_event(
  p_workspace_id text,
  p_subscription_id text,
  p_provider_event_id text,
  p_provider_event_type text,
  p_provider_timestamp timestamptz,
  p_external_object_id text,
  p_payload_sha256 text
)
returns table (webhook_event_id uuid, is_duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.integration_connections%rowtype;
  v_event_id uuid;
begin
  select * into v_connection from public.integration_connections
  where provider = 'notion' and status in ('active', 'degraded')
    and notion_workspace_id = btrim(p_workspace_id)
    and notion_subscription_id = btrim(p_subscription_id)
  for update;
  if v_connection.id is null
    or p_provider_timestamp < now() - interval '5 minutes'
    or p_provider_timestamp > now() + interval '1 minute'
    or char_length(coalesce(p_payload_sha256, '')) <> 64 then
    raise exception 'notion_webhook_rejected';
  end if;

  insert into public.webhook_events (
    integration_connection_id, provider_event_id, provider_event_type,
    provider_timestamp, external_object_id, payload_sha256
  ) values (
    v_connection.id, btrim(p_provider_event_id), btrim(p_provider_event_type),
    p_provider_timestamp, btrim(p_external_object_id), p_payload_sha256
  ) on conflict (integration_connection_id, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id from public.webhook_events
    where integration_connection_id = v_connection.id
      and provider_event_id = btrim(p_provider_event_id);
    return query select v_event_id, true;
    return;
  end if;

  insert into public.sync_runs (
    integration_connection_id, webhook_event_id, direction, state
  ) values (v_connection.id, v_event_id, 'import', 'queued');
  insert into public.integration_audit_events (
    integration_connection_id, organization_id, event_type, metadata
  ) values (
    v_connection.id, v_connection.organization_id, 'webhook_accepted',
    jsonb_build_object('provider_event_id', btrim(p_provider_event_id))
  );
  return query select v_event_id, false;
end;
$$;
