import { describe, expect, it } from "vitest";
import { notionFieldMappingsSchema } from "@/features/notion/contracts";
import {
  buildNotionExportProperties,
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
    });
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

  it("exports only configured CapItUp-owned metadata", () => {
    expect(
      buildNotionExportProperties({
        mappings,
        values: {
          workflowStatus: "In review",
          deepLink: "https://capitup.example/projects/project-1",
        },
      }),
    ).toEqual({
      Status: { status: { name: "In review" } },
      CapItUp: { url: "https://capitup.example/projects/project-1" },
    });
  });
});
