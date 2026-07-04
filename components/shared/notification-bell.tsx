"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import type { Notification } from "@/lib/types/database";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type NotificationBellProps = {
  userId: string;
  initialNotifications: Notification[];
  leadLinkPrefix: string;
};

export function NotificationBell({
  userId,
  initialNotifications,
  leadLinkPrefix,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const unread = useMemo(
    () => notifications.filter((n) => !n.read_at),
    [notifications]
  );

  useEffect(() => {
    if (!hydratedRef.current) {
      setNotifications(initialNotifications);
      hydratedRef.current = true;
      return;
    }

    setNotifications((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      for (const item of initialNotifications) {
        if (!byId.has(item.id)) byId.set(item.id, item);
      }
      return [...byId.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 20);
    });
  }, [initialNotifications]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, 20);
          });
          toast.info(row.title, { description: row.body });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleMarkRead(id: string) {
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n))
    );
    startTransition(async () => {
      await markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? readAt })));
    startTransition(async () => {
      await markAllNotificationsRead();
      setOpen(false);
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="outline"
        className="relative h-11 w-11 shrink-0 p-0"
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold leading-none text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 max-h-[min(28rem,calc(100vh-6rem))] overflow-hidden rounded-xl border bg-card shadow-xl sm:absolute sm:inset-x-auto sm:inset-y-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-96 sm:w-[min(22rem,calc(100vw-2rem))] sm:rounded-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-medium">Notifications</div>
              {unread.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-[min(24rem,calc(100vh-10rem))] space-y-2 overflow-y-auto p-3 sm:max-h-96">
              {notifications.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                notifications.slice(0, 12).map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-md border p-3 text-sm ${
                      notification.read_at ? "opacity-60" : "bg-muted/40"
                    }`}
                  >
                    <div className="font-medium">{notification.title}</div>
                    <p className="mt-1 text-muted-foreground">{notification.body}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {notification.lead_id && (
                        <Link
                          href={`${leadLinkPrefix}/${notification.lead_id}`}
                          className="text-primary hover:underline"
                          onClick={() => setOpen(false)}
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
