-- The webhook sync uses a non-persistent service-role client for these
-- narrowly scoped reads. Keep grants limited to columns selected by the sync.
grant select (id, integration_connection_id, external_object_id)
  on public.webhook_events to service_role;

grant select (id, field_mappings)
  on public.integration_connections to service_role;

grant select (id, attempt_number, webhook_event_id, state, created_at)
  on public.sync_runs to service_role;
