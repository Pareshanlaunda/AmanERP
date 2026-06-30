"use server";

import { redirect } from "next/navigation";
import { dashboardPathForRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false as const, error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    return { success: false as const, error: "No profile found for this account. Contact admin." };
  }

  redirect(dashboardPathForRole(profile.role as UserRole));
}
