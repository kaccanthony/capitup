import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/notion/actions", () => ({
  configureNotionIntegrationAction: vi.fn(),
  replayNotionDeadLetterAction: vi.fn(),
  resolveNotionSyncConflictAction: vi.fn(),
  resumeNotionSyncRunAction: vi.fn(),
  verifyAndActivateNotionIntegrationAction: vi.fn(),
}));

import { NotionIntegrationPanel } from "@/features/notion/notion-integration-panel";

describe("Notion integration administration panel", () => {
  it("shows safe import setup and actionable degraded sync state without a token", () => {
    render(
      <NotionIntegrationPanel
        organizationId="10000000-0000-4000-8000-000000000001"
        overview={{
          connection: {
            id: "20000000-0000-4000-8000-000000000001",
            label: "Development calendar",
            status: "degraded",
            workspaceId: "workspace-saved",
            subscriptionId: "subscription-saved",
            dataSourceId: "data-source-1",
            mappings: [
              {
                field: "project_title",
                direction: "import",
                propertyId: "post-title-id",
                propertyType: "title",
              },
              {
                field: "event_start_at",
                direction: "import",
                propertyId: "event-date-id",
                propertyType: "date",
              },
              {
                field: "deadline_at",
                direction: "import",
                propertyId: "deadline-id",
                propertyType: "date",
              },
              {
                field: "post_status",
                direction: "import",
                propertyId: "post-status-id",
                propertyType: "status",
              },
              {
                field: "assignee_refs",
                direction: "import",
                propertyId: "assignee-id",
                propertyType: "people",
              },
            ],
            lastSuccessAt: null,
            lastFailureAt: "2026-11-15T08:00:00.000Z",
            lastErrorCode: "notion_sync_unavailable",
          },
          recentRuns: [
            {
              id: "30000000-0000-4000-8000-000000000001",
              direction: "import",
              state: "retry_scheduled",
              errorCode: "notion_sync_unavailable",
              createdAt: "2026-11-15T08:00:00.000Z",
            },
          ],
          openConflicts: [
            {
              id: "40000000-0000-4000-8000-000000000001",
              kind: "property_changed",
              detailCode: "notion_sync_conflict",
              createdAt: "2026-11-15T08:00:00.000Z",
            },
          ],
          deadLetters: [
            {
              id: "50000000-0000-4000-8000-000000000001",
              reasonCode: "notion_sync_unavailable",
              replayCount: 4,
            },
          ],
        }}
        serverConfigured={false}
      />,
    );

    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Posting title property ID (title)"),
    ).toBeRequired();
    expect(
      screen.getByLabelText("Posting date property ID (date)"),
    ).toBeRequired();
    expect(screen.getByLabelText("Deadline property ID (date)")).toBeRequired();
    expect(
      screen.getByLabelText("Post STATUS property ID (status, optional)"),
    ).toHaveValue("post-status-id");
    expect(
      screen.getByLabelText("Assignee property ID (people, optional)"),
    ).toHaveValue("assignee-id");
    expect(screen.getAllByText("notion_sync_unavailable")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Retry now" })).toBeEnabled();
    expect(screen.getByLabelText("Notion workspace ID")).toHaveValue(
      "workspace-saved",
    );
    expect(screen.getByLabelText("Webhook subscription ID")).toHaveValue(
      "subscription-saved",
    );
    expect(
      screen.getByLabelText("Posting title property ID (title)"),
    ).toHaveValue("post-title-id");
    const workspaceField = screen.getByLabelText("Notion workspace ID");
    expect(workspaceField).toHaveAttribute("type", "password");
    fireEvent.click(
      screen.getByRole("button", { name: "Show Notion workspace ID" }),
    );
    expect(workspaceField).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Acknowledge resolution" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/Caption embed link/i),
    ).toBeInTheDocument();
  });
});
