"use server";

import { revalidatePath } from "next/cache";
import { getUserWithRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/database";

export async function getNotifications(): Promise<Notification[]> {
  const user = await getUserWithRole();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as Notification[];
}

export async function markNotificationRead(notificationId: string) {
  const user = await getUserWithRole();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/dashboard");
}

export async function markAllNotificationsRead() {
  const user = await getUserWithRole();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/dashboard");
}
