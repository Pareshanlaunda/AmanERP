"use server";

import { revalidateAfterEmployeeMembershipChange, revalidateAfterUserCreated } from "@/lib/revalidate";
import { requireUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllAuthUsers } from "@/lib/queries/auth-users";
import {
  createUserSchema,
  adminResetPasswordSchema,
  deactivateEmployeeSchema,
  reactivateEmployeeSchema,
  type CreateUserInput,
  type AdminResetPasswordInput,
  type DeactivateEmployeeInput,
  type ReactivateEmployeeInput,
} from "@/lib/validations/users";
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

import { CLOSED_LEAD_STATUSES } from "@/lib/leads/lead-status";

/** Soft-remove employee: deactivate profile, ban login, keep audit history. */
export async function deactivateEmployee(
  data: DeactivateEmployeeInput
): Promise<ActionResult> {
  const current = await requireUserWithRole(["admin"]);

  const parsed = deactivateEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const employeeId = parsed.data.employee_id;
  if (employeeId === current.id) {
    return { success: false, error: "You cannot remove your own account" };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active, full_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (profileError || !profile) {
    return { success: false, error: "Employee not found" };
  }
  if (profile.role !== "employee") {
    return { success: false, error: "Only employees can be removed from the team" };
  }
  if (profile.is_active === false) {
    return { success: false, error: "Employee is already removed" };
  }

  const { count: activePrimaryCount, error: activeLeadsError } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", employeeId)
    .not("status", "in", `(${CLOSED_LEAD_STATUSES.join(",")})`);

  if (activeLeadsError) {
    console.error("[users] deactivateEmployee active-leads check failed", activeLeadsError.message);
    return { success: false, error: "Unable to verify employee assignments" };
  }

  if ((activePrimaryCount ?? 0) > 0) {
    return {
      success: false,
      error: `Reassign ${activePrimaryCount} active lead${activePrimaryCount === 1 ? "" : "s"} first, then remove this employee.`,
    };
  }

  const { error: coAssigneeError } = await admin
    .from("lead_additional_assignees")
    .delete()
    .eq("employee_id", employeeId);

  if (coAssigneeError) {
    console.error("[users] deactivateEmployee co-assignee cleanup failed", coAssigneeError.message);
    return { success: false, error: "Unable to remove employee from co-assignments" };
  }

  const deactivatedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ is_active: false, deactivated_at: deactivatedAt })
    .eq("id", employeeId);

  if (updateError) {
    console.error("[users] deactivateEmployee profile update failed", updateError.message);
    return { success: false, error: "Unable to remove employee" };
  }

  const { error: banError } = await admin.auth.admin.updateUserById(employeeId, {
    ban_duration: "876000h",
  });

  if (banError) {
    console.error("[users] deactivateEmployee auth ban failed", banError.message);
    await admin
      .from("profiles")
      .update({ is_active: true, deactivated_at: null })
      .eq("id", employeeId);
    return { success: false, error: "Unable to revoke employee login" };
  }

  revalidateAfterEmployeeMembershipChange(employeeId);
  return { success: true };
}

/** Restore removed employee: reactivate profile and lift auth ban. */
export async function reactivateEmployee(
  data: ReactivateEmployeeInput
): Promise<ActionResult> {
  await requireUserWithRole(["admin"]);

  const parsed = reactivateEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data" };
  }

  const employeeId = parsed.data.employee_id;
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active, deactivated_at")
    .eq("id", employeeId)
    .maybeSingle();

  if (profileError || !profile) {
    return { success: false, error: "Employee not found" };
  }
  if (profile.role !== "employee") {
    return { success: false, error: "Only employees can be reactivated" };
  }
  if (profile.is_active !== false) {
    return { success: false, error: "Employee is already active" };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ is_active: true, deactivated_at: null })
    .eq("id", employeeId);

  if (updateError) {
    console.error("[users] reactivateEmployee profile update failed", updateError.message);
    return { success: false, error: "Unable to reactivate employee" };
  }

  const { error: unbanError } = await admin.auth.admin.updateUserById(employeeId, {
    ban_duration: "none",
  });

  if (unbanError) {
    console.error("[users] reactivateEmployee auth unban failed", unbanError.message);
    await admin
      .from("profiles")
      .update({ is_active: false, deactivated_at: profile.deactivated_at })
      .eq("id", employeeId);
    return { success: false, error: "Unable to restore employee login" };
  }

  revalidateAfterEmployeeMembershipChange(employeeId);
  return { success: true };
}
