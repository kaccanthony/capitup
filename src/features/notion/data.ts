import "server-only";

import { createHash } from "node:crypto";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { canAdministerOrganization } from "@/lib/auth/policy";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/types/database";
import {
  notionConnectionInputSchema,
  notionFieldMappingsSchema,
  type NotionConnectionInput,
  type NotionWebhookEvent,
} from "@/features/notion/contracts";

export class NotionIntegrationAccessError extends Error {
  constructor() {
    super("The Notion integration operation could not be completed.");
    this.name = "NotionIntegrationAccessError";
  }
}

type AdminContext = {
  organizationId: string;
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
};

async function getAdminContext(): Promise<AdminContext> {
  const client = await createServerSupabaseClient();
  if (!client) throw new NotionIntegrationAccessError();

  const decision = await getAuthorizationForClient(client);

  // TEMP DEBUG: Log admin context check
  let canAdminister = false;
  let roles: readonly OrganizationRole[] | undefined;
  let organizationId: string | undefined;
  if (decision.kind === "active") {
    organizationId = decision.organizationId;
    roles = decision.roles;
    canAdminister = canAdministerOrganization(decision, decision.organizationId);
  }
  console.log("[NOTION] getAdminContext decision:", JSON.stringify({
    kind: decision.kind,
    organizationId,
    roles,
    canAdminister,
  }, null, 2));

  if (
    decision.kind !== "active" ||
    !canAdministerOrganization(decision, decision.organizationId)
  ) {
    throw new NotionIntegrationAccessError();
  }

  return { organizationId: decision.organizationId, client };
}

export type NotionIntegrationOverview = {
  connection: {
    id: string;
    label: string;
    status: "configured" | "active" | "degraded" | "disabled";
    dataSourceId: string;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastErrorCode: string | null;
  } | null;
  recentRuns: {
    id: string;
    direction: "import" | "export" | "reconcile";
    state: string;
    errorCode: string | null;
    createdAt: string;
  }[];
  openConflicts: {
    id: string;
    kind: string;
    detailCode: string;
    createdAt: string;
  }[];
  deadLetters: { id: string; reasonCode: string; replayCount: number }[];
};

export async function getNotionIntegrationOverview(): Promise<NotionIntegrationOverview> {
  const context = await getAdminContext();

  // TEMP DEBUG: Log each query with error details
  let connection: { id: string; label: string; status: string; notion_data_source_id: string; last_success_at: string | null; last_failure_at: string | null; last_error_code: string | null } | null = null;
  let connectionError: { message: string; code: string } | null = null;

  try {
    const result = await context.client
      .from("integration_connections")
      .select(
        "id,label,status,notion_data_source_id,last_success_at,last_failure_at,last_error_code",
      )
      .eq("organization_id", context.organizationId)
      .eq("provider", "notion")
      .maybeSingle();
    connection = result.data;
    connectionError = result.error;
    console.log("[NOTION] integration_connections query:", { data: connection ? "found" : "null", error: connectionError });
  } catch (e) {
    console.error("[NOTION] integration_connections query threw:", e);
    throw new NotionIntegrationAccessError();
  }

  if (connectionError) {
    console.error("[NOTION] integration_connections error:", connectionError);
    throw new NotionIntegrationAccessError();
  }
  if (!connection) {
    console.log("[NOTION] No connection found, returning empty overview");
    return {
      connection: null,
      recentRuns: [],
      openConflicts: [],
      deadLetters: [],
    };
  }

  // Query sync_runs
  let runsData: { id: string; direction: string; state: string; error_code: string | null; created_at: string }[] | null = null;
  let runsError: { message: string; code: string } | null = null;
  try {
    const result = await context.client
      .from("sync_runs")
      .select("id,direction,state,error_code,created_at")
      .eq("integration_connection_id", connection.id)
      .order("created_at", { ascending: false })
      .limit(8);
    runsData = result.data;
    runsError = result.error;
    console.log("[NOTION] sync_runs query:", { count: runsData?.length ?? 0, error: runsError });
  } catch (e) {
    console.error("[NOTION] sync_runs query threw:", e);
    throw new NotionIntegrationAccessError();
  }

  // Query sync_conflicts
  let conflictsData: { id: string; kind: string; detail_code: string; created_at: string }[] | null = null;
  let conflictsError: { message: string; code: string } | null = null;
  try {
    const result = await context.client
      .from("sync_conflicts")
      .select("id,kind,detail_code,created_at")
      .eq("integration_connection_id", connection.id)
      .eq("state", "open")
      .order("created_at", { ascending: false })
      .limit(8);
    conflictsData = result.data;
    conflictsError = result.error;
    console.log("[NOTION] sync_conflicts query:", { count: conflictsData?.length ?? 0, error: conflictsError });
  } catch (e) {
    console.error("[NOTION] sync_conflicts query threw:", e);
    throw new NotionIntegrationAccessError();
  }

  // Query dead_letter_events
  let deadLettersData: { id: string; reason_code: string; replay_count: number }[] | null = null;
  let deadLettersError: { message: string; code: string } | null = null;
  try {
    const result = await context.client
      .from("dead_letter_events")
      .select("id,reason_code,replay_count")
      .eq("integration_connection_id", connection.id)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    deadLettersData = result.data;
    deadLettersError = result.error;
    console.log("[NOTION] dead_letter_events query:", { count: deadLettersData?.length ?? 0, error: deadLettersError });
  } catch (e) {
    console.error("[NOTION] dead_letter_events query threw:", e);
    throw new NotionIntegrationAccessError();
  }

  if (runsError || conflictsError || deadLettersError) {
    console.error("[NOTION] One or more queries returned error:", { runsError, conflictsError, deadLettersError });
    throw new NotionIntegrationAccessError();
  }

  return {
    connection: {
      id: connection.id,
      label: connection.label,
      status: connection.status as "configured" | "active" | "degraded" | "disabled",
      dataSourceId: connection.notion_data_source_id,
      lastSuccessAt: connection.last_success_at,
      lastFailureAt: connection.last_failure_at,
      lastErrorCode: connection.last_error_code,
    },
    recentRuns: (runsData ?? []).map((run) => ({
      id: run.id,
      direction: run.direction as "import" | "export" | "reconcile",
      state: run.state,
      errorCode: run.error_code,
      createdAt: run.created_at,
    })),
    openConflicts: (conflictsData ?? []).map((conflict) => ({
      id: conflict.id,
      kind: conflict.kind,
      detailCode: conflict.detail_code,
      createdAt: conflict.created_at,
    })),
    deadLetters: (deadLettersData ?? []).map((event) => ({
      id: event.id,
      reasonCode: event.reason_code,
      replayCount: event.replay_count,
    })),
  };
}

export async function configureNotionIntegration(input: unknown) {
  const parsed = notionConnectionInputSchema.safeParse(input);
  if (!parsed.success) throw new NotionIntegrationAccessError();

  const context = await getAdminContext();
  if (parsed.data.organizationId !== context.organizationId) {
    throw new NotionIntegrationAccessError();
  }

  const { data, error } = await context.client.rpc(
    "configure_notion_integration",
    {
      p_organization_id: parsed.data.organizationId,
      p_label: parsed.data.label,
      p_workspace_id: parsed.data.workspaceId,
      p_subscription_id: parsed.data.subscriptionId,
      p_data_source_id: parsed.data.dataSourceId,
      p_field_mappings: parsed.data.mappings,
    },
  );

  if (error || !data) throw new NotionIntegrationAccessError();
  return data;
}

export async function activateNotionIntegration(connectionId: string) {
  const context = await getAdminContext();
  const { data: connection, error: connectionError } = await context.client
    .from("integration_connections")
    .select("id,notion_data_source_id")
    .eq("id", connectionId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (connectionError || !connection) throw new NotionIntegrationAccessError();

  return {
    client: context.client,
    dataSourceId: connection.notion_data_source_id,
  };
}

export async function markNotionIntegrationActive(connectionId: string) {
  const { client } = await activateNotionIntegration(connectionId);
  const { data, error } = await client.rpc("activate_notion_integration", {
    p_connection_id: connectionId,
  });
  if (error || !data) throw new NotionIntegrationAccessError();
}

export async function replayNotionDeadLetter(deadLetterId: string) {
  const context = await getAdminContext();
  const { data, error } = await context.client.rpc(
    "replay_notion_dead_letter",
    {
      p_dead_letter_id: deadLetterId,
    },
  );
  if (error || !data) throw new NotionIntegrationAccessError();
  return getWebhookEventIdForSyncRun(context, data);
}

async function getWebhookEventIdForSyncRun(
  context: AdminContext,
  syncRunId: string,
) {
  const { data: run, error } = await context.client
    .from("sync_runs")
    .select("webhook_event_id")
    .eq("id", syncRunId)
    .maybeSingle();
  if (error || !run?.webhook_event_id) throw new NotionIntegrationAccessError();
  return run.webhook_event_id;
}

export async function resumeNotionSyncRun(syncRunId: string) {
  const context = await getAdminContext();
  const { data, error } = await context.client.rpc("resume_notion_sync_run", {
    p_sync_run_id: syncRunId,
  });
  if (error || !data) throw new NotionIntegrationAccessError();
  return getWebhookEventIdForSyncRun(context, data);
}

export async function resolveNotionSyncConflict(conflictId: string) {
  const context = await getAdminContext();
  const { data, error } = await context.client.rpc(
    "resolve_notion_sync_conflict",
    { p_conflict_id: conflictId },
  );
  if (error || !data) throw new NotionIntegrationAccessError();
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function acceptVerifiedNotionWebhook(input: {
  event: NotionWebhookEvent;
  payloadHash: string;
}) {
  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionIntegrationAccessError();

  const { data, error } = await client.rpc("accept_notion_webhook_event", {
    p_workspace_id: input.event.workspace_id,
    p_subscription_id: input.event.subscription_id,
    p_provider_event_id: input.event.id,
    p_provider_event_type: input.event.type,
    p_provider_timestamp: input.event.timestamp,
    p_external_object_id: input.event.entity.id,
    p_payload_sha256: input.payloadHash,
  });
  const accepted = data?.[0];
  if (error || !accepted) throw new NotionIntegrationAccessError();
  return accepted;
}

export type NotionWebhookProcessingContext = {
  webhookEventId: string;
  syncRunId: string;
  attemptNumber: number;
  externalObjectId: string;
  fieldMappings: NotionConnectionInput["mappings"];
};

export async function getNotionWebhookProcessingContext(
  webhookEventId: string,
): Promise<NotionWebhookProcessingContext> {
  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionIntegrationAccessError();

  const { data: event, error: eventError } = await client
    .from("webhook_events")
    .select("id,integration_connection_id,external_object_id")
    .eq("id", webhookEventId)
    .maybeSingle();
  if (eventError || !event) throw new NotionIntegrationAccessError();

  const [
    { data: connection, error: connectionError },
    { data: run, error: runError },
  ] = await Promise.all([
    client
      .from("integration_connections")
      .select("field_mappings")
      .eq("id", event.integration_connection_id)
      .maybeSingle(),
    client
      .from("sync_runs")
      .select("id,attempt_number")
      .eq("webhook_event_id", event.id)
      .in("state", ["queued", "running"])
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const mappings = notionFieldMappingsSchema.safeParse(
    connection?.field_mappings,
  );
  if (connectionError || runError || !run || !mappings.success) {
    throw new NotionIntegrationAccessError();
  }

  return {
    webhookEventId: event.id,
    syncRunId: run.id,
    attemptNumber: run.attempt_number,
    externalObjectId: event.external_object_id,
    fieldMappings: mappings.data,
  };
}

export async function applyNotionProjectImport(input: {
  webhookEventId: string;
  externalPageId: string;
  externalEditedAt: string;
  title: string;
  eventStartsAt: string | null;
  deadlineAt: string | null;
  payloadHash: string;
}) {
  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionIntegrationAccessError();
  const { data, error } = await client.rpc("apply_notion_project_import", {
    p_webhook_event_id: input.webhookEventId,
    p_external_page_id: input.externalPageId,
    p_external_edited_at: input.externalEditedAt,
    p_title: input.title,
    p_event_starts_at: input.eventStartsAt,
    p_deadline_at: input.deadlineAt,
    p_payload_hash: input.payloadHash,
  });
  if (error || !data?.[0]) throw new NotionIntegrationAccessError();
  return data[0];
}

export async function recordNotionSyncFailure(input: {
  syncRunId: string;
  state: "retry_scheduled" | "conflict" | "dead_lettered" | "failed";
  errorCode: string;
  nextAttemptAt?: string | null;
}) {
  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionIntegrationAccessError();
  const { error } = await client.rpc("record_notion_sync_failure", {
    p_sync_run_id: input.syncRunId,
    p_state: input.state,
    p_error_code: input.errorCode,
    p_next_attempt_at: input.nextAttemptAt ?? null,
  });
  if (error) {
    console.error("[NOTION] integration_connections query error:", error);
    throw new NotionIntegrationAccessError();
  }
}
