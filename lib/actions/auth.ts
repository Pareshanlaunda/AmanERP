"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { dashboardPathForRole } from "@/lib/auth/get-user";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
  getRemainingLockoutSeconds,
} from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  // Vercel sets x-forwarded-for; fall back to a generic key
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signIn(email: string, password: string) {
  const ip = await getClientIp();

  if (isRateLimited(ip)) {
    const seconds = getRemainingLockoutSeconds(ip);
    const minutes = Math.ceil(seconds / 60);
    return {
      success: false as const,
      error: `Too many login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    recordFailedAttempt(ip);
    return { success: false as const, error: error.message };
  }

  // Successful login — clear any recorded failures for this IP
  clearAttempts(ip);

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
