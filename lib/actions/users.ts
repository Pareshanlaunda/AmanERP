"use server";

import { revalidateAfterUserCreated } from "@/lib/revalidate";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, adminResetPasswordSchema, type CreateUserInput, type AdminResetPasswordInput } from "@/lib/validations/users";
import type { Profile } from "@/lib/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createUser(data: CreateUserInput): Promise<ActionResult> {
  await requireUserWithRole(["admin"]);

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
    address: data.address.trim(),
    mobile: data.mobile.trim(),
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

/** Admin sets a new password for any user — no old password or email confirmation. */
export async function adminResetUserPassword(
  data: AdminResetPasswordInput
): Promise<ActionResult> {
  await requireUserWithRole(["admin"]);

  const parsed = adminResetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.user_id)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message };
  }
  if (!profile) {
    return { success: false, error: "User not found" };
  }

  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
