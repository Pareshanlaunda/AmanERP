"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { Notification } from "@/lib/types/database";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

type NotificationsListProps = {
  notifications: Notification[];
  leadLinkPrefix: string;
};

export function NotificationsList({ notifications, leadLinkPrefix }: NotificationsListProps) {
  const [isPending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Notifications
          {unread.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {unread.length}
            </span>
          )}
        </CardTitle>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.slice(0, 8).map((notification) => (
            <div
              key={notification.id}
              className={`rounded-md border p-3 text-sm ${notification.read_at ? "opacity-60" : "bg-muted/40"}`}
            >
              <div className="font-medium">{notification.title}</div>
              <p className="mt-1 text-muted-foreground">{notification.body}</p>
              <div className="mt-2 flex items-center gap-2">
                {notification.lead_id && (
                  <Link
                    href={`${leadLinkPrefix}/${notification.lead_id}`}
                    className="text-primary hover:underline"
                  >
                    View lead
                  </Link>
                )}
                {!notification.read_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={isPending}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
