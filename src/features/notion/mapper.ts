import type {
  NotionFieldMapping,
  NotionFieldMappings,
} from "@/features/notion/contracts";
import { notionPostStatusSchema } from "@/features/notion/contracts";

export type { NotionFieldMappings, NotionFieldMapping };

export type NotionRichText = {
  plain_text: string;
  [key: string]: unknown;
};

type NotionPropertyValue = {
  type?: string;
  title?: unknown;
  rich_text?: NotionRichText[];
  date?: unknown;
  select?: unknown;
  status?: unknown;
  people?: unknown;
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
  postStatus: string | null;
  postStatusMapped: boolean;
  assigneeUserIds: string[];
  assigneeRefsMapped: boolean;
};

export class NotionMappingError extends Error {
  constructor(
    message: string,
    readonly field:
      | "project_title"
      | "event_start_at"
      | "deadline_at"
      | "post_status"
      | "assignee_refs"
      | "page",
    readonly reason:
      | "property_missing"
      | "property_wrong_type"
      | "value_missing_or_invalid"
      | "timestamp_invalid",
  ) {
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
  if (!titleProperty) {
    throw new NotionMappingError(
      "The mapped Notion title is invalid.",
      "project_title",
      "property_missing",
    );
  }
  if (titleProperty.type && titleProperty.type !== "title") {
    throw new NotionMappingError(
      "The mapped Notion title is invalid.",
      "project_title",
      "property_wrong_type",
    );
  }
  const title = richText(titleProperty?.title);

  if (!title || title.length > 160) {
    throw new NotionMappingError(
      "The mapped Notion title is invalid.",
      "project_title",
      "value_missing_or_invalid",
    );
  }

  const eventMapping = mappingFor(input.mappings, "event_start_at");
  const deadlineMapping = mappingFor(input.mappings, "deadline_at");
  const eventProperty = propertyFor(input.page, eventMapping);
  const deadlineProperty = propertyFor(input.page, deadlineMapping);
  if (!eventProperty) {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "event_start_at",
      "property_missing",
    );
  }
  if (eventProperty.type && eventProperty.type !== "date") {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "event_start_at",
      "property_wrong_type",
    );
  }
  if (!deadlineProperty) {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "deadline_at",
      "property_missing",
    );
  }
  if (deadlineProperty.type && deadlineProperty.type !== "date") {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "deadline_at",
      "property_wrong_type",
    );
  }
  const eventStartsAt = dateValue(eventProperty.date);
  const deadlineAt = dateValue(deadlineProperty.date);

  if (eventStartsAt === undefined) {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "event_start_at",
      "value_missing_or_invalid",
    );
  }
  if (deadlineAt === undefined) {
    throw new NotionMappingError(
      "A mapped Notion date is invalid.",
      "deadline_at",
      "value_missing_or_invalid",
    );
  }

  if (Number.isNaN(Date.parse(input.page.lastEditedAt))) {
    throw new NotionMappingError(
      "The Notion page timestamp is invalid.",
      "page",
      "timestamp_invalid",
    );
  }

  const statusMapping = mappingFor(input.mappings, "post_status");
  const statusProperty = propertyFor(input.page, statusMapping);
  let postStatus: string | null = null;
  if (statusMapping && !statusProperty) {
    throw new NotionMappingError(
      "The mapped Notion schedule status is invalid.",
      "post_status",
      "property_missing",
    );
  }
  if (statusProperty?.type && statusProperty.type !== "status") {
    throw new NotionMappingError(
      "The mapped Notion schedule status is invalid.",
      "post_status",
      "property_wrong_type",
    );
  }
  if (statusMapping && statusProperty && !("status" in statusProperty)) {
    throw new NotionMappingError(
      "The mapped Notion schedule status is invalid.",
      "post_status",
      "value_missing_or_invalid",
    );
  }
  if (statusProperty?.status !== undefined && statusProperty.status !== null) {
    const statusName =
      typeof statusProperty.status === "object" &&
      statusProperty.status !== null &&
      "name" in statusProperty.status &&
      typeof statusProperty.status.name === "string"
        ? statusProperty.status.name
        : null;
    const parsedStatus = notionPostStatusSchema.safeParse(statusName);
    if (!parsedStatus.success) {
      throw new NotionMappingError(
        "The mapped Notion schedule status is invalid.",
        "post_status",
        "value_missing_or_invalid",
      );
    }
    postStatus = parsedStatus.data;
  }

  const assigneeMapping = mappingFor(input.mappings, "assignee_refs");
  const assigneeProperty = propertyFor(input.page, assigneeMapping);
  let assigneeUserIds: string[] = [];
  if (assigneeMapping && !assigneeProperty) {
    throw new NotionMappingError(
      "The mapped Notion assignee field is invalid.",
      "assignee_refs",
      "property_missing",
    );
  }
  if (assigneeProperty?.type && assigneeProperty.type !== "people") {
    throw new NotionMappingError(
      "The mapped Notion assignee field is invalid.",
      "assignee_refs",
      "property_wrong_type",
    );
  }
  if (assigneeProperty?.people !== undefined) {
    if (
      !Array.isArray(assigneeProperty.people) ||
      assigneeProperty.people.length > 100
    ) {
      throw new NotionMappingError(
        "The mapped Notion assignee field is invalid.",
        "assignee_refs",
        "value_missing_or_invalid",
      );
    }
    const ids = assigneeProperty.people.map((person) =>
      typeof person === "object" &&
      person !== null &&
      "id" in person &&
      typeof person.id === "string"
        ? person.id.trim()
        : "",
    );
    if (ids.some((id) => !id || id.length > 200)) {
      throw new NotionMappingError(
        "The mapped Notion assignee field is invalid.",
        "assignee_refs",
        "value_missing_or_invalid",
      );
    }
    assigneeUserIds = [...new Set(ids)];
  } else if (assigneeMapping) {
    throw new NotionMappingError(
      "The mapped Notion assignee field is invalid.",
      "assignee_refs",
      "value_missing_or_invalid",
    );
  }

  return {
    externalPageId: input.page.id,
    externalEditedAt: input.page.lastEditedAt,
    title,
    eventStartsAt,
    deadlineAt,
    postStatus,
    postStatusMapped: Boolean(statusMapping),
    assigneeUserIds,
    assigneeRefsMapped: Boolean(assigneeMapping),
  };
}
