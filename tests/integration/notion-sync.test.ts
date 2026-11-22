import { describe, expect, it, vi } from "vitest";
import { notionFieldMappingsSchema } from "@/features/notion/contracts";
import { synchronizeNotionWebhookImport } from "@/features/notion/sync";

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
]);

describe("Notion import orchestration", () => {
  it("fetches the authoritative page and applies one scoped idempotent import", async () => {
    const applyImport = vi
      .fn()
      .mockResolvedValue({ project_id: "project-1", applied: true });
    const recordFailure = vi.fn();

    await expect(
      synchronizeNotionWebhookImport("event-1", {
        getContext: vi.fn().mockResolvedValue({
          webhookEventId: "event-1",
          syncRunId: "run-1",
          attemptNumber: 0,
          externalObjectId: "page-1",
          fieldMappings: mappings,
        }),
        fetchPage: vi.fn().mockResolvedValue({
          id: "page-1",
          lastEditedAt: "2026-11-15T05:00:00.000Z",
          properties: {
            Name: { title: [{ plain_text: "Imported event" }] },
            Event: { date: { start: "2026-12-01" } },
            Deadline: { date: { start: "2026-11-30" } },
          },
        }),
        applyImport,
        recordFailure,
      }),
    ).resolves.toEqual({ project_id: "project-1", applied: true });

    expect(applyImport).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookEventId: "event-1",
        title: "Imported event",
        externalPageId: "page-1",
      }),
    );
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("records an outage for retry without leaking a provider error", async () => {
    const recordFailure = vi.fn().mockResolvedValue(undefined);
    await expect(
      synchronizeNotionWebhookImport("event-1", {
        getContext: vi.fn().mockResolvedValue({
          webhookEventId: "event-1",
          syncRunId: "run-1",
          attemptNumber: 0,
          externalObjectId: "page-1",
          fieldMappings: mappings,
        }),
        fetchPage: vi.fn().mockRejectedValue(new Error("provider unavailable")),
        applyImport: vi.fn(),
        recordFailure,
      }),
    ).rejects.toThrow("provider unavailable");

    expect(recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        syncRunId: "run-1",
        state: "retry_scheduled",
        errorCode: "notion_sync_unavailable",
      }),
    );
  });

  it("dead-letters an exhausted retry without starting another loop", async () => {
    const recordFailure = vi.fn().mockResolvedValue(undefined);
    await expect(
      synchronizeNotionWebhookImport("event-1", {
        getContext: vi.fn().mockResolvedValue({
          webhookEventId: "event-1",
          syncRunId: "run-1",
          attemptNumber: 4,
          externalObjectId: "page-1",
          fieldMappings: mappings,
        }),
        fetchPage: vi.fn().mockRejectedValue(new Error("provider unavailable")),
        applyImport: vi.fn(),
        recordFailure,
      }),
    ).rejects.toThrow("provider unavailable");

    expect(recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        syncRunId: "run-1",
        state: "dead_lettered",
        nextAttemptAt: null,
      }),
    );
  });

  it("records an invalid mapped property as a conflict instead of retrying it", async () => {
    const recordFailure = vi.fn().mockResolvedValue(undefined);
    await expect(
      synchronizeNotionWebhookImport("event-1", {
        getContext: vi.fn().mockResolvedValue({
          webhookEventId: "event-1",
          syncRunId: "run-1",
          attemptNumber: 0,
          externalObjectId: "page-1",
          fieldMappings: mappings,
        }),
        fetchPage: vi.fn().mockResolvedValue({
          id: "page-1",
          lastEditedAt: "2026-11-15T05:00:00.000Z",
          properties: {
            Name: { title: [{ plain_text: "Imported event" }] },
            Event: { date: { start: "not-a-date" } },
            Deadline: { date: null },
          },
        }),
        applyImport: vi.fn(),
        recordFailure,
      }),
    ).rejects.toThrow("mapped Notion date is invalid");

    expect(recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        syncRunId: "run-1",
        state: "conflict",
        errorCode: "notion_mapping_invalid",
        nextAttemptAt: null,
      }),
    );
  });
});
