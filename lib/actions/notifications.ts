"use server";

import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/database";

export async function getNotifications(): Promise<Notification[]> {
  const user = await getUserWithRole();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[notifications] getNotifications failed", error.message);
    throw new Error("Unable to load notifications");
  }

  return (data ?? []) as Notification[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await getUserWithRole();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  if (error) {
    console.error("[notifications] markNotificationRead failed", error.message);
    throw new Error("Unable to mark notification read");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getUserWithRole();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) {
    console.error("[notifications] markAllNotificationsRead failed", error.message);
    throw new Error("Unable to mark notifications read");
  }
}
