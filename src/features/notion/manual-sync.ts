import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import {
  buildNotionExportProperties,
  type NotionExportValues,
  type NotionFieldMappings,
  type NotionFieldMapping,
  type NotionRichText,
} from "@/features/notion/mapper";
import { createNotionClient, fetchNotionPage } from "@/features/notion/notion-client";
import { sha256 } from "@/features/notion/data";
import type { Json } from "@/types/database";

export class NotionManualSyncError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "NotionManualSyncError";
  }
}

type SyncContext = {
  organizationId: string;
  connectionId: string;
  dataSourceId: string;
  fieldMappings: NotionFieldMappings;
  objectLinkId: string;
  notionPageId: string;
  projectId: string;
  contentItemId: string;
  captionVersionId: string | null;
  viewerUrl: string | null;
};

function supabaseUpdate<T>(client: ReturnType<typeof createServiceRoleSupabaseClient>, table: string, values: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table).update(values as any);
}

function supabaseInsert<T>(client: ReturnType<typeof createServiceRoleSupabaseClient>, table: string, values: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table).insert(values as any);
}

function supabaseRpc<T>(client: ReturnType<typeof createServiceRoleSupabaseClient>, fn: string, params: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).rpc(fn, params as any);
}

async function getSyncContext(
  organizationId: string,
  projectId: string,
  contentItemId: string,
): Promise<SyncContext> {
  const client = await createServerSupabaseClient();
  if (!client) throw new NotionManualSyncError("Database unavailable", "db_unavailable");

  const decision = await getAuthorizationForClient(client);
  if (decision.kind !== "active" || decision.organizationId !== organizationId) {
    throw new NotionManualSyncError("Not authorized", "unauthorized");
  }

  const { data: connection, error: connectionError } = await client
    .from("integration_connections")
    .select("id, notion_data_source_id, field_mappings, status")
    .eq("organization_id", organizationId)
    .eq("provider", "notion")
    .maybeSingle();

  if (connectionError || !connection || connection.status !== "active") {
    throw new NotionManualSyncError("Notion integration not active", "integration_inactive");
  }

  const { data: objectLink, error: linkError } = await client
    .from("notion_object_links")
    .select("id, notion_page_id, last_export_hash")
    .eq("integration_connection_id", connection.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (linkError || !objectLink) {
    throw new NotionManualSyncError("No Notion page linked to this project", "no_page_link");
  }

  const mappings = connection.field_mappings as NotionFieldMappings;

  const viewerMapping = mappings.find((m: NotionFieldMapping) => m.field === "viewer_url");
  const viewerUrl = viewerMapping
    ? `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}/content/${contentItemId}/view`
    : null;

  return {
    organizationId,
    connectionId: connection.id,
    dataSourceId: connection.notion_data_source_id,
    fieldMappings: mappings,
    objectLinkId: objectLink.id,
    notionPageId: objectLink.notion_page_id,
    projectId,
    contentItemId,
    captionVersionId: null, // Will be set by caller
    viewerUrl,
  };
}

export type CaptionContentForSync = {
  captionVersionId: string;
  plainText: string;
  editorJson: Json;
  contentHash: string;
};

async function getLatestApprovedCaption(
  contentItemId: string,
): Promise<CaptionContentForSync | null> {
  const client = createServiceRoleSupabaseClient();
  if (!client) return null;

  const { data: version, error } = await client
    .from("caption_versions")
    .select("id, editor_json, plain_text, version_number")
    .eq("content_item_id", contentItemId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !version) return null;

  const contentHash = sha256(JSON.stringify({ plainText: version.plain_text, editorJson: version.editor_json }));

  return {
    captionVersionId: version.id,
    plainText: version.plain_text,
    editorJson: version.editor_json,
    contentHash,
  };
}

function chunkText(text: string, maxLength: number = 2000): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let chunk = remaining.slice(0, maxLength);
    const lastSpace = chunk.lastIndexOf(" ");
    const lastNewline = chunk.lastIndexOf("\n");
    const breakPoint = Math.max(lastSpace, lastNewline);

    if (breakPoint > maxLength * 0.5) {
      chunk = remaining.slice(0, breakPoint);
      remaining = remaining.slice(breakPoint);
    } else {
      remaining = remaining.slice(maxLength);
    }
    chunks.push(chunk);
  }

  return chunks;
}

function sanitizeTiptapJsonToPlainText(editorJson: Json): string {
  if (!editorJson || typeof editorJson !== "object" || Array.isArray(editorJson)) {
    return "";
  }

  const doc = editorJson as { type: string; content?: Json[] };
  if (doc.type !== "doc" || !Array.isArray(doc.content)) {
    return "";
  }

  function extractText(node: Json): string {
    if (!node || typeof node !== "object" || Array.isArray(node)) return "";
    const n = node as { type?: string; text?: string; content?: Json[]; marks?: Json[] };
    if (n.type === "text" && typeof n.text === "string") {
      return n.text;
    }
    if (Array.isArray(n.content)) {
      return n.content.map(extractText).join("");
    }
    return "";
  }

  return doc.content.map(extractText).join("\n\n");
}

export async function pushCaptionToNotion(input: {
  organizationId: string;
  projectId: string;
  contentItemId: string;
}): Promise<{ success: boolean; exportHash: string; conflict?: boolean }> {
  const context = await getSyncContext(input.organizationId, input.projectId, input.contentItemId);

  const caption = await getLatestApprovedCaption(input.contentItemId);
  if (!caption) {
    throw new NotionManualSyncError("No approved caption version found", "no_caption");
  }

  const exportValues: NotionExportValues = {
    writerSummary: null,
    workflowStatus: "APPROVED",
    deepLink: context.viewerUrl,
    viewerUrl: context.viewerUrl,
    captionContent: caption.plainText,
  };

  const properties = buildNotionExportProperties({
    mappings: context.fieldMappings,
    values: exportValues,
  });

  const exportHash = sha256(JSON.stringify(exportValues));

  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionManualSyncError("Database unavailable", "db_unavailable");

  const { data: existingLink } = await client
    .from("notion_object_links")
    .select("last_export_hash")
    .eq("id", context.objectLinkId)
    .maybeSingle();

  if (existingLink?.last_export_hash && existingLink.last_export_hash !== exportHash) {
    const page = await fetchNotionPage(context.notionPageId);
    if (page) {
      const captionMapping = context.fieldMappings.find((m: NotionFieldMapping) => m.field === "caption_content");
      const currentCaptionHash = sha256(page.properties[captionMapping?.propertyId ?? ""]?.rich_text?.map((r: NotionRichText) => r.plain_text).join("") ?? "");
      if (currentCaptionHash !== exportHash) {
        throw new NotionManualSyncError("Notion caption has diverged; pull first to reconcile", "diverged");
      }
    }
  }

  try {
    const notion = createNotionClient();
    await notion.pages.update({
      page_id: context.notionPageId,
      properties,
    });

    await supabaseUpdate(client, "notion_object_links", { last_export_hash: exportHash, last_exported_at: new Date().toISOString() })
      .eq("id", context.objectLinkId);

    await supabaseInsert(client, "sync_runs", {
      integration_connection_id: context.connectionId,
      object_link_id: context.objectLinkId,
      direction: "export",
      state: "succeeded",
      output_hash: exportHash,
      initiated_by_user_id: (await client.auth.getUser()).data.user?.id,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return { success: true, exportHash };
  } catch {
    await supabaseInsert(client, "sync_runs", {
      integration_connection_id: context.connectionId,
      object_link_id: context.objectLinkId,
      direction: "export",
      state: "failed",
      error_code: "notion_push_failed",
      initiated_by_user_id: (await client.auth.getUser()).data.user?.id,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    throw new NotionManualSyncError("Failed to push to Notion", "push_failed");
  }
}

export async function pullCaptionFromNotion(input: {
  organizationId: string;
  projectId: string;
  contentItemId: string;
}): Promise<{ success: boolean; importHash: string; conflict?: boolean; localHash?: string | undefined; remoteHash?: string | undefined }> {
  const context = await getSyncContext(input.organizationId, input.projectId, input.contentItemId);

  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionManualSyncError("Database unavailable", "db_unavailable");

  const { data: objectLink } = await client
    .from("notion_object_links")
    .select("last_import_hash")
    .eq("id", context.objectLinkId)
    .maybeSingle();

  const caption = await getLatestApprovedCaption(input.contentItemId);
  const localHash = caption?.contentHash ?? null;

  const page = await fetchNotionPage(context.notionPageId);
  const captionMapping = context.fieldMappings.find((m: NotionFieldMapping) => m.field === "caption_content");
  const remoteContent = captionMapping
    ? page.properties[captionMapping.propertyId]?.rich_text?.map((r: NotionRichText) => r.plain_text).join("") ?? ""
    : "";

  const remoteHash = sha256(remoteContent);

  if (objectLink?.last_import_hash && objectLink.last_import_hash !== remoteHash) {
    if (localHash && localHash !== objectLink.last_import_hash) {
      throw new NotionManualSyncError("Both local and remote have changed; manual reconciliation required", "conflict");
    }
  }

  if (remoteContent.trim() === "") {
    return { success: true, importHash: remoteHash };
  }

  const { error: draftError } = await supabaseRpc(client, "save_caption_draft", {
    p_content_item_id: input.contentItemId,
    p_expected_version: 0,
    p_editor_json: { type: "doc", content: [] },
    p_plain_text: remoteContent,
  });

  if (draftError) {
    throw new NotionManualSyncError("Failed to save draft from Notion", "draft_failed");
  }

  await supabaseUpdate(client, "notion_object_links", { last_import_hash: remoteHash, last_imported_at: new Date().toISOString() })
    .eq("id", context.objectLinkId);

  await supabaseInsert(client, "sync_runs", {
    integration_connection_id: context.connectionId,
    object_link_id: context.objectLinkId,
    direction: "import",
    state: "succeeded",
    output_hash: remoteHash,
    initiated_by_user_id: (await client.auth.getUser()).data.user?.id,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return { success: true, importHash: remoteHash, localHash: localHash ?? undefined, remoteHash };
}

export async function getSyncStatus(input: {
  organizationId: string;
  projectId: string;
  contentItemId: string;
}): Promise<{
  hasNotionLink: boolean;
  lastExportHash: string | null;
  lastImportHash: string | null;
  localCaptionHash: string | null;
  remoteCaptionHash: string | null;
  needsPush: boolean;
  needsPull: boolean;
  conflict: boolean;
  error?: string;
}> {
  const context = await getSyncContext(input.organizationId, input.projectId, input.contentItemId);

  const client = createServiceRoleSupabaseClient();
  if (!client) throw new NotionManualSyncError("Database unavailable", "db_unavailable");

  const { data: objectLink } = await client
    .from("notion_object_links")
    .select("last_export_hash, last_import_hash, notion_page_id")
    .eq("id", context.objectLinkId)
    .maybeSingle();

  const caption = await getLatestApprovedCaption(input.contentItemId);
  const localHash = caption?.contentHash ?? null;

  let remoteHash: string | null = null;
  if (objectLink?.notion_page_id) {
    const page = await fetchNotionPage(objectLink.notion_page_id);
    const captionMapping = context.fieldMappings.find((m: NotionFieldMapping) => m.field === "caption_content");
    const remoteContent = captionMapping
      ? page.properties[captionMapping.propertyId]?.rich_text?.map((r: NotionRichText) => r.plain_text).join("") ?? ""
      : "";
    remoteHash = sha256(remoteContent);
  }

  const lastExportHash = objectLink?.last_export_hash ?? null;
  const lastImportHash = objectLink?.last_import_hash ?? null;

  const needsPush = localHash !== null && lastExportHash !== localHash;
  const needsPull = remoteHash !== null && lastImportHash !== remoteHash;
  const conflict =
    lastExportHash !== null &&
    lastImportHash !== null &&
    localHash !== null &&
    remoteHash !== null &&
    lastExportHash !== localHash &&
    lastImportHash !== remoteHash &&
    localHash !== remoteHash;

  return {
    hasNotionLink: true,
    lastExportHash,
    lastImportHash,
    localCaptionHash: localHash,
    remoteCaptionHash: remoteHash,
    needsPush,
    needsPull,
    conflict,
    error: undefined,
  };
}