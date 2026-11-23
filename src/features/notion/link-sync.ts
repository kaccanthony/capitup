import "server-only";

import { getAccessibleContentItem } from "@/features/projects/data";
import { notionFieldMappingsSchema } from "@/features/notion/contracts";
import { createNotionClient } from "@/features/notion/notion-client";
import { getPublicEnvironment } from "@/lib/env/client";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class NotionLinkSyncError extends Error {
  constructor(readonly code: "unavailable" | "forbidden" | "mapping" | "link") {
    super("Cap-It-Up link sync could not be completed.");
    this.name = "NotionLinkSyncError";
  }
}

export async function syncCapItUpLink(input: {
  projectId: string;
  contentItemId: string;
}) {
  const client = await createServerSupabaseClient();
  if (!client) throw new NotionLinkSyncError("unavailable");
  const decision = await getAuthorizationForClient(client);
  if (decision.kind !== "active") throw new NotionLinkSyncError("forbidden");

  const item = await getAccessibleContentItem(
    input.projectId,
    input.contentItemId,
  );
  if (
    !item ||
    !item.canSyncNotionLink ||
    item.organizationId !== decision.organizationId
  ) {
    throw new NotionLinkSyncError("forbidden");
  }

  const { data: connection, error: connectionError } = await client
    .from("integration_connections")
    .select("id,status,field_mappings")
    .eq("organization_id", item.organizationId)
    .eq("provider", "notion")
    .maybeSingle();
  if (connectionError || !connection || connection.status !== "active") {
    throw new NotionLinkSyncError("unavailable");
  }

  const mappings = notionFieldMappingsSchema.safeParse(
    connection.field_mappings,
  );
  const urlMapping = mappings.success
    ? mappings.data.find((mapping) => mapping.field === "deep_link")
    : null;
  if (!urlMapping) throw new NotionLinkSyncError("mapping");

  const { data: claimed, error: claimError } = await client.rpc(
    "claim_notion_content_item_link",
    {
      p_project_id: input.projectId,
      p_content_item_id: input.contentItemId,
    },
  );
  if (claimError || !claimed) throw new NotionLinkSyncError("link");

  const { data: link, error: linkError } = await client
    .from("notion_object_links")
    .select("notion_page_id")
    .eq("integration_connection_id", connection.id)
    .eq("content_item_id", input.contentItemId)
    .maybeSingle();
  if (linkError || !link) throw new NotionLinkSyncError("link");

  const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new NotionLinkSyncError("unavailable");
  const capItUpUrl = new URL(
    `/projects/${input.projectId}/content/${input.contentItemId}/open`,
    appUrl,
  ).toString();

  await createNotionClient().pages.update({
    page_id: link.notion_page_id,
    properties: { [urlMapping.propertyId]: { url: capItUpUrl } },
  });
}
