import "server-only";

import {
  applyNotionProjectImport,
  getNotionWebhookProcessingContext,
  recordNotionSyncFailure,
  sha256,
} from "@/features/notion/data";
import {
  mapNotionPageToProject,
  NotionMappingError,
  type NotionPageForMapping,
} from "@/features/notion/mapper";
import {
  fetchNotionPage,
  notionErrorStatusCode,
} from "@/features/notion/notion-client";
import {
  classifyNotionSyncFailure,
  nextNotionRetryAt,
} from "@/features/notion/retry";

export type NotionImportGateway = {
  getContext: typeof getNotionWebhookProcessingContext;
  fetchPage: (pageId: string) => Promise<NotionPageForMapping>;
  applyImport: typeof applyNotionProjectImport;
  recordFailure: typeof recordNotionSyncFailure;
};

const defaultGateway: NotionImportGateway = {
  getContext: getNotionWebhookProcessingContext,
  fetchPage: fetchNotionPage,
  applyImport: applyNotionProjectImport,
  recordFailure: recordNotionSyncFailure,
};

export async function synchronizeNotionWebhookImport(
  webhookEventId: string,
  gateway: NotionImportGateway = defaultGateway,
) {
  const context = await gateway.getContext(webhookEventId);

  try {
    const page = await gateway.fetchPage(context.externalObjectId);
    const imported = mapNotionPageToProject({
      page,
      mappings: context.fieldMappings,
    });
    return await gateway.applyImport({
      webhookEventId: context.webhookEventId,
      externalPageId: imported.externalPageId,
      externalEditedAt: imported.externalEditedAt,
      title: imported.title,
      eventStartsAt: imported.eventStartsAt,
      deadlineAt: imported.deadlineAt,
      payloadHash: sha256(JSON.stringify(imported)),
    });
  } catch (error) {
    const statusCode = notionErrorStatusCode(error);
    const failure =
      error instanceof NotionMappingError
        ? "conflict"
        : classifyNotionSyncFailure({
            statusCode,
            attempt: context.attemptNumber,
          });
    const state =
      failure === "retry"
        ? "retry_scheduled"
        : failure === "conflict"
          ? "conflict"
          : "dead_lettered";
    await gateway.recordFailure({
      syncRunId: context.syncRunId,
      state,
      errorCode:
        error instanceof NotionMappingError
          ? "notion_mapping_invalid"
          : statusCode === 409 || statusCode === 412
            ? "notion_sync_conflict"
            : statusCode === 404
              ? "notion_external_object_missing"
              : error instanceof Error
                ? "notion_sync_unavailable"
                : "notion_sync_invalid",
      nextAttemptAt:
        state === "retry_scheduled"
          ? nextNotionRetryAt({ attempt: context.attemptNumber })
          : null,
    });
    throw error;
  }
}
