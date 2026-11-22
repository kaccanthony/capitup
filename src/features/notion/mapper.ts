import type {
  NotionFieldMapping,
  NotionFieldMappings,
} from "@/features/notion/contracts";

type NotionPropertyValue = {
  type?: string;
  title?: unknown;
  rich_text?: unknown;
  date?: unknown;
  select?: unknown;
  status?: unknown;
  url?: unknown;
};

export type NotionPageForMapping = {
  id: string;
  lastEditedAt: string;
  properties: Record<string, NotionPropertyValue>;
};

export type ImportedNotionProject = {
  externalPageId: string;
  externalEditedAt: string;
  title: string;
  eventStartsAt: string | null;
  deadlineAt: string | null;
};

export type NotionExportValues = {
  writerSummary?: string | null;
  workflowStatus?: string | null;
  deepLink?: string | null;
};

export type NotionPropertyUpdate =
  | { rich_text: { text: { content: string } }[] }
  | { select: { name: string } | null }
  | { status: { name: string } | null }
  | { url: string | null };

export class NotionMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotionMappingError";
  }
}

function mappingFor(
  mappings: NotionFieldMappings,
  field: NotionFieldMapping["field"],
) {
  return mappings.find((mapping) => mapping.field === field) ?? null;
}

function richText(value: unknown) {
  if (!Array.isArray(value)) return null;

  const text = value
    .map((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        "plain_text" in part &&
        typeof part.plain_text === "string"
      ) {
        return part.plain_text;
      }
      return "";
    })
    .join("")
    .trim();

  return text || null;
}

function dateValue(value: unknown) {
  if (value === null) return null;
  if (
    typeof value !== "object" ||
    value === null ||
    !("start" in value) ||
    typeof value.start !== "string" ||
    Number.isNaN(Date.parse(value.start))
  ) {
    return undefined;
  }
  return value.start;
}

function propertyFor(
  page: NotionPageForMapping,
  mapping: NotionFieldMapping | null,
) {
  if (!mapping) return null;
  return page.properties[mapping.propertyId] ?? null;
}

/**
 * Only the three Notion-owned fields may enter CapItUp from this mapper. The
 * mapping is intentionally unable to represent a caption body or version.
 */
export function mapNotionPageToProject(input: {
  page: NotionPageForMapping;
  mappings: NotionFieldMappings;
}): ImportedNotionProject {
  const titleMapping = mappingFor(input.mappings, "project_title");
  const titleProperty = propertyFor(input.page, titleMapping);
  const title = richText(titleProperty?.title);

  if (!title || title.length > 160) {
    throw new NotionMappingError("The mapped Notion title is invalid.");
  }

  const eventMapping = mappingFor(input.mappings, "event_start_at");
  const deadlineMapping = mappingFor(input.mappings, "deadline_at");
  const eventStartsAt = dateValue(propertyFor(input.page, eventMapping)?.date);
  const deadlineAt = dateValue(propertyFor(input.page, deadlineMapping)?.date);

  if (eventStartsAt === undefined || deadlineAt === undefined) {
    throw new NotionMappingError("A mapped Notion date is invalid.");
  }

  if (Number.isNaN(Date.parse(input.page.lastEditedAt))) {
    throw new NotionMappingError("The Notion page timestamp is invalid.");
  }

  return {
    externalPageId: input.page.id,
    externalEditedAt: input.page.lastEditedAt,
    title,
    eventStartsAt,
    deadlineAt,
  };
}

/**
 * Export is intentionally limited to app-owned metadata. O-021 is unresolved,
 * so a final approved caption cannot be encoded by this mapper.
 */
export function buildNotionExportProperties(input: {
  mappings: NotionFieldMappings;
  values: NotionExportValues;
}): Record<string, NotionPropertyUpdate> {
  const result: Record<string, NotionPropertyUpdate> = {};

  const writer = mappingFor(input.mappings, "writer_summary");
  if (writer && input.values.writerSummary !== undefined) {
    const value = input.values.writerSummary?.trim() ?? "";
    if (value.length > 2_000) throw new Error("Writer summary is too long.");
    result[writer.propertyId] = {
      rich_text: value ? [{ text: { content: value } }] : [],
    };
  }

  const status = mappingFor(input.mappings, "workflow_status");
  if (status && input.values.workflowStatus !== undefined) {
    const value = input.values.workflowStatus?.trim() ?? null;
    if (value && value.length > 120)
      throw new Error("Workflow status is too long.");
    result[status.propertyId] =
      status.propertyType === "status"
        ? { status: value ? { name: value } : null }
        : { select: value ? { name: value } : null };
  }

  const deepLink = mappingFor(input.mappings, "deep_link");
  if (deepLink && input.values.deepLink !== undefined) {
    const value = input.values.deepLink?.trim() ?? null;
    if (value) {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Deep link must use HTTP or HTTPS.");
      }
    }
    result[deepLink.propertyId] = { url: value };
  }

  return result;
}
