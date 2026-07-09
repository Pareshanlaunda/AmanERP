"use server";

import { revalidateAfterUserCreated } from "@/lib/revalidate";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/users";
import type { Profile } from "@/lib/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

export async function adminExists(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (error) {
      // Fail CLOSED: if we can't verify, assume admin exists.
      // This prevents the setup page from opening during DB outages.
      console.error("[adminExists] DB error — assuming admin exists for safety:", error.message);
      return true;
    }
    return (count ?? 0) > 0;
  } catch {
    // Fail CLOSED on any unexpected error
    return true;
  }
}

export async function createUser(data: CreateUserInput): Promise<ActionResult> {
  await requireUserWithRole(["admin"]);

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  return createUserWithAdminClient(parsed.data);
}

export async function createFirstAdmin(
  data: CreateUserInput,
  setupToken?: string | null
): Promise<ActionResult> {
  const hasAdmin = await adminExists();
  if (hasAdmin) {
    return { success: false, error: "Setup already completed. Sign in instead." };
  }

  // Optional SETUP_TOKEN: when set, first admin creation requires the matching token.
  // Prevents race where an attacker claims /setup before you do.
  const expectedToken = process.env.SETUP_TOKEN?.trim();
  if (expectedToken) {
    const provided = (setupToken ?? "").trim();
    if (!provided || provided !== expectedToken) {
      return { success: false, error: "Invalid setup token. Check SETUP_TOKEN in env." };
    }
  }

  if (data.role !== "admin") {
    return { success: false, error: "First account must be an admin" };
  }

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  return createUserWithAdminClient(parsed.data);
}

async function createUserWithAdminClient(data: CreateUserInput): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email.trim(),
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name.trim() },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    full_name: data.full_name.trim(),
    role: data.role,
    employee_type: data.role === "employee" ? (data.employee_type ?? "general") : null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: profileError.message };
  }

  revalidateAfterUserCreated();
  return { success: true };
}

export async function listUsers(): Promise<(Profile & { email?: string })[]> {
  await requireUserWithRole(["admin"]);

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !profiles) return [];

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  return profiles.map((p) => ({
    ...(p as Profile),
    email: emailMap.get(p.id),
  }));
}

export async function getUserRoleCounts() {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role");
  const rows = data ?? [];
  return {
    admin: rows.filter((r) => r.role === "admin").length,
    employee: rows.filter((r) => r.role === "employee").length,
  };
}
