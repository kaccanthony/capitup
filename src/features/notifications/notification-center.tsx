"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  countUnreadNotifications,
  isNotificationRow,
  removeNotification,
  type NotificationRow,
  upsertNotification,
} from "@/features/notifications/model";

const notificationLabels: Readonly<Record<string, string>> = {
  assignment: "You were assigned to a caption",
  approval_requested: "A caption is ready for your review",
  changes_requested: "A caption needs refinement",
  approved: "A caption was approved",
  deadline: "A caption deadline needs attention",
  director_override: "A director override was recorded",
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const unreadCount = useMemo(
    () => countUnreadNotifications(notifications),
    [notifications],
  );

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    async function subscribe() {
      try {
        const client = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!active || !user) return;

        const { data, error: loadError } = await client
          .from("workflow_notifications")
          .select(
            "id,recipient_user_id,organization_id,content_item_id,workflow_instance_id,caption_version_id,kind,read_at,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(50);
        if (loadError) throw new Error("notification load failed");
        if (!active) return;
        setNotifications(data ?? []);
        setReady(true);

        const channel = client
          .channel(`workflow-notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "workflow_notifications",
              filter: `recipient_user_id=eq.${user.id}`,
            },
            (payload) => {
              if (!active) return;
              if (payload.eventType === "DELETE") {
                const deleted = payload.old as Record<string, unknown>;
                if (typeof deleted.id === "string") {
                  setNotifications((current) =>
                    removeNotification(current, deleted.id as string),
                  );
                }
                return;
              }
              const notification = payload.new;
              if (isNotificationRow(notification)) {
                setNotifications((current) =>
                  upsertNotification(current, notification),
                );
              }
            },
          )
          .subscribe();

        cleanup = () => {
          void client.removeChannel(channel);
        };
      } catch {
        if (active) setReady(false);
      }
    }

    void subscribe();
    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  async function markRead(notificationId: string) {
    setPendingId(notificationId);
    setError("");
    try {
      const client = createBrowserSupabaseClient();
      const { data, error: markError } = await client.rpc(
        "mark_notification_read",
        { p_notification_id: notificationId },
      );
      if (markError || !data) throw new Error("notification update failed");
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: notification.read_at ?? readAt }
            : notification,
        ),
      );
    } catch {
      setError("The notification could not be marked as read.");
    } finally {
      setPendingId(null);
    }
  }

  if (!ready) return null;

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        type="button"
        aria-label={
          unreadCount === 0
            ? "Open notifications"
            : `Open notifications, ${unreadCount} unread`
        }
        aria-expanded={open}
        aria-controls="notification-center-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id="notification-center-panel"
          className="notification-panel"
          aria-labelledby="notification-center-title"
        >
          <div className="notification-panel-header">
            <div>
              <p className="eyebrow">Updates</p>
              <h2 id="notification-center-title">Notifications</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <p className="notification-summary" aria-live="polite">
            {unreadCount === 0
              ? "You are all caught up."
              : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          </p>

          {error && (
            <p className="notification-error" role="alert">
              {error}
            </p>
          )}

          {notifications.length === 0 ? (
            <p className="notification-empty">No notifications yet.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li
                  className={
                    notification.read_at
                      ? "notification-item"
                      : "notification-item notification-item-unread"
                  }
                  key={notification.id}
                >
                  <div className="min-w-0">
                    <p className="notification-title">
                      {notificationLabels[notification.kind] ??
                        notification.kind.replaceAll("_", " ")}
                    </p>
                    <time
                      className="notification-time"
                      dateTime={notification.created_at}
                    >
                      {formatCreatedAt(notification.created_at)}
                    </time>
                  </div>
                  {!notification.read_at && (
                    <button
                      className="notification-read-button"
                      type="button"
                      disabled={pendingId === notification.id}
                      onClick={() => void markRead(notification.id)}
                    >
                      <Check aria-hidden="true" className="size-3.5" />
                      {pendingId === notification.id ? "Saving…" : "Mark read"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
