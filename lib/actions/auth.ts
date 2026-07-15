"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { dashboardPathForRole } from "@/lib/auth/get-user";
import {
  isLoginRateLimitedAsync,
  recordLoginFailureAsync,
  clearLoginAttemptsAsync,
  getRemainingLockoutSeconds,
} from "@/lib/auth/rate-limit";
import { clientIpFromHeaders } from "@/lib/auth/client-ip";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

/** Generic client message — never echo Auth/DB error text (enumeration / leak). */
const INVALID_CREDENTIALS = "Invalid email or password";

const ALLOWED_POST_LOGIN_PATHS = new Set([
  "/admin/dashboard",
  "/employee/dashboard",
]);

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return clientIpFromHeaders(hdrs);
}

function loginKeys(ip: string, email: string): string[] {
  return [`ip:${ip}`, `email:${email}`];
}

async function isAnyLimited(keys: string[]): Promise<boolean> {
  for (const key of keys) {
    if (await isLoginRateLimitedAsync(key)) return true;
  }
  return false;
}

async function recordFailures(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => recordLoginFailureAsync(key)));
}

async function clearFailures(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => clearLoginAttemptsAsync(key)));
}

function maxRemainingLockout(keys: string[]): number {
  return Math.max(0, ...keys.map((key) => getRemainingLockoutSeconds(key)));
}

export async function signIn(email: string, password: string) {
  // Reject non-strings early (prototype pollution / FormData misuse).
  if (typeof email !== "string" || typeof password !== "string") {
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  const ip = await getClientIp();
  const keys = loginKeys(ip, parsed.data.email);

  if (await isAnyLimited(keys)) {
    const seconds = maxRemainingLockout(keys);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return {
      success: false as const,
      error: `Too many login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  // Auth GoTrue API — credentials sent as JSON body, not SQL string concat.
  // Profile read below uses PostgREST .eq() bind (parameterized), never raw SQL.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await recordFailures(keys);
    // Do not return error.message (can distinguish users / leak Auth internals).
    if (process.env.NODE_ENV !== "production") {
      console.error("[signIn] auth failed", error?.code ?? "unknown");
    }
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  // Bound filter on auth user id — PostgREST parameterized eq, not string-built SQL.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    await recordFailures(keys);
    await supabase.auth.signOut();
    if (process.env.NODE_ENV !== "production") {
      console.error("[signIn] profile missing", profileError?.code ?? "none");
    }
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  const role = profile.role as UserRole;
  if (role !== "admin" && role !== "employee") {
    await recordFailures(keys);
    await supabase.auth.signOut();
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  await clearFailures(keys);

  const redirectTo = dashboardPathForRole(role);
  if (!ALLOWED_POST_LOGIN_PATHS.has(redirectTo)) {
    await supabase.auth.signOut();
    return { success: false as const, error: INVALID_CREDENTIALS };
  }

  // Client navigation path only — never return role/user ids in this payload.
  return {
    success: true as const,
    redirectTo,
  };
}
