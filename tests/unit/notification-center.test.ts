import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  countUnreadNotifications,
  removeNotification,
  type NotificationRow,
  upsertNotification,
} from "@/features/notifications/model";

function notification(
  id: string,
  createdAt: string,
  readAt: string | null = null,
): NotificationRow {
  return {
    id,
    recipient_user_id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    content_item_id: "33333333-3333-4333-8333-333333333333",
    workflow_instance_id: null,
    caption_version_id: null,
    kind: "approval_requested",
    read_at: readAt,
    created_at: createdAt,
  };
}

describe("notification center", () => {
  it("maintains newest-first realtime state and unread totals", () => {
    const first = notification("first", "2026-11-15T01:00:00.000Z");
    const second = notification(
      "second",
      "2026-11-15T02:00:00.000Z",
      "2026-11-15T02:30:00.000Z",
    );

    const rows = upsertNotification([first], second);
    expect(rows.map((row) => row.id)).toEqual(["second", "first"]);
    expect(countUnreadNotifications(rows)).toBe(1);
    expect(removeNotification(rows, "first")).toEqual([second]);
  });

  it("loads through RLS, filters realtime by the current user, and marks read through the recipient-scoped RPC", async () => {
    const [component, migration] = await Promise.all([
      readFile("src/features/notifications/notification-center.tsx", "utf8"),
      readFile(
        "supabase/migrations/20261026000200_phase_04_workflows.sql",
        "utf8",
      ),
    ]);

    expect(component).toContain("client.auth.getUser()");
    expect(component).toContain('.from("workflow_notifications")');
    expect(component).toContain('event: "*"');
    expect(component).toContain("filter: `recipient_user_id=eq.${user.id}`");
    expect(component).toContain(
      'client.rpc(\n        "mark_notification_read"',
    );
    expect(migration).toContain("using (recipient_user_id = auth.uid())");
    expect(migration).toContain("recipient_user_id = auth.uid()");
  });
});
