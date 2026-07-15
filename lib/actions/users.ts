"use server";

import { revalidateAfterUserCreated } from "@/lib/revalidate";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/queries/auth-users";
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

  const email = data.email.trim().toLowerCase();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name.trim() },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { success: false, error: "Email already registered" };
    }
    return { success: false, error: "Unable to create user" };
  }

  // Insert via bound client params — never build SQL with user strings.
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
    return { success: false, error: "Unable to create user profile" };
  }

  revalidateAfterUserCreated();
  return { success: true };
}

export async function listUsers(): Promise<(Profile & { email?: string })[]> {
  await requireUserWithRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: profiles, error }, authUsers] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    listAllAuthUsers(),
  ]);

  if (error) {
    console.error("[users] listUsers failed", error.message);
    throw new Error("Unable to load users");
  }
  if (!profiles) throw new Error("Unable to load users");

  // Duplicate identity = same email only. Same full_name/role is allowed.
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));

  return profiles.map((p) => ({
    ...(p as Profile),
    email: emailMap.get(p.id),
  }));
}

export async function getUserRoleCounts() {
  await requireUserWithRole(["admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("role");
  if (error) {
    console.error("[users] getUserRoleCounts failed", error.message);
    throw new Error("Unable to load user counts");
  }
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

  if (profileError || !profile) {
    return { success: false, error: "User not found" };
  }

  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "Unable to reset password" };
  }

  return { success: true };
}
