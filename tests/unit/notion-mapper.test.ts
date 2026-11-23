import { describe, expect, it } from "vitest";
import { notionFieldMappingsSchema } from "@/features/notion/contracts";
import {
  NotionMappingError,
  mapNotionPageToProject,
} from "@/features/notion/mapper";

const mappings = notionFieldMappingsSchema.parse([
  {
    field: "project_title",
    direction: "import",
    propertyId: "Name",
    propertyType: "title",
  },
  {
    field: "event_start_at",
    direction: "import",
    propertyId: "Event",
    propertyType: "date",
  },
  {
    field: "deadline_at",
    direction: "import",
    propertyId: "Deadline",
    propertyType: "date",
  },
  {
    field: "workflow_status",
    direction: "export",
    propertyId: "Status",
    propertyType: "status",
  },
  {
    field: "deep_link",
    direction: "export",
    propertyId: "CapItUp",
    propertyType: "url",
  },
]);

describe("Notion field mapping", () => {
  it("imports only Notion-owned project metadata", () => {
    expect(
      mapNotionPageToProject({
        mappings,
        page: {
          id: "page-1",
          lastEditedAt: "2026-11-15T04:00:00.000Z",
          properties: {
            Name: { title: [{ plain_text: "Open Day" }] },
            Event: { date: { start: "2026-12-01" } },
            Deadline: { date: null },
          },
        },
      }),
    ).toEqual({
      externalPageId: "page-1",
      externalEditedAt: "2026-11-15T04:00:00.000Z",
      title: "Open Day",
      eventStartsAt: "2026-12-01",
      deadlineAt: null,
      postStatus: null,
      postStatusMapped: false,
      assigneeUserIds: [],
      assigneeRefsMapped: false,
    });
  });

  it("imports schedule status and external assignee IDs without turning them into app state", () => {
    const metadataMappings = notionFieldMappingsSchema.parse([
      ...mappings,
      {
        field: "post_status",
        direction: "import",
        propertyId: "Post Status",
        propertyType: "status",
      },
      {
        field: "assignee_refs",
        direction: "import",
        propertyId: "Assignee",
        propertyType: "people",
      },
    ]);

    expect(
      mapNotionPageToProject({
        mappings: metadataMappings,
        page: {
          id: "page-2",
          lastEditedAt: "2026-11-15T04:00:00.000Z",
          properties: {
            Name: { type: "title", title: [{ plain_text: "Open Day" }] },
            Event: { type: "date", date: { start: "2026-12-01" } },
            Deadline: { type: "date", date: null },
            "Post Status": { type: "status", status: { name: "SCHEDULED" } },
            Assignee: {
              type: "people",
              people: [{ id: "notion-user-1" }, { id: "notion-user-1" }],
            },
          },
        },
      }),
    ).toMatchObject({
      postStatus: "SCHEDULED",
      postStatusMapped: true,
      assigneeUserIds: ["notion-user-1"],
      assigneeRefsMapped: true,
    });
  });

  it("rejects unknown posting status values", () => {
    const metadataMappings = notionFieldMappingsSchema.parse([
      ...mappings,
      {
        field: "post_status",
        direction: "import",
        propertyId: "Post Status",
        propertyType: "status",
      },
    ]);

    expect(() =>
      mapNotionPageToProject({
        mappings: metadataMappings,
        page: {
          id: "page-3",
          lastEditedAt: "2026-11-15T04:00:00.000Z",
          properties: {
            Name: { title: [{ plain_text: "Open Day" }] },
            Event: { date: null },
            Deadline: { date: null },
            "Post Status": { type: "status", status: { name: "UNKNOWN" } },
          },
        },
      }),
    ).toThrowError(NotionMappingError);
  });

  it("rejects a wrong type/direction and never permits a final-caption field", () => {
    expect(
      notionFieldMappingsSchema.safeParse([
        {
          field: "project_title",
          direction: "export",
          propertyId: "Name",
          propertyType: "title",
        },
      ]).success,
    ).toBe(false);

    expect(
      notionFieldMappingsSchema.safeParse([
        {
          field: "final_approved_caption",
          direction: "export",
          propertyId: "Caption",
          propertyType: "rich_text",
        },
      ]).success,
    ).toBe(false);
  });

  it("ignores legacy caption, status, and URL-property mappings", () => {
    const parsed = notionFieldMappingsSchema.parse([
      {
        field: "project_title",
        direction: "import",
        propertyId: "title",
        propertyType: "title",
      },
      {
        field: "caption_content",
        direction: "export",
        propertyId: "legacy-caption",
        propertyType: "rich_text",
      },
      {
        field: "writer_summary",
        direction: "export",
        propertyId: "legacy-summary",
        propertyType: "rich_text",
      },
      {
        field: "workflow_status",
        direction: "export",
        propertyId: "legacy-status",
        propertyType: "select",
      },
      {
        field: "viewer_url",
        direction: "export",
        propertyId: "capitup-url",
        propertyType: "url",
      },
    ]);

    expect(parsed).toEqual([
      {
        field: "project_title",
        direction: "import",
        propertyId: "title",
        propertyType: "title",
      },
    ]);
  });

  it("identifies a missing exact property mapping without exposing page data", () => {
    try {
      mapNotionPageToProject({
        mappings,
        page: {
          id: "page-1",
          lastEditedAt: "2026-11-15T04:00:00.000Z",
          properties: {
            Name: { type: "title", title: [{ plain_text: "Event" }] },
            Event: { type: "date", date: { start: "2026-12-01" } },
          },
        },
      });
      throw new Error("Expected mapping to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(NotionMappingError);
      expect(error).toMatchObject({
        field: "deadline_at",
        reason: "property_missing",
      });
    }
  });
});
