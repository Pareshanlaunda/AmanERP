"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { dashboardPathForRole } from "@/lib/auth/get-user";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
  getRemainingLockoutSeconds,
} from "@/lib/auth/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

const signInSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  // Set by reverse proxy (Hostinger Nginx / Vercel). Trust only when proxy strips client spoofing.
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signIn(email: string, password: string) {
  const parsed = signInSchema.safeParse({ email: email.trim(), password });
  if (!parsed.success) {
    return { success: false as const, error: "Invalid email or password" };
  }

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

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

  // Return path for client navigation. Avoid redirect() here — on Hostinger
  // Next's post-action redirect fetch often fails (runtime: "failed to get
  // redirect response TypeError: fetch failed") and leaves login hung.
  return {
    success: true as const,
    redirectTo: dashboardPathForRole(profile.role as UserRole),
  };
}
