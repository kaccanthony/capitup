import type { Database } from "@/types/database";

export type NotificationRow =
  Database["public"]["Tables"]["workflow_notifications"]["Row"];

export function countUnreadNotifications(
  notifications: readonly NotificationRow[],
): number {
  return notifications.filter((notification) => !notification.read_at).length;
}

export function upsertNotification(
  notifications: readonly NotificationRow[],
  notification: NotificationRow,
): NotificationRow[] {
  return [
    notification,
    ...notifications.filter((current) => current.id !== notification.id),
  ]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 50);
}

export function removeNotification(
  notifications: readonly NotificationRow[],
  notificationId: string,
): NotificationRow[] {
  return notifications.filter(
    (notification) => notification.id !== notificationId,
  );
}

export function isNotificationRow(value: unknown): value is NotificationRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.recipient_user_id === "string" &&
    typeof row.organization_id === "string" &&
    typeof row.content_item_id === "string" &&
    (typeof row.workflow_instance_id === "string" ||
      row.workflow_instance_id === null) &&
    (typeof row.caption_version_id === "string" ||
      row.caption_version_id === null) &&
    typeof row.kind === "string" &&
    (typeof row.read_at === "string" || row.read_at === null) &&
    typeof row.created_at === "string"
  );
}
